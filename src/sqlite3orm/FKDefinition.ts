// import * as core from './core';

import {Field} from './Field';
/**
 * class holding a foreign key definition
 *
 * @class FKDefinition
 */
export class FKDefinition {
  readonly name: string;
  readonly foreignTableName: string;
  readonly foreignColumNames: string[];

  readonly fields: Field[];

  public constructor(name: string, foreignTableName: string) {
    this.name = name;
    this.foreignTableName = foreignTableName;
    this.foreignColumNames = [];
    this.fields = [];
  }
}
