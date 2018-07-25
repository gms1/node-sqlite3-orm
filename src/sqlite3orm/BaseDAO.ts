// tslint:disable-next-line: no-import-side-effect
// import * as core from './core';

import {METADATA_MODEL_KEY} from './decorators';
import {SqlDatabase} from './SqlDatabase';
import {Table} from './Table';
import {MetaModel, TABLEALIASPREFIX} from './MetaModel';
import {MetaProperty} from './MetaProperty';

/**
 *
 *
 * @export
 * @class BaseDAO
 * @template T - The class mapped to the base table
 */
export class BaseDAO<T extends Object> {
  readonly type: {new(): T};
  readonly metaModel: MetaModel;
  readonly table: Table;
  readonly sqldb: SqlDatabase;

  /**
   * Creates an instance of BaseDAO.
   *
   * @param type - The class mapped to the base table
   * @param sqldb - The database connection
   */
  public constructor(type: {new(): T}, sqldb: SqlDatabase) {
    this.type = type;
    this.metaModel = Reflect.getMetadata(METADATA_MODEL_KEY, type.prototype);
    if (!this.metaModel) {
      throw new Error(`no table-definition defined on prototype of ${this.type.name}'`);
    }
    this.table = this.metaModel.table;
    this.sqldb = sqldb;
  }

