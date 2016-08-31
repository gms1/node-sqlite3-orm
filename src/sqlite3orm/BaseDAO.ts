import {METADATA_TABLE_KEY} from './decorators';
import {SqlDatabase} from './SqlDatabase';
import {Table, ForeignKey} from './Table';
import {Field, FieldReference} from './Field';


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
        if (!this.table.autoIncrementPropertyKey) {
          let res = await this.sqldb.run(
            this.table.getInsertIntoStatement(), this.bindAllInputParams(t));
        } else {
          let res = await this.sqldb.run(
            this.table.getInsertIntoStatement(), this.bindNonPrimaryKeyInputParams(t));
          (t as any)[this.table.autoIncrementPropertyKey] = res.lastID;
        }
      } catch (e) {
        reject(
            new Error(`insert into '${this.table.name}' failed: ${e.message}`));
        return;
      }
      resolve(t);
    });
  };
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
  };
  /**
   * delete
   *
   * @param {T} t
   * @returns {Promise<void>}
   */
  public delete (t: T): Promise<void> {
    return new Promise<boolean>(async(resolve, reject) => {
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
  };
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
  };
  /**
   * perform:
   * select T.<col1>,.. FROM <table> T
   *
   * @param {string} [sql] - An optional sql-text which will be added to the select-statement
   * @param {Object} [params] - An optional object with additional host parameter
   * @returns {Promise<Array<T>>}
   */
  public selectAll(sql?: string, params?: Object): Promise<Array<T>> {
    return new Promise<Array<T>>(async(resolve, reject) => {
      try {
        let stmt = this.table.getSelectAllStatement();
        if (!!sql) {
          stmt += sql;
        }
        let rows: any[] = await this.sqldb.all(stmt, params);
        let results = new Array<T>();
        rows.forEach((row) => {
          results.push(this.readResultRow(new this.type(), row));
        });
        resolve(results);
      } catch (e) {
        reject(new Error(`select '${this.table.name}' failed: ${e.message}`));
        return;
      }
    });
  };
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
  };

  /**
   *
   * @template F - The class mapped to the foreign table
   * @param {string} constraintName - The foreign key constraint
   * @param {{new (): F}} foreignType - The class mapped to the foreign table
   * @param {F} foreign - An instance of the class mapped to the foreign table
   * @param {string} [sql] - An optional sql-text which will be added to the select-statement
   * @param {Object} [params] - An optional object with additional host parameter
   * @returns {Promise<Array<T>>}
   */
  public selectAllOf<F extends Object>(
      constraintName: string, foreignType: {new (): F}, foreign: F, sql?: string,
      params?: Object): Promise<Array<T>> {
    return new Promise<Array<T>>(async(resolve, reject) => {
      try {
        if (!this.table.statementsText.foreignKeys.has(constraintName)) {
          throw new Error(`constraint '${constraintName}' is not defined`);
        }
        let fk = this.table.statementsText.foreignKeys.get(constraintName) as ForeignKey;
        let stmt = this.table.getSelectAllStatement();
        stmt += '\nWHERE\n  ';
        stmt += fk.selectCondition;

        let foreignDAO = new BaseDAO<F>(foreignType, this.sqldb);
        let foreignParams = this.bindForeignParams(foreignDAO, fk, foreign, params);
        if (!!sql) {
          stmt += sql;
        }
        let rows: any[] = await this.sqldb.all(stmt, foreignParams);
        let results = new Array<T>();
        rows.forEach((row) => {
          results.push(this.readResultRow(new this.type(), row));
        });
        resolve(results);
      } catch (e) {
        reject(new Error(`select '${this.table.name}' failed: ${e.message}`));
        return;
      }
    });
  };


  protected bindAllInputParams(t: T): Object {
    let res: Object = {};
    this.table.fields.forEach(
        (field) => (res as any)[field.hostParameterName] =
            (t as any)[field.propertyKey]);
    return res;
  }

  protected bindPrimaryKeyInputParams(t: T): Object {
    let res: Object = {};
    this.table.fields.forEach(
        (field) => {
            if (field.isIdentity) {
              (res as any)[field.hostParameterName] = (t as any)[field.propertyKey];
            }
          });
    return res;
  }

  protected bindNonPrimaryKeyInputParams(t: T): Object {
    let res: Object = {};
    this.table.fields.forEach(
        (field) => {
            if (!field.isIdentity) {
              (res as any)[field.hostParameterName] = (t as any)[field.propertyKey];
            }
          });
    return res;
  }


  protected bindForeignParams<F extends Object>(foreignDAO: BaseDAO<F>, fk: ForeignKey, foreignObject: F, more: Object = {}): Object {
    let res: Object = Object.assign({}, more);
    fk.fields.forEach(
        (field) => {
          let fieldref = field.foreignKeys.get(fk.name) as FieldReference;
          let foreignfield = foreignDAO.table.getTableField(fieldref.colName);
          (res as any)[field.hostParameterName] =
            (foreignObject as any)[foreignfield.propertyKey];
        });
    return res;
  }

  protected readResultRow(t: T, row: any): T {
    // TODO: ensure type safety
    this.table.fields.forEach(
        (field) => (t as any)[field.propertyKey] = (row as any)[field.name]);
    return t;
  }
}
