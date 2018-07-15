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
   * lookup table definition for given table name
   *
   * @param name - The name of the table
   * @returns The table definition or undefined
   */

  public hasTable(name: string): Table|undefined {
    return this.mapNameToTable.get(name);
  }

  /**
   * get a table definition
   *
   * @param name - The name of the table
   * @returns The table definition
   */
  public getTable(name: string): Table {
    const table = this.mapNameToTable.get(name);
    if (!table) {
      throw new Error(`table '${name}' not registered yet`);
    }
    return table;
  }

  /**
   * add a table definition
   *
   * @param name - The name of the table
   * @param table - The table definition
   * @returns The table definition
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
   * @param sqldb - The db connection
   * @param name - The name of the table
   * @returns A promise
   */
  public async createTable(sqldb: SqlDatabase, name: string): Promise<void> {
    const table = this.getTable(name);
    return sqldb.exec(table.getCreateTableStatement());
  }

  /**
   * drop a table from the database
   *
   * @param sqldb - The db connection
   * @param name - The name of the table
   * @returns A promise
   */
  public async dropTable(sqldb: SqlDatabase, name: string): Promise<void> {
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
  public async alterTableAddColumn(sqldb: SqlDatabase, tableName: string, colName: string): Promise<void> {
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
  public async createIndex(sqldb: SqlDatabase, tableName: string, idxName: string, unique?: boolean): Promise<void> {
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
  public async dropIndex(sqldb: SqlDatabase, tableName: string, idxName: string): Promise<void> {
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
