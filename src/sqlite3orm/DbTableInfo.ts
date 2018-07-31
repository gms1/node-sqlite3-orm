export interface DbColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: any;
}

export interface DbIndexColumnInfo {
  name: string;
  desc: boolean;
  coll: string;  // collating sequence
  key: boolean;  // key (true) or auxiliary (false) column
}

export interface DbIndexInfo {
  name: string;
  unique: boolean;
  columns: DbIndexColumnInfo[];
  partial: boolean;
}

export interface DbForeignKeyInfo {
  columns: string[];
  refTable: string;
  refColumns: string[];
}

export interface DbTableInfo {
  name: string;
  columns: {[key: string]: DbColumnInfo};
  primaryKey: string[];
  indexes: {[key: string]: DbIndexInfo};
  foreignKeys: {[key: string]: DbForeignKeyInfo};
}
