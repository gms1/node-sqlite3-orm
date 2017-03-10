import {METADATA_TABLE_KEY} from './decorators';
import {SqlDatabase} from './SqlDatabase';
import {Table} from './Table';
import {Field} from './Field';
import {FieldReference} from './FieldReference';
import {PropertyType} from './PropertyType';


/**
 *
 *
 * @export
 * @class BaseDAO
 * @template T - The class mapped to the base table
 */
export class BaseDAO<T extends Object> {
  private type: {new (): T};
  private table: Table;
  private sqldb: SqlDatabase;


  /**
   * Creates an instance of BaseDAO.
   *
   * @param {{new (): T}} type - The class mapped to the base table
   * @param {SqlDatabase} sqldb - The database connection
   */
  public constructor(type: {new (): T}, sqldb: SqlDatabase) {
    this.type = type;
    this.table = Reflect.getMetadata(METADATA_TABLE_KEY, type.prototype);
    if (!this.table) {
      throw new Error(`no table-definition defined on prototype of ${this.type.name}'`);
    }
    this.sqldb = sqldb;
  }

  /**
   * insert
   *
   * @param {T} t
   * @returns {Promise<T>}
   */
  public insert(t: T): Promise<T> {
    return new Promise<T>(async(resolve, reject) => {
      try {
        let res: any;
        if (!this.table.autoIncrementField) {
          res = await this.sqldb.run(
            this.table.getInsertIntoStatement(), this.bindAllInputParams(t));
        } else {
          res = await this.sqldb.run(
            this.table.getInsertIntoStatement(), this.bindNonPrimaryKeyInputParams(t));
          // tslint:disable-next-line: triple-equals
          if ( res.lastID == undefined) {
            reject(new Error("AUTOINCREMENT failed, 'lastID' is undefined or null"));
            return;
          }
          res[this.table.autoIncrementField.name] = res.lastID;
          this.setProperty(t, this.table.autoIncrementField, res);
        }
      } catch (e) {
        reject(
            new Error(`insert into '${this.table.name}' failed: ${e.message}`));
        return;
      }
      resolve(t);
    });
  }
  /**
   * update
   *
   * @param {T} t
   * @returns {Promise<T>}
   */
  public update(t: T): Promise<T> {
    return new Promise<T>(async(resolve, reject) => {
      try {
        let res = await this.sqldb.run(
            this.table.getUpdateSetStatement(), this.bindAllInputParams(t));
        if (!res.changes) {
          reject(
              new Error(`update '${this.table.name}' failed: nothing changed`));
          return;
        }
      } catch (e) {
        reject(new Error(`update '${this.table.name}' failed: ${e.message}`));
        return;
      }
      resolve(t);
    });
  }
  /**
   * delete
   *
   * @param {T} t
   * @returns {Promise<void>}
   */
  public delete (t: T): Promise<void> {
    return new Promise<void>(async(resolve, reject) => {
      try {
        let res = await this.sqldb.run(
            this.table.getDeleteFromStatement(), this.bindPrimaryKeyInputParams(t));
        if (!res.changes) {
          reject(new Error(
              `delete from '${this.table.name}' failed: nothing changed`));
          return;
        }
      } catch (e) {
        reject(
            new Error(`delete from '${this.table.name}' failed: ${e.message}`));
        return;
      }
      resolve();
    });
  }
  /**
   * select using primary key
   *
   * @param {T} t
   * @returns {Promise<T>}
   */
  public select(t: T): Promise<T> {
    return new Promise<T>(async(resolve, reject) => {
      try {
        let row = await this.sqldb.get(
            this.table.getSelectOneStatement(), this.bindPrimaryKeyInputParams(t));
        t = this.readResultRow(t, row);
      } catch (e) {
        reject(new Error(`select '${this.table.name}' failed: ${e.message}`));
        return;
      }
      resolve(t);
    });
  }
  /**
   * perform:
   * select T.<col1>,.. FROM <table> T
   *
   * @param {string} [sql] - An optional sql-text which will be added to the select-statement
   * @param {Object} [params] - An optional object with additional host parameter
   * @returns {Promise<T[]>}
   */
  public selectAll(sql?: string, params?: Object): Promise<T[]> {
    return new Promise<T[]>(async(resolve, reject) => {
      try {
        let stmt = this.table.getSelectAllStatement();
        if (!!sql) {
          stmt += sql;
        }
        let rows: any[] = await this.sqldb.all(stmt, params);
        let results: T[] = [];
        rows.forEach((row) => {
          results.push(this.readResultRow(new this.type(), row));
        });
        resolve(results);
      } catch (e) {
        reject(new Error(`select '${this.table.name}' failed: ${e.message}`));
        return;
      }
    });
  }
  /**
   * perform:
   * select T.<col1>,.. FROM <table> T
   *
   * @param {(err: Error, t: T) => void} callback - The callback called for each row
   * @param {string} [sql] - An optional sql-text which will be added to the select-statement
   * @param {Object} [params] - An optional object with additional host parameter
   * @returns {Promise<number>}
   */
  public selectEach(callback: (err: Error, t: T) => void, sql?: string,
      params?: Object): Promise<number> {
    return new Promise<number>(async(resolve, reject) => {
      try {
        let stmt = this.table.getSelectAllStatement();
        if (!!sql) {
          stmt += sql;
        }
        let res = await this.sqldb.each(stmt, params, (err, row) => {
          // TODO: err?
          callback(err, this.readResultRow(new this.type(), row));
        });
        resolve(res);
      } catch (e) {
        reject(new Error(`select '${this.table.name}' failed: ${e.message}`));
        return;
      }

    });
  }

