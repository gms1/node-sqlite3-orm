/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import { SqlDatabase } from '../core';

import { Filter } from './Filter';
import { QueryCondition } from './QueryCondition';
import { QueryModelBase } from './QueryModelBase';
import { QueryModelPredicates } from './QueryModelPredicates';
import { isModelPredicates, Where } from './Where';

export class QueryModel<T> extends QueryModelBase<T> {
  constructor(type: { new (): T }) {
    super(type);
  }

  /**
   * count all models using an optional filter
   *
   * @param sqldb - The database connection
   * @param [filter] - An optional Filter-object
   * @param [params] - An optional object with additional host parameter
   * @returns promise of the number of models
   */
  async countAll(sqldb: SqlDatabase, filter?: Filter<T>, params?: Object): Promise<number> {
    try {
      params = Object.assign({}, params);
      const select = await this.getSelectStatementForColumnExpression(
        'COUNT(*) as result',
        filter || {},
        params,
      );
      const row: any = await sqldb.get(select, params);
      return row.result || 0;
    } catch (e /* istanbul ignore next */) {
      return Promise.reject(new Error(`count '${this.table.name}' failed: ${e.message}`));
    }
  }

  /**
   * check if model exist using an optional filter
   *
   * @param sqldb - The database connection
   * @param [filter] - An optional Filter-object
   * @param [params] - An optional object with additional host parameter
   * @returns promise for boolean result
   */
  async exists(sqldb: SqlDatabase, filter?: Filter<T>, params?: Object): Promise<boolean> {
    try {
      params = Object.assign({}, params);
      const subQuery = await this.getSelectStatementForColumnExpression('1', filter || {}, params);
      const select = `SELECT EXISTS(\n${subQuery}) as result\n`;
      const row: any = await sqldb.get(select, params);
      return row.result ? true : false;
    } catch (e /* istanbul ignore next */) {
      return Promise.reject(new Error(`count '${this.table.name}' failed: ${e.message}`));
    }
  }

  /**
   * Select all models using an optional filter
   *
   * @param sqldb - The database connection
   * @param [filter] - An optional Filter-object
   * @param [params] - An optional object with additional host parameter
   * @returns A promise of array of model instances
   */
  async selectAll(sqldb: SqlDatabase, filter?: Filter<T>, params?: Object): Promise<T[]> {
    try {
      params = Object.assign({}, params);
      const select = await this.getSelectStatement(this.toSelectAllColumnsFilter(filter), params);
      const rows: any[] = await sqldb.all(select, params);
      const results: T[] = [];
      rows.forEach((row) => {
        results.push(this.updateModelFromRow(new this.type(), row));
      });
      return results;
    } catch (e) {
      return Promise.reject(new Error(`select '${this.table.name}' failed: ${e.message}`));
    }
  }

  /**
   * Select all partial models using a filter
   *
   * @param sqldb - The database connection
   * @param filter - A Filter-object
   * @param [params] - An optional object with additional host parameter
   * @returns A promise of array of partial models
   */
  async selectPartialAll(
    sqldb: SqlDatabase,
    filter: Filter<T>,
    params?: Object,
  ): Promise<Partial<T>[]> {
    try {
      params = Object.assign({}, params);
      const select = await this.getSelectStatement(filter, params);
      const rows: any[] = await sqldb.all(select, select);
      const results: Partial<T>[] = [];
      rows.forEach((row) => {
        results.push(this.getPartialFromRow(row));
      });
      return results;
    } catch (e /* istanbul ignore next */) {
      return Promise.reject(new Error(`select '${this.table.name}' failed: ${e.message}`));
    }
  }

  /**
   * Select a given model by ID
   *
   * @param sqldb - The database connection
   * @param model - The input/output model
   * @returns A promise of the model instance
   */
  async selectModel(sqldb: SqlDatabase, model: T): Promise<T> {
    try {
      const row = await sqldb.get(
        this.getSelectByIdStatement(),
        this.bindPrimaryKeyInputParams(model),
      );
      model = this.updateModelFromRow(model, row);
    } catch (e /* istanbul ignore next */) {
      return Promise.reject(new Error(`select '${this.table.name}' failed: ${e.message}`));
    }
    return model;
  }

  /**
   * Select a model by given partial model
   *
   * @param sqldb - The database connection
   * @param input - The partial model providing the ID
   * @returns A promise of the model
   */
  async selectModelById(sqldb: SqlDatabase, input: Partial<T>): Promise<T> {
    let model: T = new this.type();
    try {
      const row = await sqldb.get(
        this.getSelectByIdStatement(),
        this.bindPrimaryKeyInputParams(input),
      );
      model = this.updateModelFromRow(model, row);
    } catch (e /* istanbul ignore next */) {
      return Promise.reject(new Error(`select '${this.table.name}' failed: ${e.message}`));
    }
    return model;
  }

