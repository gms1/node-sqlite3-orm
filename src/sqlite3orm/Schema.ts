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

  private mapNameToTable: Map<string, Table>;

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
  public createTable(sqldb: SqlDatabase, name: string): Promise<void> {
    return sqldb.exec(this.getTable(name).getCreateTableStatement());
  }

  /**
   * drop a table from the database
   *
   * @param {SqlDatabase} sqldb
   * @param {string} name - The name of the table
   * @returns {Promise<void>}
   */
  public dropTable(sqldb: SqlDatabase, name: string): Promise<void> {
    return sqldb.exec(this.getTable(name).getDropTableStatement());
  }

  /**
   * add a column/field to a database table
   *
   * @param {SqlDatabase} sqldb
   * @param {string} tableName
   * @param {string} colName
   * @returns {Promise<void>}
   */
  public alterTableAddColumn(sqldb: SqlDatabase, tableName: string, colName: string): Promise<void> {
    return sqldb.exec(this.getTable(tableName).getAlterTableAddColumnStatement(colName));
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
    let schema = new Schema();
  }
  return Schema.schema;
}
