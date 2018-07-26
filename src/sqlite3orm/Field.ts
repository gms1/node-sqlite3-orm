// import * as core from './core';

import {quoteSimpleIdentifier} from './utils';
import {FKFieldDefinition} from './FKFieldDefinition';
import {IDXFieldDefinition} from './IDXFieldDefinition';

/**
 * Class holding a field definition
 *
 * @export
 * @class Field
 */
export class Field {
  /**
   * The name of the column
   */
  public name!: string;

  /**
   * The quoted field name
   */
  get quotedName(): string {
    return quoteSimpleIdentifier(this.name);
  }

  /**
   * The type of the table column
   */
  private _dbtype?: string;

  get dbtype(): string {
    // tslint:disable-next-line triple-equals
    return this._dbtype == undefined ? 'TEXT' : this._dbtype;
  }
  set dbtype(dbType: string) {
    this._dbtype = dbType;
  }
  get isDbTypeDefined(): boolean {
    // tslint:disable-next-line triple-equals
    return this._dbtype == undefined ? false : true;
  }

  /**
   * If this property should be serialized/deserialized to the database as Json data
   */
  private _isJson?: boolean;

  get isJson(): boolean {
    // tslint:disable-next-line triple-equals
    if (this._isJson == undefined) {
      return false;
    }
    return this._isJson;
  }
  set isJson(isJson: boolean) {
    this._isJson = isJson;
  }
  get isIsJsonDefined(): boolean {
    // tslint:disable-next-line triple-equals
    return this._isJson == undefined ? false : true;
  }


  /**
   * Flag if this field is part of the primary key
   */
  isIdentity: boolean;
  /**
   * Map of all the foreign key constraint names this field participates
   */
  foreignKeys: Map<string, FKFieldDefinition>;

  /**
   * Map of all the indexes this field participates
   */
  indexKeys: Map<string, IDXFieldDefinition>;


  /**
   * Creates an instance of Field.
   *
   */
  public constructor(name?: string) {
    if (name) {
      this.name = name;
    }
    this.isIdentity = false;
    this.foreignKeys = new Map<string, FKFieldDefinition>();
    this.indexKeys = new Map<string, IDXFieldDefinition>();
  }


  /**
   * Test if this field is part of the given foreign key constraint
   *
   * @param constraintName
   */
  public isFKField(constraintName: string): boolean {
    return this.foreignKeys.has(constraintName);
  }

  /**
   * Set this field to participate in a foreign key constraint
   *
   * @param constraintName - The constraint name
   */
  public setFKField(foreignKeyField: FKFieldDefinition): void {
    this.foreignKeys.set(foreignKeyField.name, foreignKeyField);
  }

  /**
   * Test if this field is part of the given index
   *
   * @param indexName
   */
  public isIndexField(indexName: string): boolean {
    return this.indexKeys.has(indexName);
  }

  /**
   * Set this field as part of the given index
   *
   * @param indexField
   */
  public setIndexField(indexField: IDXFieldDefinition): void {
    this.indexKeys.set(indexField.name, indexField);
  }
}
