import {Table} from './Table';
import {SqlDatabase} from './SqlDatabase';

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
   * @type {Schema}
   */
  public static schema: Schema;

  private mapNameToTable!: Map<string, Table>;

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
   * get a table definition
   *
   * @param {string} name - The name of the table
   * @returns {Table}
   */
  public getTable(name: string): Table {
    if (!this.mapNameToTable.has(name)) {
      throw new Error(`table '${name}' not registered yet`);
    }
    return this.mapNameToTable.get(name) as Table;
  }

  /**
   * add a table definition
   *
   * @param {string} name - The name of the table
   * @param {Table} table
   * @returns {Table}
   */
  public addTable(table: Table): Table {
    if (this.mapNameToTable.has(table.name)) {
      throw new Error(`table '${table.name}' already registered`);
    }
    this.mapNameToTable.set(table.name, table);
    table.fields.forEach((field) => table.addTableField(field));
    return table;
  }

  /**
   * create a table in the database
   *
   * @param {SqlDatabase} sqldb
   * @param {string} name - The name of the table
   * @returns {Promise<void>}
   */
  public async createTable(sqldb: SqlDatabase, name: string): Promise<void> {
    let table = this.getTable(name);
    return sqldb.exec(table.getCreateTableStatement());
  }

  /**
   * drop a table from the database
   *
   * @param {SqlDatabase} sqldb
   * @param {string} name - The name of the table
   * @returns {Promise<void>}
   */
  public async dropTable(sqldb: SqlDatabase, name: string): Promise<void> {
    let table = this.getTable(name);
    return sqldb.exec(table.getDropTableStatement());
  }

  /**
   * add a column/field to a database table
   *
   * @param {SqlDatabase} sqldb
   * @param {string} tableName
   * @param {string} colName
   * @returns {Promise<void>}
   */
  public async alterTableAddColumn(sqldb: SqlDatabase, tableName: string, colName: string): Promise<void> {
    let table = this.getTable(tableName);
    return sqldb.exec(table.getAlterTableAddColumnStatement(colName));
  }

  /**
   * create an index in the database
   *
   * @param {SqlDatabase} sqldb
   * @param {string} tableName - The name of the table
   * @param {string} idxName - The name of the index
   * @param {boolean} [unique] - create unique index
   * @returns {Promise<void>}
   */
  public async createIndex(sqldb: SqlDatabase, tableName: string, idxName: string, unique?: boolean): Promise<void> {
    let table = this.getTable(tableName);
    return sqldb.exec(table.getCreateIndexStatement(idxName, unique));
  }

  /**
   * drop a table from the database
   *
   * @param {SqlDatabase} sqldb
   * @param {string} tableName - The name of the table
   * @param {string} idxName - The name of the index
   * @returns {Promise<void>}
   */
  public async dropIndex(sqldb: SqlDatabase, tableName: string, idxName: string): Promise<void> {
    let table = this.getTable(tableName);
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