  /**
   *
   * @template F - The class mapped to the foreign table
   * @param {string} constraintName - The foreign key constraint
   * @param {{new (): F}} foreignType - The class mapped to the foreign table
   * @param {F} foreignObj - An instance of the class mapped to the foreign table
   * @param {string} [sql] - An optional sql-text which will be added to the select-statement
   * @param {Object} [params] - An optional object with additional host parameter
   * @returns {Promise<T[]>}
   */
  public selectAllOf<F extends Object>(
      constraintName: string, foreignType: {new (): F}, foreignObj: F, sql?: string,
      params?: Object): Promise<T[]> {
    return new Promise<T[]>(async(resolve, reject) => {
      try {
        let fkSelCondition = this.table.getForeignKeySelects(constraintName);
        if (!fkSelCondition) {
          throw new Error(`constraint '${constraintName}' is not defined`);
        }
        let stmt = this.table.getSelectAllStatement();
        stmt += '\nWHERE\n  ';
        stmt += fkSelCondition;

        let foreignDAO = new BaseDAO<F>(foreignType, this.sqldb);
        let foreignParams = this.bindForeignParams(foreignDAO, constraintName, foreignObj, params);
        if (!!sql) {
          stmt += sql;
        }
        let rows: any[] = await this.sqldb.all(stmt, foreignParams);
        let results: T[] = [];
        rows.forEach((row) => {
          results.push(this.readResultRow(new this.type(), row));
        });
        resolve(results);
      } catch (e) {
        reject(new Error(`select '${this.table.name}' failed: ${e.message}`));
        return;
      }
    });
  }


  protected bindAllInputParams(t: T): Object {
    let hostParams: Object = {};
    this.table.fields.forEach((field) => this.setHostParam(hostParams, field, t) );
    return hostParams;
  }

  protected bindPrimaryKeyInputParams(t: T): Object {
    let hostParams: Object = {};
    this.table.fields.forEach(
        (field) => {
            if (field.isIdentity) {
              this.setHostParam(hostParams, field, t);
            }
          });
    return hostParams;
  }

  protected bindNonPrimaryKeyInputParams(t: T): Object {
    let hostParams: Object = {};
    this.table.fields.forEach(
        (field) => {
            if (!field.isIdentity) {
              this.setHostParam(hostParams, field, t);
            }
          });
    return hostParams;
  }


