import {Where} from './Where';

export type Columns<MT> = {
  [K in keyof MT]?: boolean;  // true: include, false: exclude
};

export type OrderColumns<MT> = {
  [K in keyof MT]?: boolean;  // true: ascending, false: descending
};

export interface Filter<MT> {
  select?: Columns<MT>;
  where?: Where<MT>;
  order?: OrderColumns<MT>;
  limit?: number;
  offset?: number;


  tableAlias?: string;
}

export function isFilter<MT>(whereOrFilter?: Where<MT>| Filter<MT>): whereOrFilter is Filter<MT> {
  return whereOrFilter &&
          ((whereOrFilter as Filter<MT>).select !== undefined || (whereOrFilter as Filter<MT>).where !== undefined ||
           (whereOrFilter as Filter<MT>).order !== undefined || (whereOrFilter as Filter<MT>).limit !== undefined ||
           (whereOrFilter as Filter<MT>).offset !== undefined ||
           (whereOrFilter as Filter<MT>).tableAlias !== undefined) ?
      true :
      false;
}
