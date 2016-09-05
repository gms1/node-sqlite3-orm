import 'reflect-metadata';

import {Field, FieldReference} from './Field';
import {schema} from './Schema';
import {Table} from './Table';


export  const METADATA_TABLE_KEY = 'schema:table';

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
   * Flag to indicate if table should be created using the 'WITHOUT ROWID' clause
   * @type {boolean}
   */
  withoutRowId?: boolean;
  /**
   * Flag to indicate if AUTOINCREMENT should be added to single-column INTEGER primary keys
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
}

/**
 * Get table metadata
 *
 * @param {Function} target - The constructor of the class
 * @returns {Table}
 */
function getTableMetadata(target: Function): Table {
  if (!Reflect.hasOwnMetadata(METADATA_TABLE_KEY, target.prototype)) {
    Reflect.defineMetadata(
        METADATA_TABLE_KEY, new Table(target.name), target.prototype);
  }
  let table: Table = Reflect.getMetadata(METADATA_TABLE_KEY, target.prototype);
  return table;
}

function getFieldMetadata(table: Table, key: string|symbol): Field {
  let field: Field;
  if (table.hasPropertyField(key)) {
    field = table.getPropertyField(key);
  } else {
    field = new Field(key);
    table.addPropertyField(field);
  }
  return field;
}

/**
 * Helper function for decorating a class and map it to a database table
 *
 * @param {Function} target - The constructor of the class
 * @param {TableOpts} [opts]
 * @returns {Table}
 */
function decorateClass(target: Function, opts: TableOpts): void {
  let table = getTableMetadata(target);
  if (!!opts.name && !!table.name && name !== table.name) {
    throw new Error(
        `failed to map class '${target.name}' to table name '${opts.name}': This class is already mapped to the table '${table.name}'`);
  }
  table.name = opts.name || target.name;
  if (!!opts.withoutRowId) {
    table.withoutRowId = true;
  }
  if (!!opts.autoIncrement) {
    table.autoIncrement = true;
  }
  schema().addTable(table);
}


/**
 * Helper function for decorating a property and map it to a table field
 *
 * @param {Object} target - The decorated class
 * @param {(string|symbol)} key - The decorated property
 * @param {FieldOpts} [opts]
 * @param {boolean} [isIdentity=false] - Indicator if this field belongs to the primary key
 * @returns {Field}
 */
function decoratePropertyField(
    target: Object, key: string|symbol, opts: FieldOpts,
    isIdentity: boolean = false): Field {

  if (typeof target === 'function') {
    // not decorating static property
    throw new Error(`decorating static property '${key.toString()}' using field-decorator is not supported`);
  }

  let table: Table = getTableMetadata(target.constructor);
  let field: Field = getFieldMetadata(table, key);

  field.propertyType = Reflect.getMetadata('design:type', target, key);
  field.name = opts.name || key.toString();

  if (!!opts.dbtype) {
    field.dbtype = opts.dbtype;
  }
  if (!!isIdentity) {
    field.isIdentity = isIdentity;
  }
  // console.log(`name='${key.toString()}' type='${field.propertyType}' dbtype='${field.dbtype}'` );
  return field;
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
function decoratePropertyForeignKey(
    target: Object, key: string|symbol, constraintName: string, foreignTableName: string, foreignTableField: string): Field {

  if (typeof target === 'function') {
    // not decorating static property
    throw new Error(`decorating static property '${key.toString()}' using field-decorator is not supported`);
  }

  let table: Table = getTableMetadata(target.constructor);
  let field: Field = getFieldMetadata(table, key);
  if (field.hasForeignKeyConstraint(constraintName)) {
    throw new Error(`decorating property '${target.constructor.name}.${key.toString()}': duplicate foreign key constraint 'constraintName'`);
  }

  field.setForeignKeyField(constraintName, new FieldReference(foreignTableName, foreignTableField));
  return field;
}



/**
 * The class decorator for mapping a database table to a class
 *
 * @export
 * @param {TableOpts} [opts]
 * @returns {(target: Function) => void}
 */
export function table(opts: TableOpts = {}): (target: Function) => void {
  return ((target: Function) => decorateClass(target, opts));
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
    decoratePropertyField(target, key, opts, false);
  });
}

/**
 * The id decorator for mapping a class property to a field of the primary key of the table
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
    decoratePropertyField(target, key, opts, true);
  });
}


/**
 * The fk decorator for mapping a class property to be part of a foreign key constraint
 *
 * @export
 * @param {string} constraintName - The constraint name
 * @param {string} foreignTableName - The referenced table name
 * @param {string} foreignTableField - The referenced table field
 * @returns {((target: Object, key: string|symbol) =>
 *     void)}
 */
export function fk(
    constraintName: string, foreignTableName: string, foreignTableField: string): (target: Object, key: string|symbol) =>
    void {
  return ((target: Object, key: string | symbol) => {
    let field = decoratePropertyForeignKey(target, key, constraintName, foreignTableName, foreignTableField);
  });
}
