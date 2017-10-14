// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';

import {Field} from './Field';
import {FieldReference} from './FieldReference';
import {schema} from './Schema';
import {Table} from './Table';

export const METADATA_TABLE_KEY = 'schema:table';

/**
 * Options for the '@table' class decorator
 *
 * @export
 * @interface TableOpts
 */
export interface TableOpts {
  /**
   * The name of the table
   * @type {string}
   */
  name?: string;
  /**
   * Flag to indicate if table should be created using the 'WITHOUT ROWID'
   * clause
   * @type {boolean}
   */
  withoutRowId?: boolean;
  /**
   * Flag to indicate if AUTOINCREMENT should be added to single-column INTEGER
   * primary keys
   * @type {boolean}
   */
  autoIncrement?: boolean;
}

/**
 * Options for the property decorators '@field' and '@id'
 *
 * @export
 * @interface FieldOpts
 */
export interface FieldOpts {
  /**
   * The name of the table field
   * @type {string}
   */
  name?: string;
  /**
   * The column definition
   * @type {string}
   */
  dbtype?: string;
  /**
   * Flag to indicate if field should be persisted to json string
   * @type {boolean}
   */
  isJson?: boolean;
}

/**
 * Get the table metadata
 *
 * @param {Function} target - The constructor of the class
 * @returns {Table}
 */
function getTableMetadata(target: Function): Table {
  if (!Reflect.hasOwnMetadata(METADATA_TABLE_KEY, target.prototype)) {
    Reflect.defineMetadata(
        METADATA_TABLE_KEY, new Table(target.name), target.prototype);
  }
  return Reflect.getMetadata(METADATA_TABLE_KEY, target.prototype);
}

/**
 * Get the field metadata
 *
 * @param {Table} table - The table of this field
 * @param {(string | symbol)} key - The property key
 * @returns {Field}
 */
function getFieldMetadata(metaTable: Table, key: string|symbol): Field {
  let metaField: Field;
  if (metaTable.hasPropertyField(key)) {
    metaField = metaTable.getPropertyField(key);
  } else {
    metaField = new Field(key);
    metaTable.addPropertyField(metaField);
  }
  return metaField;
}

/**
 * Helper function for decorating a class and map it to a database table
 *
 * @param {Function} target - The constructor of the class
 * @param {TableOpts} [opts]
 * @returns {Table}
 */
function decorateTableClass(target: Function, opts: TableOpts): void {
  let metaTable = getTableMetadata(target);
  if (!!opts.name && !!metaTable.name && name !== metaTable.name) {
    throw new Error(
        `failed to map class '${target.name}' to table name '${opts.name}': This class is already mapped to the table '${metaTable.name}'`);
  }
  metaTable.name = opts.name || target.name;
  if (!!opts.withoutRowId) {
    metaTable.withoutRowId = true;
  }
  if (!!opts.autoIncrement) {
    metaTable.autoIncrement = true;
  }
  schema().addTable(metaTable);
}

/**
 * Helper function for decorating a property and map it to a table field
 *
 * @param {Object} target - The decorated class
 * @param {(string|symbol)} key - The decorated property
 * @param {FieldOpts} [opts]
 * @param {boolean} [isIdentity=false] - Indicator if this field belongs to the
 * primary key
 * @returns {Field}
 */
function decorateFieldProperty(
    target: Object|Function, key: string|symbol, opts: FieldOpts,
    isIdentity: boolean = false): Field {
  if (typeof target === 'function') {
    // not decorating static property
    throw new Error(
        `decorating static property '${key.toString()}' using field-decorator is not supported`);
  }

  let metaTable: Table = getTableMetadata(target.constructor);
  let metaField: Field = getFieldMetadata(metaTable, key);

  metaField.propertyType = Reflect.getMetadata('design:type', target, key);
  metaField.name = opts.name || key.toString();

  if (!!opts.dbtype) {
    metaField.dbtype = opts.dbtype;
  }
  if (!!opts.isJson) {
    metaField.isJson = opts.isJson;
  }
  if (!!isIdentity) {
    metaField.isIdentity = isIdentity;
  }
  // console.log(`name='${key.toString()}' type='${field.propertyType}'
  // dbtype='${field.dbtype}'` );
  return metaField;
}

