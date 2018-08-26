import {Where, WhereBuilder} from './Where';

/*
 * order column
 */
export interface OrderColumn {
  property: string;
  desc?: boolean;
}

/*
 * filter
 */
export interface Filter {
  where?: Where;
  columns?: string[];
  order?: OrderColumn[];
  limit?: number;
  offset?: number;
}

/*
 * column builder for columns included in select
 */
export class ColumnBuilder<T> {
  private _columns!: string[];
  get columns(): string[]|undefined {
    return this._columns.length ? this._columns : undefined;
  }

  constructor(columns?: string[]) {
    this.init(columns);
  }

  init(columns?: string[]): void {
    this._columns = columns || [];
  }

  add<K extends keyof T>(key: (K&string)|((K & string)[])): this {
    if (Array.isArray(key)) {
      key.forEach((k) => {
        this._columns.push(k);
      });
    } else {
      this._columns.push(key);
    }
    return this;
  }
}

/*
 * order builder
 */
export class OrderBuilder<T> {
  private _order!: OrderColumn[];
  get order(): OrderColumn[]|undefined {
    return this._order.length ? this._order : undefined;
  }

  constructor(order?: OrderColumn[]) {
    this.init(order);
  }

  init(order?: OrderColumn[]): void {
    this._order = order || [];
  }

  add<K extends keyof T>(key: (K&string)|((K & string)[]), desc?: boolean): this {
    if (Array.isArray(key)) {
      if (desc) {
        key.forEach((k) => {
          this._order.push({property: k, desc: true});
        });
      } else {
        key.forEach((k) => {
          this._order.push({property: k});
        });
      }
    } else {
      if (desc) {
        this._order.push({property: key, desc: true});
      } else {
        this._order.push({property: key});
      }
    }
    return this;
  }
}

/*
 * filter builder
 */
export class FilterBuilder<T> {
  where: WhereBuilder<T>;
  columns: ColumnBuilder<T>;
  order: OrderBuilder<T>;
  limit?: number;
  offset?: number;

  get filter(): Filter {
    const newFilter: Filter = {};
    const w = this.where.where;
    const c = this.columns.columns;
    const o = this.order.order;
    if (w) {
      newFilter.where = w;
    }
    if (c) {
      newFilter.columns = c;
    }
    if (o) {
      newFilter.order = o;
    }
    if (this.limit || this.offset) {
      newFilter.limit = this.limit;
      newFilter.offset = this.offset;
    }
    return newFilter;
  }


  constructor(filter?: Filter) {
    this.where = new WhereBuilder<T>();
    this.columns = new ColumnBuilder<T>();
    this.order = new OrderBuilder<T>();
  }

  init(filter?: Filter): void {
    const f: Filter = filter || {};
    this.where.init(f.where);
    this.columns.init(f.columns);
    this.order.init(f.order);
    this.limit = undefined;
    this.offset = undefined;
  }
}
