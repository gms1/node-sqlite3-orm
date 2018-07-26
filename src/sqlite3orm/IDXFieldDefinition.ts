// import * as core from './core';

export class IDXFieldDefinition {
  readonly name: string;
  readonly isUnique?: boolean;
  constructor(name: string, isUnique?: boolean) {
    this.name = name;
    this.isUnique = isUnique;
  }
}