/**
 * Helper function for decorating a property and map it to a foreign key field
 *
 * @param {Object} target - The decorated class
 * @param {(string|symbol)} key - The decorated property
 * @param {string} constraintName - The name for the foreign key constraint
 * @param {string} foreignTableName - The referenced table name
 * @param {string} foreignTableField - The referenced table field
 * @returns {Field}
 */
function decorateForeignKeyProperty(
    target: Object|Function, key: string|symbol, constraintName: string,
    foreignTableName: string, foreignTableField: string): Field {
  if (typeof target === 'function') {
    // not decorating static property
    throw new Error(
        `decorating static property '${key.toString()}' using field-decorator is not supported`);
  }

  let metaTable: Table = getTableMetadata(target.constructor);
  let metaField: Field = getFieldMetadata(metaTable, key);
  if (metaField.hasForeignKeyField(constraintName)) {
    throw new Error(
        `decorating property '${target.constructor.name}.${key.toString()}': duplicate foreign key constraint '${constraintName}'`);
  }

  metaField.setForeignKeyField(
      constraintName, new FieldReference(foreignTableName, foreignTableField));
  return metaField;
}

/**
 * Helper function for decorating a property and map it to an index field
 *
 * @param {Object} target - The decorated class
 * @param {(string|symbol)} key - The decorated property
 * @param {string} indexName - The name for the index
 * @returns {Field}
 */
function decorateIndexProperty(
    target: Object|Function, key: string|symbol, indexName: string): Field {
  if (typeof target === 'function') {
    // not decorating static property
    throw new Error(
        `decorating static property '${key.toString()}' using field-decorator is not supported`);
  }

  let metaTable: Table = getTableMetadata(target.constructor);
  let metaField: Field = getFieldMetadata(metaTable, key);
  if (metaField.isIndexField(indexName)) {
    throw new Error(
        `decorating property '${target.constructor.name}.${key.toString()}': duplicate index key '${indexName}'`);
  }

  metaField.setIndexField(indexName);
  return metaField;
}

/**
 * The class decorator for mapping a database table to a class
 *
 * @export
 * @param {TableOpts} [opts]
 * @returns {(target: Function) => void}
 */
export function table(opts: TableOpts = {}): (target: Function) => void {
  return ((target: Function) => decorateTableClass(target, opts));
}

/**
 * The field decorator for mapping a class property to a table field
 *
 * @export
 * @param {string} [name] - The name of the field; defaults to the property name
 * @param {string} [dbtype] - The type of the field; defaults to 'TEXT'
 * @returns {((
 *     target: Object, key: string|symbol) => void)}
 */
export function field(opts: FieldOpts = {}): (
    target: Object, key: string|symbol) => void {
  return ((target: Object, key: string | symbol) => {
    decorateFieldProperty(target, key, opts, false);
  });
}

/**
 * The id decorator for mapping a class property to a field of the primary key
 * of the table
 *
 * @export
 * @param {string} [name] - The name of the field; defaults to the property name
 * @param {string} [dbtype] - The type of the field; defaults to 'TEXT'
 * @returns {((
 *     target: Object, key: string|symbol) => void)}
 */
export function id(opts: FieldOpts = {}): (
    target: Object, key: string|symbol) => void {
  return ((target: Object, key: string | symbol) => {
    decorateFieldProperty(target, key, opts, true);
  });
}

/**
 * The fk decorator for mapping a class property to be part of a foreign key
 * constraint
 *
 * @export
 * @param {string} constraintName - The constraint name
 * @param {string} foreignTableName - The referenced table name
 * @param {string} foreignTableField - The referenced table field
 * @returns {((target: Object, key: string|symbol) =>
 *     void)}
 */
export function fk(
    constraintName: string, foreignTableName: string,
    foreignTableField: string): (target: Object, key: string|symbol) => void {
  return ((target: Object, key: string | symbol) => {
    decorateForeignKeyProperty(
        target, key, constraintName, foreignTableName, foreignTableField);
  });
}

/**
 * The index decorator for mapping a class property to be part of an index
 *
 * @export
 * @param {string} indexName - The index name
 * @returns {((target: Object, key: string|symbol) =>
 *     void)}
 */
export function index(indexName: string): (
    target: Object, key: string|symbol) => void {
  return ((target: Object, key: string | symbol) => {
    decorateIndexProperty(target, key, indexName);
  });
}