  /**
   * insert
   *
   * @param model - A model class instance
   * @returns A promise of the inserted model class instance
   */
  public insert(model: T): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      try {
        if (!this.table.autoIncrementField) {
          await this.sqldb.run(this.metaModel.getInsertIntoStatement(), this.bindAllInputParams(model));
        } else {
          const res: any =
              await this.sqldb.run(this.metaModel.getInsertIntoStatement(), this.bindNonPrimaryKeyInputParams(model));
          /* istanbul ignore if */
          // tslint:disable-next-line: triple-equals
          if (res.lastID == undefined) {
            // NOTE: should not happen
            reject(new Error('AUTOINCREMENT failed, \'lastID\' is undefined or null'));
            return;
          }
          res[this.table.autoIncrementField.name] = res.lastID;
          const autoProp = this.metaModel.mapColNameToProp.get(this.table.autoIncrementField.name);
          /* istanbul ignore else */
          if (autoProp) {
            autoProp.setPropertyValue(model, res.lastID);
          }
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
  public update(model: T): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      try {
        const res = await this.sqldb.run(this.metaModel.getUpdateByIdStatement(), this.bindAllInputParams(model));
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
  public delete(model: T): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const res =
            await this.sqldb.run(this.metaModel.getDeleteByIdStatement(), this.bindPrimaryKeyInputParams(model));
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
  public deleteById(input: Partial<T>): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const res =
            await this.sqldb.run(this.metaModel.getDeleteByIdStatement(), this.bindPrimaryKeyInputParams(input));
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
  public select(model: T): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      try {
        const row =
            await this.sqldb.get(this.metaModel.getSelectByIdStatement(), this.bindPrimaryKeyInputParams(model));
        model = this.readResultRow(model, row);
      } catch (e /* istanbul ignore next */) {
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
  public selectById(input: Partial<T>): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      let output: T;
      try {
        const row =
            await this.sqldb.get(this.metaModel.getSelectByIdStatement(), this.bindPrimaryKeyInputParams(input));
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
   *                (e.g 'WHERE <your condition>', 'ORDER BY <columns>')
   * @param [params] - An optional object with additional host parameter
   * @returns A promise of array of class instances
   */
  public selectAll(sql?: string, params?: Object): Promise<T[]> {
    return new Promise<T[]>(async (resolve, reject) => {
      try {
        let stmt = this.metaModel.getSelectAllStatement();
        if (sql) {
          stmt += ' ';
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
   *                (e.g ')
   * @param [params] - An optional object with additional host parameter
   * @returns A promise
   */
  public selectEach(callback: (err: Error, model: T) => void, sql?: string, params?: Object): Promise<number> {
    return new Promise<number>(async (resolve, reject) => {
      try {
        let stmt = this.metaModel.getSelectAllStatement();
        if (sql) {
          stmt += ' ';
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
   * select all childs using a foreign key constraint and a given parent instance
   *
   * @template P - The class mapped to the parent table
   * @param constraintName - The foreign key constraint
   * @param parentType - The class mapped to the parent table
   * @param parentObj - An instance of the class mapped to the parent table
   * @param [sql] - An optional sql-text which will be added to the where-clause of the select-statement
   * @param [params] - An optional object with additional host parameter
   * @returns A promise of array of model class instances
   */
  public selectAllOf<P extends Object>(
      constraintName: string, parentType: {new(): P}, parentObj: P, sql?: string, params?: Object): Promise<T[]> {
    return new Promise<T[]>(async (resolve, reject) => {
      try {
        const fkSelCondition = this.metaModel.getForeignKeySelects(constraintName);
        if (!fkSelCondition) {
          throw new Error(`constraint '${constraintName}' is not defined`);
        }
        let stmt = this.metaModel.getSelectAllStatement();
        stmt += '\nWHERE\n  ';
        stmt += fkSelCondition;
        if (sql) {
          stmt += ' ';
          stmt += sql;
        }
        const parentDAO = new BaseDAO<P>(parentType, this.sqldb);
        const childParams = this.bindForeignParams(parentDAO, constraintName, parentObj, params);

        const rows: any[] = await this.sqldb.all(stmt, childParams);
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
   * select all childs using a foreign key constraint and a given parent instance
   *
   * @template C - The class mapped to the child table
   * @param constraintName - The foreign key constraint (defined in the child table)
   * @param childType - The class mapped to the childtable
   * @param parentObj - An instance of the class mapped to the parent table
   * @param [sql] - An optional sql-text which will be added to the where-clause of the select-statement
   * @param [params] - An optional object with additional host parameter
   * @returns A promise of array of model class instances
   */
  public selectAllChildsOf<C extends Object>(
      constraintName: string, childType: {new(): C}, parentObj: T, sql?: string, params?: Object): Promise<C[]> {
    const childDAO = new BaseDAO<C>(childType, this.sqldb);
    return childDAO.selectAllOf(constraintName, this.type, parentObj, sql, params);
  }

  /**
   * select parent by using a foreign key constraint and a given child instance
   *
   * @template C - The class mapped to the child table
   * @param constraintName - The foreign key constraint (defined in the child table)
   * @param childType - The class mapped to the childtable
   * @param childObj - An instance of the class mapped to the child table
   * @returns A promise of model class instance
   */
  public selectByChild<C extends Object>(constraintName: string, childType: {new(): C}, childObj: C): Promise<T> {
    return new Promise<T>(async (resolve, reject) => {
      // create child DAO
      const childDAO = new BaseDAO<C>(childType, this.sqldb);
      let output: T;
      try {
        // get child properties
        const fkProps = childDAO.metaModel.getForeignKeyProps(constraintName);
        const cols = childDAO.metaModel.getForeignKeyRefCols(constraintName);
        /* istanbul ignore if */
        if (!fkProps || !cols) {
          throw new Error(`in '${childDAO.metaModel.name}': constraint '${constraintName}' is not defined`);
        }
        const refNotFoundCols: string[] = [];

        // get parent (our) properties
        const props = this.metaModel.getPropertiesFromColumnNames(cols, refNotFoundCols);
        /* istanbul ignore if */
        if (!props || refNotFoundCols.length) {
          const s = '"' + refNotFoundCols.join('", "') + '"';
          throw new Error(`in '${this.metaModel.name}': no property mapped to these fields: ${s}`);
        }
        // bind parameters
        const hostParams: Object = {};
        for (let i = 0; i < fkProps.length; ++i) {
          this.setHostParamValue(hostParams, props[i], fkProps[i].getPropertyValue(childObj));
        }

        // generate statement
        let stmt = this.metaModel.getSelectAllStatement();
        stmt += '\nWHERE\n  ';
        stmt += props.map((prop) => `${TABLEALIASPREFIX}${prop.field.quotedName}=${prop.getHostParameterName()}`)
                    .join(' AND ');

        const row = await this.sqldb.get(stmt, hostParams);
        output = this.readResultRow(new this.type(), row);

      } catch (e /* istanbul ignore next */) {
        reject(new Error(`select '${this.table.name}' failed: ${e.message}`));
        return;
      }
      resolve(output);
    });
  }

  /**
   * select parent by using a foreign key constraint and a given child instance
   *
   * @template P - The class mapped to the parent table
   * @param constraintName - The foreign key constraint (defined in the child table)
   * @param parentType - The class mapped to the parent table
   * @param childObj - An instance of the class mapped to the child table
   * @returns A promise of model class instance
   */
  public selectParentOf<P extends Object>(constraintName: string, parentType: {new(): P}, childObj: T): Promise<P> {
    const parentDAO = new BaseDAO<P>(parentType, this.sqldb);
    return parentDAO.selectByChild(constraintName, this.type, childObj);
  }


  /**
   * insert partially - insert only columns mapped to the property keys from the partial input model
   *
   * for this to work:
   * all columns mapped to included properties must be nullable or their properties must provide a value
   * all columns mapped to excluded properties must be nullable or must have a database default value
   *
   * @param input - A model class instance
   * @returns A promise of the inserted model class instance
   */
  public async partialInsert(input: Partial<T>): Promise<Partial<T>> {
    return new Promise<Partial<T>>(async (resolve, reject) => {
      try {
        const subset = Object.keys(input);
        if (!this.table.autoIncrementField) {
          await this.sqldb.run(this.metaModel.getInsertIntoStatement(subset), this.bindAllInputParams(input, subset));
        } else {
          const res: any = await this.sqldb.run(
              this.metaModel.getInsertIntoStatement(subset), this.bindNonPrimaryKeyInputParams(input));
          /* istanbul ignore if */
          // tslint:disable-next-line: triple-equals
          if (res.lastID == undefined) {
            // NOTE: should not happen
            reject(new Error('AUTOINCREMENT failed, \'lastID\' is undefined or null'));
            return;
          }
          res[this.table.autoIncrementField.name] = res.lastID;
          const autoProp = this.metaModel.mapColNameToProp.get(this.table.autoIncrementField.name);
          /* istanbul ignore else */
          if (autoProp) {
            autoProp.setPropertyValue(input, res.lastID);
          }
        }
      } catch (e) {
        reject(new Error(`insert into '${this.table.name}' failed: ${e.message}`));
        return;
      }
      resolve(input);
    });
  }


  /**
   * update partially - update only columns mapped to the property keys from the partial input model
   *
   * for this to work:
   * all columns mapped to included properties must be nullable or their properties must provide a value
   * all other columns are not affected by this update
   *
   * @param input - A model class instance
   * @returns A promise of the updated model class instance
   */
  public async partialUpdate(input: Partial<T>): Promise<Partial<T>> {
    return new Promise<Partial<T>>(async (resolve, reject) => {
      try {
        const subset = Object.keys(input);
        const res = await this.sqldb.run(
            this.metaModel.getUpdateByIdStatement(subset), this.bindAllInputParams(input, subset, true));
        if (!res.changes) {
          reject(new Error(`update '${this.table.name}' failed: nothing changed`));
          return;
        }
      } catch (e) {
        reject(new Error(`update '${this.table.name}' failed: ${e.message}`));
        return;
      }
      resolve(input);
    });
  }


  /**
   * update all - please provide a proper sql-condition otherwise all records will be updated!
   * updates only columns mapped to the property keys from the partial input model
   *
   * for this to work:
   * all columns mapped to included properties must be nullable or their properties must provide a value
   * all other columns are not affected by this update
   *
   * @param input - A model class instance
   * @param [sql] - An optional sql-text which will be added to the update-statement (e.g 'WHERE <your condition>' )
   * @param [params] - An optional object with additional host parameter
   * @returns A promise of the updated model class instance
   */
  public async updateAll(input: Partial<T>, sql?: string, params?: Object): Promise<number> {
    return new Promise<number>(async (resolve, reject) => {
      try {
        const subset = Object.keys(input);
        let stmt = this.metaModel.getUpdateAllStatement(subset);
        if (sql) {
          stmt += ' ';
          stmt += sql;
        }
        const hostParams = Object.assign({}, params, this.bindAllInputParams(input, subset));
        const res = await this.sqldb.run(stmt, hostParams);
        if (!res.changes) {
          reject(new Error(`update '${this.table.name}' failed: nothing changed`));
          return;
        }
        resolve(res.changes);
      } catch (e /* istanbul ignore next */) {
        reject(new Error(`update '${this.table.name}' failed: ${e.message}`));
        return;
      }
    });
  }

  /**
   * delete all - please provide a proper sql-condition otherwise all records will be deleted!
   *
   * @param input - A partial model class instance
   * @returns A promise
   */
  public async deleteAll(sql?: string, params?: Object): Promise<number> {
    return new Promise<number>(async (resolve, reject) => {
      try {
        let stmt = this.metaModel.getDeleteAllStatement();
        if (sql) {
          stmt += ' ';
          stmt += sql;
        }
        const hostParams = Object.assign({}, params);
        const res = await this.sqldb.run(stmt, hostParams);
        if (!res.changes) {
          reject(new Error(`delete from '${this.table.name}' failed: nothing changed`));
          return;
        }
        resolve(res.changes);
      } catch (e /* istanbul ignore next */) {
        reject(new Error(`delete from '${this.table.name}' failed: ${e.message}`));
        return;
      }
    });
  }

  protected bindAllInputParams(model: Partial<T>, subset?: (string|symbol)[], addIdentity?: boolean): Object {
    const hostParams: Object = {};
    const props = this.metaModel.getPropertiesFromKeys(subset, addIdentity);
    props.forEach((prop) => {
      this.setHostParam(hostParams, prop, model);
    });
    return hostParams;
  }

  protected bindNonPrimaryKeyInputParams(model: Partial<T>, subset?: (string|symbol)[]): Object {
    const hostParams: Object = {};
    const props = this.metaModel.getPropertiesFromKeys(subset);
    props.filter((prop) => !prop.field.isIdentity).forEach((prop) => {
      this.setHostParam(hostParams, prop, model);
    });
    return hostParams;
  }

  protected bindPrimaryKeyInputParams(model: Partial<T>): Object {
    const hostParams: Object = {};
    const props = Array.from(this.metaModel.properties.values());
    props.filter((prop) => prop.field.isIdentity).forEach((prop) => {
      this.setHostParam(hostParams, prop, model);
    });
    return hostParams;
  }

  protected bindForeignParams<F extends Object>(
      foreignDAO: BaseDAO<F>, constraintName: string, foreignObject: F, more: Object = {}): Object {
    const hostParams: Object = Object.assign({}, more);
    const fkProps = this.metaModel.getForeignKeyProps(constraintName);
    const refCols = this.metaModel.getForeignKeyRefCols(constraintName);
    const refMetaModel = foreignDAO.metaModel;

    /* istanbul ignore if */
    if (!fkProps || !refCols || fkProps.length !== refCols.length) {
      throw new Error(`bind information for '${constraintName}' in table '${this.table.name}' is incomplete`);
    }

    const refNotFoundCols: string[] = [];
    const refProps = refMetaModel.getPropertiesFromColumnNames(refCols, refNotFoundCols);
    /* istanbul ignore if */
    if (!refProps || refNotFoundCols.length) {
      const s = '"' + refNotFoundCols.join('", "') + '"';
      throw new Error(`in '${refMetaModel.name}': no property mapped to these fields: ${s}`);
    }

    for (let i = 0; i < fkProps.length; ++i) {
      const fkProp = fkProps[i];
      const refProp = refProps[i];
      this.setHostParamValue(hostParams, fkProp, refProp.getPropertyValue(foreignObject));
    }
    return hostParams;
  }


  protected setHostParam(hostParams: any, prop: MetaProperty, model: Partial<T>): void {
    hostParams[prop.getHostParameterName()] = prop.getPropertyValue(model);
  }

  protected setHostParamValue(hostParams: any, prop: MetaProperty, value: any): void {
    hostParams[prop.getHostParameterName()] = value;
  }

  protected readResultRow(model: T, row: any): T {
    this.metaModel.properties.forEach((prop) => {
      prop.setPropertyValue(model, row[prop.field.name]);
    });
    return model;
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
   * @param colName - The column/field to add
   * @returns A promise
   */
  public alterTableAddColumn(colName: string): Promise<void> {
    return this.sqldb.exec(this.table.getAlterTableAddColumnStatement(colName));
  }

  /**
   * create index in the database
   *
   * @param idxName - The name of the index
   * @param [unique] - create unique index
   * @returns A promise
   */
  public createIndex(idxName: string, unique?: boolean): Promise<void> {
    return this.sqldb.exec(this.table.getCreateIndexStatement(idxName, unique));
  }

  /**
   * drop an index from the database
   *
   * @param idxName - The name of the index
   * @returns A promise
   */
  public dropIndex(idxName: string): Promise<void> {
    return this.sqldb.exec(this.table.getDropIndexStatement(idxName));
  }
}