  /*
   * select each model using a callback
   */
  async selectEach(
    sqldb: SqlDatabase,
    callback: (err: Error, model: T) => void,
    filter?: Filter<T>,
    params?: Object,
  ): Promise<number> {
    try {
      params = Object.assign({}, params);
      const select = await this.getSelectStatement(this.toSelectAllColumnsFilter(filter), params);
      const res = await sqldb.each(select, params, (err, row) => {
        // TODO: err?
        callback(err, this.updateModelFromRow(new this.type(), row));
      });
      return res;
    } catch (e) {
      return Promise.reject(new Error(`select '${this.table.name}' failed: ${e.message}`));
    }
  }

  public async getWhereClause(filter: Filter<T>, params: Object): Promise<string> {
    if (!filter || !filter.where) {
      return '';
    }
    let where: Where<T> = filter.where;
    if (typeof where === 'string') {
      where = where.trimLeft();
      if (!where.length) {
        return '';
      }
      if (where.substring(0, 5).toUpperCase() !== 'WHERE') {
        return `WHERE ${where}`;
      }
      return where;
    }
    const tableAlias = filter.tableAlias ? filter.tableAlias : undefined;
    const tablePrefix = tableAlias && tableAlias.length ? `${tableAlias}.` : '';

    let oper: QueryCondition<T> | QueryModelPredicates<T>;
    if (isModelPredicates(where)) {
      oper = new QueryModelPredicates<T>(where);
    } else {
      oper = new QueryCondition<T>(where);
    }

    const whereClause = await oper.toSql(this.metaModel, params, tablePrefix);
    return whereClause.length ? `WHERE ${whereClause}` : whereClause;
  }

  protected async getSelectStatement(filter: Filter<T>, params: Object): Promise<string> {
    try {
      let sql = this.getSelectAllStatement(this.getSelectColumns(filter), filter.tableAlias);
      sql += await this.getNonColumnClauses(filter, params);
      return sql;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  protected async getSelectStatementForColumnExpression(
    colexpr: string,
    filter: Filter<T>,
    params: Object,
  ): Promise<string> {
    try {
      let sql = this.getSelectAllStatementForColumnExpression(colexpr, filter.tableAlias);
      sql += await this.getNonColumnClauses(filter, params);
      return sql;
    } catch (e /* istanbul ignore next */) {
      return Promise.reject(e);
    }
  }

  protected getSelectColumns(filter: Filter<T>): (keyof T)[] | undefined {
    if (!filter.select) {
      return undefined;
    }
    const columns: (keyof T)[] = [];
    for (const key in filter.select) {
      if (Object.prototype.hasOwnProperty.call(filter.select, key) && filter.select[key]) {
        const prop = this.metaModel.properties.get(key);
        if (!prop) {
          continue;
        }
        columns.push(key);
      }
    }
    return columns.length ? columns : undefined;
  }

  protected async getNonColumnClauses(filter: Filter<T>, params: Object): Promise<string> {
    let sql = '';
    const whereClause = await this.getWhereClause(filter, params);
    if (whereClause.length) {
      sql += `  ${whereClause}\n`;
    }
    const orderByClause = this.getOrderByClause(filter);
    if (orderByClause.length) {
      sql += `  ${orderByClause}\n`;
    }
    const limitClause = this.getLimitClause(filter);
    if (limitClause.length) {
      sql += `  ${limitClause}\n`;
    }
    const offsetClause = this.getOffsetClause(filter);
    if (offsetClause.length) {
      sql += `  ${offsetClause}\n`;
    }
    return sql;
  }

  protected getOrderByClause(filter?: Filter<T>): string {
    if (!filter || !filter.order) {
      return '';
    }
    const columns: string[] = [];
    for (const key in filter.order) {
      /* istanbul ignore if */
      if (!Object.prototype.hasOwnProperty.call(filter.order, key)) {
        continue;
      }
      const prop = this.metaModel.properties.get(key);
      if (!prop) {
        continue;
      }
      if (filter.order[key]) {
        columns.push(prop.field.quotedName);
      } else {
        columns.push(`${prop.field.quotedName} DESC`);
      }
    }
    if (!columns.length) {
      return '';
    }
    const tableAlias = filter.tableAlias ? filter.tableAlias : undefined;
    const tablePrefix = tableAlias && tableAlias.length ? `${tableAlias}.` : '';
    return `ORDER BY ${tablePrefix}` + columns.join(`, ${tablePrefix}`);
  }

  protected getLimitClause(filter?: Filter<T>): string {
    if (!filter || !filter.limit) {
      return '';
    }
    return `LIMIT ${filter.limit}`;
  }

  protected getOffsetClause(filter?: Filter<T>): string {
    if (!filter || !filter.offset) {
      return '';
    }
    return ` OFFSET ${filter.offset}`;
  }

  protected toSelectAllColumnsFilter(filter?: Filter<T>): Filter<T> {
    const res = Object.assign({}, filter);
    if (res.select) {
      delete res.select;
    }
    return res;
  }
}
