// import * as core from './core';

// tslint:disable interface-name
export interface IDXFieldDefinition { name: string; }

export class IDXDefinition {
  readonly name: string;
  isUnique?: boolean;
  readonly fields: IDXFieldDefinition[];

  get id(): string {
    return IDXDefinition.genericIndexId(this.name, this.fields.map((field) => field.name), this.isUnique);
  }

  constructor(name: string, isUnique?: boolean) {
    this.name = name;
    this.isUnique = isUnique;
    this.fields = [];
  }

  static genericIndexId(name: string, fields: string[], isUnique?: boolean): string {
    let res = name;
    res += !!isUnique ? ' unique (' : '(';
    res += fields.join(',');
    res += ')';
    return res;
  }
}
