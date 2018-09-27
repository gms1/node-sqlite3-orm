
type Primitive = string|number|boolean;


export type ComparisonOperatorType = 'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'isIn'|'isNotIn'|'isBetween'|'isNotBetween'|
    'isLike'|'isNotLike'|'isNull'|'isNotNull';


export interface PropertyComparisons<T> {
  eq?: T;
  neq?: T;
  gt?: T;
  gte?: T;
  lt?: T;
  lte?: T;

  isIn?: T[];
  isNotIn?: T[];
  isBetween?: [T, T];
  isNotBetween?: [T, T];
  isLike?: T&string;
  isNotLike?: T&string;
  isNull?: boolean;
  isNotNull?: boolean;
}


/*
 * ModelPredicates<MT>:
 * predicates defined on model properties to apply on table fields:
 * */

/* usage: * /
interface Post {
  id: number;
  title: string;
  author: string;
  likes: number;
}

const pred: ModelPredicates<Post> = {
  title: 'hello'
};
const pred2: ModelPredicates<Post> = {
  likes: {isBetween: [0, 4]}
};


*/

type ShortHandType = Primitive|Date;

export type PropertyPredicates<PT> = PropertyComparisons<Promise<PT>|PT>|(PT&ShortHandType);

export type ModelPredicates<MT> = {
  [K in keyof MT]?: PropertyPredicates<MT[K]>;
}&{not?: never, or?: never, and?: never, sql?: never};

export function getPropertyPredicates<MT, K extends keyof MT>(
    modelPredicate: ModelPredicates<MT>, key: K): PropertyPredicates<MT[K]> {
  return (modelPredicate[key] || {}) as PropertyPredicates<MT[K]>;
}

export function getPropertyComparison<MT, K extends keyof MT>(
    propertyPredicate: PropertyPredicates<MT[K]>, key: string): any {
  return (propertyPredicate as any)[key];
}

/*
 * Condition<MT>* conditions defined on model to apply to the where - clause *
 *
 * */


/* usage: * /

const cond1: Condition<Post> = {
  not: {title: 'foo'}
};
const cond2: Condition<Post> = {
  or: [{title: 'foo'}, {title: 'bar'}]
};
const cond3: Condition<Post> = {
  and: [{author: 'gms'}, {or: [{title: {isLike: '%hello%'}}, {title: {isLike: '%world%'}}]}]
};

*/

export type LogicalOperatorType = 'not'|'or'|'and'|'sql';

export type Condition<MT> = {
  not: (Condition<MT>|ModelPredicates<MT>)
}|{or: (Condition<MT>|ModelPredicates<MT>)[]}|{and: (Condition<MT>|ModelPredicates<MT>)[]}|{sql: string}|
    ModelPredicates<MT>;


export function isModelPredicates<MT>(cond?: Condition<MT>): cond is ModelPredicates<MT> {
  return cond && (cond as any).not === undefined && (cond as any).or === undefined && (cond as any).and === undefined &&
          (cond as any).sql === undefined ?
      true :
      false;
}


/*
 * Where<MT>
 *
 * alias for Condition<MT>|string
 *  */
export type Where<MT> = Condition<MT>|string;
