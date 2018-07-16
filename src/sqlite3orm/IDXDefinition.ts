// import * as core from './core';

import {Field} from './Field';

export class IDXDefinition {
  readonly name: string;
  readonly isUnique?: boolean;
  readonly fields: Field[];

  constructor(name: string, isUnique?: boolean) {
    this.name = name;
    this.isUnique = isUnique;
    this.fields = [];
  }
}
