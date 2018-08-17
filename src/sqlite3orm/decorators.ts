// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
// import * as core from './core';

import {MetaModel} from './MetaModel';
import {ValueTransformer} from './ValueTransformer';

export const METADATA_MODEL_KEY = 'sqlite3orm:model';

/**
 * Options for the '@table' class decorator
 *
 * @export
 * @interface TableOpts
 */

export interface TableOpts {
  /**
   * [name] - The name of the table
   */
  name?: string;

  /**
   * [withoutRowId] - Flag to indicate if table should be created using the 'WITHOUT ROWID'
   * clause
   */
  withoutRowId?: boolean;
  /**
   * [autoIncrement] - Flag to indicate if AUTOINCREMENT should be added to single-column INTEGER
   * primary keys
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
   * [name] - The name of the table field
   */
  name?: string;
  /**
   * [dbtype] - The column definition
   */
  dbtype?: string;
  /**
   * [isJson] - Flag to indicate if field should be persisted as json string
   */
  isJson?: boolean;

  /*
   * [dateInMilliSeconds] - If date is stored as integer use milliseconds instead of seconds
   */
  dateInMilliSeconds?: boolean;

  /**
   * [transform] - serialize/deserialize functions
   */
  transform?: ValueTransformer;
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
  const metaProp = metaModel.getOrAddProperty(key);
  metaProp.setPropertyType(Reflect.getMetadata('design:type', target, key));
  metaModel.setPropertyField(key, isIdentity, opts);
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
  metaModel.setPropertyForeignKey(key, constraintName, foreignTableName, foreignTableField);
}

/**
 * Helper function for decorating a property and map it to an index field
 *
 * @param target - The decorated class
 * @param key - The decorated property
 * @param indexName - The name for the index
 * @param [isUnique] - is a unique index
 * @param [desc] - descending order for this column
 * @returns The field class instance
 */
function decorateIndexProperty(
    target: Object|Function, key: string|symbol, indexName: string, isUnique?: boolean, desc?: boolean): void {
  if (typeof target === 'function') {
    // not decorating static property
    throw new Error(`decorating static property '${key.toString()}' using index-decorator is not supported`);
  }

  const metaModel = getModelMetadata(target.constructor);
  metaModel.setPropertyIndexKey(key, indexName, isUnique, desc);
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
 * @param [isUnique] - index is unique
 * @param [desc] - descending order for this column
 * @returns The decorator function
 */
export function index(indexName: string, isUnique?: boolean, desc?: boolean): (target: Object, key: string|symbol) =>
    void {
  return ((target: Object, key: string | symbol) => {
    decorateIndexProperty(target, key, indexName, isUnique, desc);
  });
}
