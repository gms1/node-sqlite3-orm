// import * as core from './core';

/**
 * class holding a foreign key definition
 *
 * @class FKDefinition
 */

export interface FKFieldDefinition {
  name: string;
  foreignColumnName: string;
}

export class FKDefinition {
  readonly name: string;
  readonly foreignTableName: string;
  readonly fields: FKFieldDefinition[];

  get id(): string {
    return FKDefinition.genericForeignKeyId(
        this.fields.map((field) => field.name), this.foreignTableName,
        this.fields.map((field) => field.foreignColumnName));
  }

  public constructor(name: string, foreignTableName: string) {
    this.name = name;
    this.foreignTableName = foreignTableName;
    this.fields = [];
  }

  static genericForeignKeyId(fromCols: string[], toTable: string, toCols: string[]): string {
    let res = '(';
    res += fromCols.join(',');
    res += `) => ${toTable}(`;
    res += toCols.join(',');
    res += ')';
    return res;
  }
}
