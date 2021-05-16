/* eslint-disable @typescript-eslint/ban-types */
import { MetaModel } from '../metadata';

import { QueryOperation } from './QueryOperation';
import { QueryPropertyPredicate } from './QueryPropertyPredicate';
import { getPropertyComparison, getPropertyPredicates, ModelPredicates } from './Where';

export class QueryModelPredicates<MT> implements QueryOperation {
  subOperations: QueryPropertyPredicate<MT[keyof MT]>[];

  constructor(pred: ModelPredicates<MT>) {
    this.subOperations = [];
    const keys = Object.keys(pred);
    keys.forEach((propertyKey) => {
      const propertyPredicates = getPropertyPredicates(pred, propertyKey as keyof MT);

      if (
        typeof propertyPredicates !== 'object' ||
        propertyPredicates instanceof Date ||
        propertyPredicates instanceof Promise
      ) {
        // shorthand form for 'eq' comparison
        this.subOperations.push(new QueryPropertyPredicate(propertyKey, 'eq', propertyPredicates));
      } else {
        const comparisonKeys = Object.keys(propertyPredicates);
        comparisonKeys.forEach((comparisonOp) => {
          const comparison = getPropertyComparison(propertyPredicates, comparisonOp);
          this.subOperations.push(
            new QueryPropertyPredicate(propertyKey, comparisonOp, comparison),
          );
        });
      }
    });
  }

  async toSql(metaModel: MetaModel, params: Object, tablePrefix: string): Promise<string> {
    const parts: string[] = [];
    for (const predicate of this.subOperations) {
      const part = await predicate.toSql(metaModel, params, tablePrefix);
      /* istanbul ignore else */
      if (part.length) {
        parts.push(part);
      }
    }
    if (!parts.length) {
      return '';
    }
    return parts.join(' and ');
  }
}
