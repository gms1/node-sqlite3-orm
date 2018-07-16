// import * as core from './core';

/**
 * class holding a foreign key field definition
 *
 * @class FKFieldDefinition
 */
export class FKFieldDefinition {
  readonly name: string;
  readonly foreignTableName: string;
  readonly foreignColumName: string;


  public constructor(name: string, foreignTableName: string, foreignColumName: string) {
    this.name = name;
    this.foreignTableName = foreignTableName;
    this.foreignColumName = foreignColumName;
  }
}
