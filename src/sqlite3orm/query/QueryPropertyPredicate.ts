/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { KeyType, MetaModel, MetaProperty } from '../metadata';

import { QueryOperation } from './QueryOperation';
import { ComparisonOperatorType } from './Where';

export class QueryPropertyPredicate<PT> implements QueryOperation {
  op: ComparisonOperatorType;
  constructor(public propertyKey: KeyType, opName: string, public value: any) {
    switch (opName) {
      case 'eq':
      case 'neq':
      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte':
      case 'isIn':
      case 'isNotIn':
      case 'isBetween':
      case 'isNotBetween':
      case 'isLike':
      case 'isNotLike':
      case 'isNull':
      case 'isNotNull':
        this.op = opName;
        break;
      /* istanbul ignore next */
      default:
        throw new Error(`unknown comparison operation: '${opName}'`);
    }
  }

  async toSql(metaModel: MetaModel, params: Object, tablePrefix: string): Promise<string> {
    const prop = metaModel.getProperty(this.propertyKey);
    let sql = `${tablePrefix}${prop.field.quotedName} `;
    const value = await this.value;

    sql += this.operatorSql(value);

    switch (this.op) {
      // no host variable:
      case 'isNull':
      case 'isNotNull':
        return sql;

      // one host variable:
      case 'eq':
      case 'neq':
      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte':
      case 'isLike':
      case 'isNotLike':
        sql += ' ' + this.setHostParameter(prop, params, prop.valueToDB(value));
        return sql;

      // two host variables:
      case 'isBetween':
      case 'isNotBetween': {
        /* istanbul ignore if */
        if (!Array.isArray(value)) {
          throw new Error(
            `expected array parameter for BETWEEN-operation on '${this.propertyKey.toString()}`,
          );
        }
        /* istanbul ignore if */
        if (value.length !== 2) {
          throw new Error(
            `expected 2-tuple for BETWEEN-operation on '${this.propertyKey.toString()}`,
          );
        }
        const from = await value[0];
        const to = await value[1];
        sql += ' ' + this.setHostParameter(prop, params, prop.valueToDB(from));
        sql += ' AND ' + this.setHostParameter(prop, params, prop.valueToDB(to));
        return `(${sql})`;
      }

      // multiple host variables:
      case 'isIn':
      case 'isNotIn': {
        /* istanbul ignore if */
        if (!Array.isArray(value)) {
          throw new Error(
            `expected array parameter for IN-operation on '${this.propertyKey.toString()}`,
          );
        }
        if (!value.length) {
          throw new Error(`expected a value for IN-operation on '${this.propertyKey.toString()}`);
        }
        const hostParams: any[] = [];
        for (const item of value) {
          hostParams.push(this.setHostParameter(prop, params, prop.valueToDB(item)));
        }
        sql += ' (' + hostParams.join(', ') + ')';
        return sql;
      }

      /* istanbul ignore next */
      default:
        throw new Error(`unknown operation: '${this.op}`);
    }
  }

  protected operatorSql(value: any): string {
    // add operator
    switch (this.op) {
      case 'isNull':
        return value ? 'ISNULL' : 'NOTNULL';
      case 'isNotNull':
        return value ? 'NOTNULL' : 'ISNULL';
      case 'eq':
        return '=';
      case 'neq':
        return '!=';
      case 'gt':
        return '>';
      case 'gte':
        return '>=';
      case 'lt':
        return '<';
      case 'lte':
        return '<=';
      case 'isLike':
        return 'LIKE';
      case 'isNotLike':
        return 'NOT LIKE';
      case 'isBetween':
        return 'BETWEEN';
      case 'isNotBetween':
        return 'NOT BETWEEN';
      case 'isIn':
        return 'IN';
      case 'isNotIn':
        return 'NOT IN';
      /* istanbul ignore next */
      default:
        throw new Error(`unknown operation: '${this.op}`);
    }
  }

  protected setHostParameter(prop: MetaProperty, params: any, value: any): string {
    const namePrefix = prop.getHostParameterName('w$');
    let nr = 1;
    let key = `${namePrefix}$`;
    while (Object.prototype.hasOwnProperty.call(params, key)) {
      nr++;
      key = `${namePrefix}$${nr}`;
    }
    params[key] = value;
    return key;
  }
}
