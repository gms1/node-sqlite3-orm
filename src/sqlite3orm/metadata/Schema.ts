// import * as core from './core';

import {SqlDatabase} from '../core';
import {qualifiyIdentifier} from '../utils';

import {TableOpts} from './decorators';
import {Table} from './Table';

/**
 * A singleton holding the database schema definitions
 *
 * @export
 * @class Schema
 */
export class Schema {
  /**
   * The one and only Schema instance
   *
   * @static
   */
  public static schema: Schema;

  private readonly mapNameToTable!: Map<string, Table>;


  private _dateInMilliSeconds?: boolean;
  get dateInMilliSeconds(): boolean {
    // tslint:disable-next-line triple-equals
    return (this._dateInMilliSeconds == undefined) ? false : this._dateInMilliSeconds;
  }
  set dateInMilliSeconds(val: boolean) {
    this._dateInMilliSeconds = val;
  }

  /**
   * Creates an instance of Schema.
   *
   */
  public constructor() {
    if (!Schema.schema) {
      // initialize the 'singleton'
      Schema.schema = this;

      this.mapNameToTable = new Map<string, Table>();
    }
    return Schema.schema;
  }

  /**
   * lookup table definition for given table name
   *
   * @param name - The name of the table
   * @returns The table definition or undefined
   */

  public hasTable(name: string): Table|undefined {
    return this.mapNameToTable.get(qualifiyIdentifier(name));
  }

  /**
   * get a table definition
   *
   * @param name - The name of the table
   * @returns The table definition
   */
  public getTable(name: string): Table {
    const table = this.mapNameToTable.get(qualifiyIdentifier(name));
    if (!table) {
      throw new Error(`table '${name}' not registered yet`);
    }
    return table;
  }

  /**
   * add a table definition
   *
   * @param table - The table definition
   * @returns The table definition
   */
  public getOrAddTable(name: string, opts: TableOpts): Table {
    const qname = qualifiyIdentifier(name);
    let table = this.mapNameToTable.get(qname);

    if (!table) {
      table = new Table(name);
      this.mapNameToTable.set(qname, table);

      // tslint:disable-next-line triple-equals
      if (opts.withoutRowId != undefined) {
        table.withoutRowId = opts.withoutRowId;
      }
      // tslint:disable-next-line triple-equals
      if (opts.autoIncrement != undefined) {
        table.autoIncrement = opts.autoIncrement;
      }
    } else {
      // tslint:disable-next-line triple-equals
      if (opts.withoutRowId != undefined) {
        // tslint:disable-next-line triple-equals
        if (table.isWithoutRowIdDefined && opts.withoutRowId != table.withoutRowId) {
          throw new Error(`conflicting withoutRowId settings: new: ${opts.withoutRowId}, old ${table.withoutRowId}`);
        }
        table.withoutRowId = opts.withoutRowId;
      }
      // tslint:disable-next-line triple-equals
      if (opts.autoIncrement != undefined) {
        // tslint:disable-next-line triple-equals
        if (table.isAutoIncrementDefined && opts.autoIncrement != table.autoIncrement) {
          throw new Error(`conflicting autoIncrement settings: new: ${opts.autoIncrement}, old ${table.autoIncrement}`);
        }
        table.autoIncrement = opts.autoIncrement;
      }
    }

    return table;
  }


  /**
   * delete a table definition
   *
   * @param table - The table definition
   */
  public deleteTable(name: string): void {
    this.mapNameToTable.delete(qualifiyIdentifier(name));
  }

  /**
   * get array of table definitions
   *
   * @returns The table definitions
   */
  public getAllTables(): Table[] {
    return Array.from(this.mapNameToTable.values());
  }

  /**
   * create a table in the database
   *
   * @param sqldb - The db connection
   * @param name - The name of the table
   * @returns A promise
   */
  public createTable(sqldb: SqlDatabase, name: string, force?: boolean): Promise<void> {
    const table = this.getTable(name);
    return sqldb.exec(table.getCreateTableStatement(force));
  }

  /**
   * drop a table from the database
   *
   * @param sqldb - The db connection
   * @param name - The name of the table
   * @returns A promise
   */
  public dropTable(sqldb: SqlDatabase, name: string): Promise<void> {
    const table = this.getTable(name);
    return sqldb.exec(table.getDropTableStatement());
  }

  /**
   * add a column/field to a database table
   *
   * @param sqldb - The db connection
   * @param tableName - The name of the table
   * @param colName - The name of the column
   * @returns A promise
   */
  public alterTableAddColumn(sqldb: SqlDatabase, tableName: string, colName: string): Promise<void> {
    const table = this.getTable(tableName);
    return sqldb.exec(table.getAlterTableAddColumnStatement(colName));
  }

  /**
   * create an index in the database
   *
   * @param sqldb - The db connection
   * @param tableName - The name of the table
   * @param idxName - The name of the index
   * @param [unique] - create unique index
   * @returns A promise
   */
  public createIndex(sqldb: SqlDatabase, tableName: string, idxName: string, unique?: boolean): Promise<void> {
    const table = this.getTable(tableName);
    return sqldb.exec(table.getCreateIndexStatement(idxName, unique));
  }

  /**
   * drop a table from the database
   *
   * @param sqldb - The db connection
   * @param tableName - The name of the table
   * @param idxName - The name of the index
   * @returns A promise
   */
  public dropIndex(sqldb: SqlDatabase, tableName: string, idxName: string): Promise<void> {
    const table = this.getTable(tableName);
    return sqldb.exec(table.getDropIndexStatement(idxName));
  }
}

/**
 * get the Schema singleton
 *
 * @export
 * @returns {Schema}
 */
export function schema(): Schema {
  if (!Schema.schema) {
    // tslint:disable-next-line: no-unused-expression
    new Schema();
  }
  return Schema.schema;
}