  protected bindForeignParams<F extends Object>(foreignDAO: BaseDAO<F>, fkName: string, foreignObject: F, more: Object = {}): Object {
    let hostParams: Object = Object.assign({}, more);
    let fkFields = this.table.getForeignKeyFields(fkName);
    if (!fkFields) {
      throw new Error(`internal error: fields for foreign key constraint '${fkName}' are not defined`);
    }

    fkFields.forEach(
        (field) => {
          let fieldref = field.foreignKeys.get(fkName) as FieldReference;
          let foreignfield = foreignDAO.table.getTableField(fieldref.colName);
          foreignDAO.setHostParam(hostParams, foreignfield, foreignObject);
        });
    return hostParams;
  }

  protected readResultRow(t: T, row: any): T {
    this.table.fields.forEach(
        (field) => this.setProperty(t, field, row)
    );
    return t;
  }


  protected setHostParam(hostParams: any, field: Field, t: T): void {
    let value = Reflect.get(t, field.propertyKey);
    // tslint:disable-next-line: triple-equals
    if (value == undefined) {
      (hostParams as any)[field.getHostParameterName()] = value;
      return;
    }
    if (field.isJson) {
      (hostParams as any)[field.getHostParameterName()] = JSON.stringify(value);
    } else {
      switch (field.propertyKnownType) {
        case PropertyType.BOOLEAN:
          value = !value ? 0 : 1;
          break;
        case PropertyType.DATE:
          if (field.dbtype.toUpperCase().indexOf('INT') !== -1) {
            value = Math.floor((value as Date).getTime() / 1000);
          } else {
            value = (value as Date).toISOString();
          }
          break;
      }
      (hostParams as any)[field.getHostParameterName()] = value;
    }
  }



  protected setProperty(t: T, field: Field, row: any): void {
    let value = row[field.name];
    // tslint:disable-next-line: triple-equals
    if (value == undefined) {
      Reflect.set(t, field.propertyKey, undefined);
      return;
    }
    if (field.isJson) {
      value = JSON.parse(value);
    } else {
      switch (field.propertyKnownType) {
        case PropertyType.BOOLEAN:
          if (typeof value === 'string') {
            if (value === '0' || value === 'false') {
              value = false;
            } else if ( value === '1' || value === 'true' ) {
              value = true;
            } else {
              value = undefined;
            }
          } else {
            value = !value ? false : true;
          }
          break;
        case PropertyType.DATE:
          switch (typeof value) {
            case 'string':
              value = new Date(Date.parse(value));
              break;
            case 'number':
              if (Number.isInteger(value)) {
                // unix time
                value = new Date((value as number) * 1000);
              } else {
                // Julian day numbers ?
                // TODO: currently not supported
                value = NaN;
              }
              break;
            default:
              value = NaN;
              break;
          }
          break;
        case PropertyType.NUMBER:
          if (typeof value !== 'number') {
            value = Number(value);
          }
          break;
        case PropertyType.STRING:
          if (typeof value !== 'string') {
            value = String(value);
          }
          break;
      }
    }
    // console.log(`setting ${field.propertyKey} to ${value}`);
    Reflect.set(t, field.propertyKey, value);
  }

  /**
   * create a table in the database
   *
   * @returns {Promise<void>}
   */
  public createTable(): Promise<void> {
    return this.sqldb.exec(this.table.getCreateTableStatement());
  }

  /**
   * drop a table from the database
   *
   * @returns {Promise<void>}
   */
  public dropTable(): Promise<void> {
    return this.sqldb.exec(this.table.getDropTableStatement());
  }

  /**
   * add a column/field to a database table
   *
   * @param {string} colName
   * @returns {Promise<void>}
   */
  public alterTableAddColumn(colName: string): Promise<void> {
    return this.sqldb.exec(this.table.getAlterTableAddColumnStatement(colName));
  }

  /**
   * create index in the database
   *
   * @param {string} idxName - The name of the index
   * @param {boolean} [unique] - create unique index
   * @returns {Promise<void>}
   */
  public createIndex(idxName: string, unique?: boolean): Promise<void> {
    return this.sqldb.exec(this.table.getCreateIndexStatement(idxName, unique));
  }

  /**
   * drop an index from the database
   *
   * @param {string} idxName - The name of the index
   * @returns {Promise<void>}
   */
  public dropIndex(idxName: string): Promise<void> {
    return this.sqldb.exec(this.table.getDropIndexStatement(idxName));
  }

}
