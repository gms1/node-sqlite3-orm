/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetaModel } from '../metadata';

import { QueryModelPredicates } from './QueryModelPredicates';
import { QueryOperation } from './QueryOperation';
import { Condition, isModelPredicates, LogicalOperatorType, ModelPredicates } from './Where';

export class QueryCondition<MT> implements QueryOperation {
  readonly op!: LogicalOperatorType;
  readonly subOperations: (QueryCondition<MT> | QueryModelPredicates<MT>)[];
  sql: string;

  constructor(cond: Condition<MT>) {
    this.subOperations = [];
    this.sql = '';
    const keys = Object.keys(cond);
    /* istanbul ignore if */
    if (keys.length !== 1) {
      throw new Error(`unknown operation: ${keys.toString()}`);
    }
    const key = keys[0];
    /* istanbul ignore if */
    if (key !== 'not' && key !== 'and' && key !== 'or' && key !== 'sql') {
      throw new Error(`unknown operation: '${key}'`);
    }
    this.op = key;
    if (this.op === 'sql') {
      this.sql = (cond as any)[key] as string;
    } else if (this.op === 'not') {
      const value = (cond as any)[key] as Condition<MT> | ModelPredicates<MT>;
      if (isModelPredicates(value)) {
        this.subOperations.push(new QueryModelPredicates<MT>(value));
      } else {
        this.subOperations.push(new QueryCondition<MT>(value));
      }
    } else {
      const value = (cond as any)[key] as (Condition<MT> | ModelPredicates<MT>)[];
      value.forEach((item) => {
        if (isModelPredicates(item)) {
          this.subOperations.push(new QueryModelPredicates<MT>(item));
        } else {
          this.subOperations.push(new QueryCondition<MT>(item));
        }
      });
    }
  }

  async toSql(metaModel: MetaModel, params: Object, tablePrefix: string): Promise<string> {
    if (this.op === 'sql') {
      return this.sql;
    }
    const parts: string[] = [];
    for (const subOperation of this.subOperations) {
      const part = await subOperation.toSql(metaModel, params, tablePrefix);
      if (part.length) {
        parts.push(part);
      }
    }
    if (!parts.length) {
      return '';
    }
    switch (this.op) {
      case 'not':
        return `not (${parts[0]})`;
      case 'and':
        return '(' + parts.join(') and (') + ')';
      case 'or':
        return '(' + parts.join(') or (') + ')';
    }
  }
}
