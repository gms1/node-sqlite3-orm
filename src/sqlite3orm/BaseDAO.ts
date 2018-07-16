import {METADATA_MODEL_KEY} from './decorators';
import {SqlDatabase} from './SqlDatabase';
import {Table} from './Table';
import {Field} from './Field';
import {FieldReference} from './FieldReference';
import {PropertyType} from './PropertyType';
import {MetaModel} from './MetaModel';

/**
 *
 *
 * @export
 * @class BaseDAO
 * @template T - The class mapped to the base table
 */
export class BaseDAO<T extends Object> {
  private type: {new(): T};
  private table: Table;
  private sqldb: SqlDatabase;

  /**
   * Creates an instance of BaseDAO.
   *
   * @param type - The class mapped to the base table
   * @param sqldb - The database connection
   */
  public constructor(type: {new(): T}, sqldb: SqlDatabase) {
    this.type = type;
    const metaModel = Reflect.getMetadata(METADATA_MODEL_KEY, type.prototype);
    if (!metaModel) {
      throw new Error(`no table-definition defined on prototype of ${this.type.name}'`);
    }
    this.table = metaModel.table;
    this.sqldb = sqldb;
  }

  /**
   * insert
   *
   * @param model - A model class instance
   * @returns A promise of the inserted model class instance
   */
  public async insert(model: T): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      try {
        if (!this.table.autoIncrementField) {
          await this.sqldb.run(this.table.getInsertIntoStatement(), this.bindAllInputParams(model));
        } else {
          const res: any =
              await this.sqldb.run(this.table.getInsertIntoStatement(), this.bindNonPrimaryKeyInputParams(model));
          /* istanbul ignore if */
          // tslint:disable-next-line: triple-equals
          if (res.lastID == undefined) {
            // NOTE: should not happen
            reject(new Error('AUTOINCREMENT failed, \'lastID\' is undefined or null'));
            return;
          }
          res[this.table.autoIncrementField.name] = res.lastID;
          this.setProperty(model, this.table.autoIncrementField, res);
        }
      } catch (e) {
        reject(new Error(`insert into '${this.table.name}' failed: ${e.message}`));
        return;
      }
      resolve(model);
    });
  }

  /**
   * update
   *
   * @param model - A model class instance
   * @returns A promise of the updated model class instance
   */
  public async update(model: T): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      try {
        const res = await this.sqldb.run(this.table.getUpdateByIdStatement(), this.bindAllInputParams(model));
        if (!res.changes) {
          reject(new Error(`update '${this.table.name}' failed: nothing changed`));
          return;
        }
      } catch (e) {
        reject(new Error(`update '${this.table.name}' failed: ${e.message}`));
        return;
      }
      resolve(model);
    });
  }

  /**
   * delete using primary key
   *
   * @param model - A model class instance
   * @returns A promise
   */
  public async delete(model: T): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const res = await this.sqldb.run(this.table.getDeleteByIdStatement(), this.bindPrimaryKeyInputParams(model));
        if (!res.changes) {
          reject(new Error(`delete from '${this.table.name}' failed: nothing changed`));
          return;
        }
      } catch (e) {
        // NOTE: should not happen
        /* istanbul ignore next */
        reject(new Error(`delete from '${this.table.name}' failed: ${e.message}`));
        /* istanbul ignore next */
        return;
      }
      resolve();
    });
  }

  /**
   * delete using primary key
   *
   * @param input - A partial model class instance
   * @returns A promise
   */
  public async deleteById(input: Partial<T>): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const res =
            await this.sqldb.run(this.table.getDeleteByIdStatement(), this.bindPrimaryKeyInputParams(input as T));
        if (!res.changes) {
          reject(new Error(`delete from '${this.table.name}' failed: nothing changed`));
          return;
        }
      } catch (e) {
        // NOTE: should not happen
        /* istanbul ignore next */
        reject(new Error(`delete from '${this.table.name}' failed: ${e.message}`));
        /* istanbul ignore next */
        return;
      }
      resolve();
    });
  }

  /**
   * select using primary key
   *
   * @param model - A model class instance
   * @returns A promise of model class instance
   */
  public async select(model: T): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      try {
        const row = await this.sqldb.get(this.table.getSelectByIdStatement(), this.bindPrimaryKeyInputParams(model));
        model = this.readResultRow(model, row);
      } catch (e) {
        reject(new Error(`select '${this.table.name}' failed: ${e.message}`));
        return;
      }
      resolve(model);
    });
  }


  /**
   * select using primary key
   *
   * @param input - A partial model class instance
   * @returns A promise of model class instance
   */
  public async selectById(input: Partial<T>): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      let output: T;
      try {
        const row =
            await this.sqldb.get(this.table.getSelectByIdStatement(), this.bindPrimaryKeyInputParams(input as T));
        output = this.readResultRow(new this.type(), row);
      } catch (e) {
        reject(new Error(`select '${this.table.name}' failed: ${e.message}`));
        return;
      }
      resolve(output);
    });
  }

  /**
   * perform:
   * select T.<col1>,.. FROM <table> T
   *
   * @param [sql] - An optional sql-text which will be added to the select-statement
   * @param [params] - An optional object with additional host parameter
   * @returns A promise of array of class instances
   */
  public async selectAll(sql?: string, params?: Object): Promise<T[]> {
    return new Promise<T[]>(async (resolve, reject) => {
      try {
        let stmt = this.table.getSelectAllStatement();
        if (!!sql) {
          stmt += sql;
        }
        const rows: any[] = await this.sqldb.all(stmt, params);
        const results: T[] = [];
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
   * @param callback - The callback called for each row
   * @param [sql] - An optional sql-text which will be added to the select-statement
   * @param [params] - An optional object with additional host parameter
   * @returns A promise
   */
  public async selectEach(callback: (err: Error, model: T) => void, sql?: string, params?: Object): Promise<number> {
    return new Promise<number>(async (resolve, reject) => {
      try {
        let stmt = this.table.getSelectAllStatement();
        if (!!sql) {
          stmt += sql;
        }
        const res = await this.sqldb.each(stmt, params, (err, row) => {
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
   * @param constraintName - The foreign key constraint
   * @param foreignType - The class mapped to the foreign table
   * @param foreignObj - An instance of the class mapped to the foreign table
   * @param [sql] - An optional sql-text which will be added to the select-statement
   * @param [params] - An optional object with additional host parameter
   * @returns A promise of array of model class instances
   */
  public async selectAllOf<F extends Object>(
      constraintName: string, foreignType: {new(): F}, foreignObj: F, sql?: string, params?: Object): Promise<T[]> {
    return new Promise<T[]>(async (resolve, reject) => {
      try {
        const fkSelCondition = this.table.getForeignKeySelects(constraintName);
        if (!fkSelCondition) {
          throw new Error(`constraint '${constraintName}' is not defined`);
        }
        let stmt = this.table.getSelectAllStatement();
        stmt += '\nWHERE\n  ';
        stmt += fkSelCondition;

        const foreignDAO = new BaseDAO<F>(foreignType, this.sqldb);
        const foreignParams = this.bindForeignParams(foreignDAO, constraintName, foreignObj, params);
        if (!!sql) {
          stmt += sql;
        }
        const rows: any[] = await this.sqldb.all(stmt, foreignParams);
        const results: T[] = [];
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

  protected bindAllInputParams(model: T): Object {
    const hostParams: Object = {};
    this.table.fields.forEach((field) => this.setHostParam(hostParams, field, model));
    return hostParams;
  }

  protected bindPrimaryKeyInputParams(model: T): Object {
    const hostParams: Object = {};
    this.table.fields.forEach((field) => {
      if (field.isIdentity) {
        this.setHostParam(hostParams, field, model);
      }
    });
    return hostParams;
  }

  protected bindNonPrimaryKeyInputParams(model: T): Object {
    const hostParams: Object = {};
    this.table.fields.forEach((field) => {
      if (!field.isIdentity) {
        this.setHostParam(hostParams, field, model);
      }
    });
    return hostParams;
  }

  protected bindForeignParams<F extends Object>(
      foreignDAO: BaseDAO<F>, fkName: string, foreignObject: F, more: Object = {}): Object {
    const hostParams: Object = Object.assign({}, more);
    const fkFields = this.table.getForeignKeyFields(fkName);
    // istanbul ignore if */
    if (!fkFields) {
      // NOTE: should not happen
      throw new Error(`internal error: fields for foreign key constraint '${fkName}' are not defined`);
    }

    fkFields.forEach((field) => {
      const fieldref = field.foreignKeys.get(fkName) as FieldReference;
      const foreignfield = foreignDAO.table.getTableField(fieldref.colName);
      foreignDAO.setHostParam(hostParams, foreignfield, foreignObject);
    });
    return hostParams;
  }

  protected readResultRow(model: T, row: any): T {
    this.table.fields.forEach((field) => this.setProperty(model, field, row));
    return model;
  }

  protected setHostParam(hostParams: any, field: Field, model: T): void {
    let value = Reflect.get(model, field.propertyKey);
    // tslint:disable-next-line: triple-equals
    if (value == undefined) {
      hostParams[field.getHostParameterName()] = value;
      return;
    }
    if (field.isJson) {
      hostParams[field.getHostParameterName()] = JSON.stringify(value);
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
      hostParams[field.getHostParameterName()] = value;
    }
  }

  protected setProperty(model: T, field: Field, row: any): void {
    let value = row[field.name];
    // tslint:disable-next-line: triple-equals
    if (value == undefined) {
      Reflect.set(model, field.propertyKey, undefined);
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
            } else if (value === '1' || value === 'true') {
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
            /* istanbul ignore next */
            default:
              // NOTE: should not happen
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
    Reflect.set(model, field.propertyKey, value);
  }

  /**
   * create a table in the database
   *
   * @returns {Promise<void>}
   */
  public async createTable(): Promise<void> {
    return this.sqldb.exec(this.table.getCreateTableStatement());
  }

  /**
   * drop a table from the database
   *
   * @returns {Promise<void>}
   */
  public async dropTable(): Promise<void> {
    return this.sqldb.exec(this.table.getDropTableStatement());
  }

  /**
   * add a column/field to a database table
   *
   * @param colName - The column/field to add
   * @returns A promise
   */
  public async alterTableAddColumn(colName: string): Promise<void> {
    return this.sqldb.exec(this.table.getAlterTableAddColumnStatement(colName));
  }

  /**
   * create index in the database
   *
   * @param idxName - The name of the index
   * @param [unique] - create unique index
   * @returns A promise
   */
  public async createIndex(idxName: string, unique?: boolean): Promise<void> {
    return this.sqldb.exec(this.table.getCreateIndexStatement(idxName, unique));
  }

  /**
   * drop an index from the database
   *
   * @param idxName - The name of the index
   * @returns A promise
   */
  public async dropIndex(idxName: string): Promise<void> {
    return this.sqldb.exec(this.table.getDropIndexStatement(idxName));
  }
}
