// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
// import * as core from './core';

import {MetaModel} from './MetaModel';

export const METADATA_MODEL_KEY = 'sqlite3orm:model';

/**
 * Options for the '@table' class decorator
 *
 * @export
 * @interface TableOpts
 */

export interface TableOpts {
  /**
   * The name of the table
   * @type
   */
  name?: string;

  /**
   * Flag to indicate if table should be created using the 'WITHOUT ROWID'
   * clause
   * @type
   */
  withoutRowId?: boolean;
  /**
   * Flag to indicate if AUTOINCREMENT should be added to single-column INTEGER
   * primary keys
   * @type
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
   * @type
   */
  name?: string;
  /**
   * The column definition
   * @type
   */
  dbtype?: string;
  /**
   * Flag to indicate if field should be persisted to json string
   * @type
   */
  isJson?: boolean;
}


/**
 * Get the model metadata
 *
 * @param target - The constructor of the class
 * @returns The meta model
 */
export function getModelMetadata(target: Function): MetaModel {
  if (!Reflect.hasOwnMetadata(METADATA_MODEL_KEY, target.prototype)) {
    Reflect.defineMetadata(METADATA_MODEL_KEY, new MetaModel(target.name), target.prototype);
  }
  return Reflect.getMetadata(METADATA_MODEL_KEY, target.prototype);
}


/**
 * Helper function for decorating a class and map it to a database table
 *
 * @param target - The constructor of the class
 * @param [opts] - The options for this table
 */
function decorateTableClass(target: Function, opts: TableOpts): void {
  const metaModel = getModelMetadata(target);
  metaModel.init(opts);
}

/**
 * Helper function for decorating a property and map it to a table field
 *
 * @param target - The decorated class
 * @param key - The decorated property
 * @param [opts] - The options for this field
 * @param [isIdentity=false] - Indicator if this field belongs to the
 * primary key
 * @returns The field class instance
 */
function decorateFieldProperty(
    target: Object|Function, key: string|symbol, opts: FieldOpts, isIdentity: boolean): void {
  if (typeof target === 'function') {
    // not decorating static property
    throw new Error(`decorating static property '${key.toString()}' using field-decorator is not supported`);
  }

  const metaModel = getModelMetadata(target.constructor);
  const metaProp = metaModel.getPropertyAlways(key);
  metaProp.setPropertyType(Reflect.getMetadata('design:type', target, key));
  metaProp.setFieldProperties(opts.name || key.toString(), isIdentity, opts);
}


/**
 * Helper function for decorating a property and map it to a foreign key field
 *
 * @param target - The decorated class
 * @param key - The decorated property
 * @param constraintName - The name for the foreign key constraint
 * @param foreignTableName - The referenced table name
 * @param foreignTableField - The referenced table field
 * @returns - The field class instance
 */
function decorateForeignKeyProperty(
    target: Object|Function, key: string|symbol, constraintName: string, foreignTableName: string,
    foreignTableField: string): void {
  if (typeof target === 'function') {
    // not decorating static property
    throw new Error(`decorating static property '${key.toString()}' using fk-decorator is not supported`);
  }

  const metaModel = getModelMetadata(target.constructor);
  const metaProp = metaModel.getPropertyAlways(key);
  metaProp.addForeignKeyProperties(constraintName, foreignTableName, foreignTableField);
}

/**
 * Helper function for decorating a property and map it to an index field
 *
 * @param target - The decorated class
 * @param key - The decorated property
 * @param indexName - The name for the index
 * @returns The field class instance
 */
function decorateIndexProperty(
    target: Object|Function, key: string|symbol, indexName: string, isUnique?: boolean): void {
  if (typeof target === 'function') {
    // not decorating static property
    throw new Error(`decorating static property '${key.toString()}' using index-decorator is not supported`);
  }

  const metaModel = getModelMetadata(target.constructor);
  const metaProp = metaModel.getPropertyAlways(key);
  metaProp.addIndex(indexName, isUnique);
}

/*****************************************************************************************/
/* decorators:

/**
 * The class decorator for mapping a database table to a class
 *
 * @export
 * @param [opts]
 * @returns The decorator function
 */
export function table(opts: TableOpts = {}): (target: Function) => void {
  return ((target: Function) => decorateTableClass(target, opts));
}

/**
 * The property decorator for mapping a table field to a class property
 *
 * @export
 * @param [name] - The name of the field; defaults to the property name
 * @param [dbtype] - The type of the field; defaults to 'TEXT'
 * @returns The decorator function
 */
export function field(opts: FieldOpts = {}): (target: Object, key: string|symbol) => void {
  return ((target: Object, key: string | symbol) => {
    decorateFieldProperty(target, key, opts, false);
  });
}

/**
 * The id decorator for mapping a field of the primary key to a class property
 *
 * @export
 * @param [name] - The name of the field; defaults to the property name
 * @param [dbtype] - The type of the field; defaults to 'TEXT'
 * @returns The decorator function
 */
export function id(opts: FieldOpts = {}): (target: Object, key: string|symbol) => void {
  return ((target: Object, key: string | symbol) => {
    decorateFieldProperty(target, key, opts, true);
  });
}

/**
 * The fk decorator for mapping a class property to be part of a foreign key
 * constraint
 *
 * @export
 * @param constraintName - The constraint name
 * @param foreignTableName - The referenced table name
 * @param foreignTableField - The referenced table field
 * @returns The decorator function
 */
export function fk(constraintName: string, foreignTableName: string, foreignTableField: string): (
    target: Object, key: string|symbol) => void {
  return ((target: Object, key: string | symbol) => {
    decorateForeignKeyProperty(target, key, constraintName, foreignTableName, foreignTableField);
  });
}

/**
 * The index decorator for mapping a class property to be part of an index
 *
 * @export
 * @param indexName - The index name
 * @returns The decorator function
 */
export function index(indexName: string, isUnique: boolean = false): (target: Object, key: string|symbol) => void {
  return ((target: Object, key: string | symbol) => {
    decorateIndexProperty(target, key, indexName);
  });
}
