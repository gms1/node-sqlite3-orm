

/*
 * conditions on field columns
 */
export interface PredicateCondition {
  // one of:

  // comparison operators:
  eq?: any;
  neq?: any;
  gt?: any;
  gte?: any;
  lt?: any;
  lte?: any;

  // logical operators:
  isIn?: any[]|(() => any[]);
  notIn?: any[]|(() => any[]);
  isBetween?: any[];
  notBetween?: any[];
  isLike?: any;
  notLike?: any;
  exists?: true;
  notExists?: true;
}

/**
 * a predicate defined on a column mapped to a property
 *
 */
export interface Predicate {
  property: string;
  condition: PredicateCondition;
}


/*
 * 'and' and 'or' enum
 */
export enum LogicalBinaryOperator {
  and,
  or
}

/*
 * Where
 * 1st. partial declaration
 */
export interface Where {
  not?: boolean;
  and?: boolean;
  or?: boolean;
}

/*
 * type Condition
 */
export type Condition = Predicate|Where;

/*
 * Where
 * 2nd. partial declaration
 */
export interface Where { conditions?: Condition[]; }


/**
 * WhereBuilder: query builder using fluent API
 */
export class WhereBuilder<T> {
  private _where!: Where;
  private _stack!: Where[];

  get where(): Where|undefined {
    const w = this._stack.length ? this._stack[0] : this._where;
    if (!w.conditions || !w.conditions.length) {
      return undefined;
    }
    if (w.conditions.length === 1 && !isPredicate(w.conditions[0])) {
      return w.conditions[0] as Where;
    }
    return w;
  }

  constructor(where?: Where) {
    this.init(where);
  }

  init(where?: Where): this {
    this._where = where || {and: true};
    this._stack = [];
    return this;
  }


  move(): Where|undefined {
    const where = this.where;
    this.init();
    return where;
  }

  /**
   * an `=` condition
   * @param key Property name
   * @param value Property value
   */
  eq<K extends keyof T>(key: K&string, value: T[K]|(() => T[K])): this {
    return this.addPredicate(key, {eq: value});
  }

  /**
   * a `!=` condition
   * @param key Property name
   * @param value Property value
   */
  neq<K extends keyof T>(key: K&string, value: T[K]|(() => T[K])): this {
    return this.addPredicate(key, {neq: value});
  }

  /**
   * a `>` condition
   * @param key Property name
   * @param value Property value
   */
  gt<K extends keyof T>(key: K&string, value: T[K]|(() => T[K])): this {
    return this.addPredicate(key, {gt: value});
  }

  /**
   * a `>=` condition
   * @param key Property name
   * @param value Property value
   */
  gte<K extends keyof T>(key: K&string, value: T[K]|(() => T[K])): this {
    return this.addPredicate(key, {gte: value});
  }

  /**
   * a `<` condition
   * @param key Property name
   * @param value Property value
   */
  lt<K extends keyof T>(key: K&string, value: T[K]|(() => T[K])): this {
    return this.addPredicate(key, {lt: value});
  }

  /**
   * a `<=` condition
   * @param key Property name
   * @param value Property value
   */
  lte<K extends keyof T>(key: K&string, value: T[K]|(() => T[K])): this {
    return this.addPredicate(key, {lte: value});
  }

  /**
   * a `IN` condition
   * @param key Property name
   * @param value An array of property values
   */
  isIn<K extends keyof T>(key: K&string, value: T[K][]|(() => T[K][])): this {
    return this.addPredicate(key, {isIn: value});
  }

  /**
   * a `NOT IN` condition
   * @param key Property name
   * @param value An array of property values
   */
  notIn<K extends keyof T>(key: K&string, value: T[K][]|(() => T[K][])): this {
    return this.addPredicate(key, {notIn: value});
  }

  /**
   * a `BETWEEN` condition
   * @param key Property name
   * @param lower Property lower bound value
   * @param upper Property upper bound balue
   */
  isBetween<K extends keyof T>(key: K&string, lower: T[K]|(() => T[K]), upper: T[K]|(() => T[K])): this {
    return this.addPredicate(key, {isBetween: [lower, upper]});
  }

  /**
   * a `NOT BETWEEN` condition
   * @param key Property name
   * @param lower Property lower bound value
   * @param upper Property upper bound value
   */
  notBetween<K extends keyof T>(key: K&string, lower: T[K]|(() => T[K]), upper: T[K]|(() => T[K])): this {
    return this.addPredicate(key, {notBetween: [lower, upper]});
  }

  /**
   * a `LIKE` condition
   * @param key Property name
   * @param value Property value
   */
  isLike<K extends keyof T>(key: K&string, value: (T[K]&string)|(() => (T[K] & string))): this {
    return this.addPredicate(key, {isLike: value});
  }

  /**
   * a `NOT LIKE` condition
   * @param key Property name
   * @param value Property value
   */
  notLike<K extends keyof T>(key: K&string, value: (T[K]&string)|(() => (T[K] & string))): this {
    return this.addPredicate(key, {notLike: value});
  }

  /**
   * a `IS NOT NULL` condition
   * @param key Property name
   */
  exists<K extends keyof T>(key: K&string): this {
    return this.addPredicate(key, {exists: true});
  }

  /**
   * a `IS NULL` condition
   * @param key Property name
   */
  notExists<K extends keyof T>(key: K&string): this {
    return this.addPredicate(key, {notExists: true});
  }



  /**
   * begin of nested condition
   * @param op condition type
   * @param not negate
   */
  begin(op: LogicalBinaryOperator, not?: boolean): this {
    const newWhere: Where = {};
    switch (op) {
      case LogicalBinaryOperator.and:
        newWhere.and = true;
        break;
      case LogicalBinaryOperator.or:
        newWhere.or = true;
        break;
    }
    if (not) {
      newWhere.not = true;
    }
    if (!this._where.conditions) {
      this._where.conditions = [];
    }
    this._where.conditions.push(newWhere);
    this._stack.push(this._where);
    this._where = newWhere;
    return this;
  }

  /**
   * end of nested condition
   */
  end(): this {
    if (!this._stack.length) {
      throw new Error(`no open nested condition`);
    }
    this._where = this._stack.pop() as Where;
    return this;
  }

  /**
   * begin of nested `OR` condition
   * @param not negate
   */
  beginOr(not?: boolean): this {
    return this.begin(LogicalBinaryOperator.or, not);
  }

  /**
   * begin of nested `AND` condition
   * @param not negate
   */
  beginAnd(not?: boolean): this {
    return this.begin(LogicalBinaryOperator.and, not);
  }

  /**
   * begin of nested `OR` condition
   */
  beginNotOr(): this {
    return this.begin(LogicalBinaryOperator.or, true);
  }

  /**
   * begin of nested `AND` condition
   */
  beginNotAnd(): this {
    return this.begin(LogicalBinaryOperator.and, true);
  }


  protected addPredicate<K extends keyof T>(key: K&string, condition: PredicateCondition): this {
    if (!this._where.conditions) {
      this._where.conditions = [];
    }
    this._where.conditions.push({property: key, condition});
    return this;
  }
}



function isPredicate(condition: Condition): condition is Predicate {
  return (condition as Predicate).property !== undefined;
}
