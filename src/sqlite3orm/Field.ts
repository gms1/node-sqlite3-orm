
import {backtickQuoteSimpleIdentifier} from './utils';
import {FKFieldDefinition} from './FKFieldDefinition';
import {IDXFieldDefinition} from './IDXFieldDefinition';
import {DbColumnTypeInfo} from './DbTableInfo';

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
    return backtickQuoteSimpleIdentifier(this.name);
  }

  private _dbDefaultType?: string;
  get dbDefaultType(): string {
    return this._dbDefaultType ? this._dbDefaultType : 'TEXT';
  }
  set dbDefaultType(dbType: string) {
    this._dbDefaultType = dbType;
  }

  /**
   * The type of the table column
   */
  private _dbtype?: string;

  get dbtype(): string {
    return this._dbtype ? this._dbtype : this.dbDefaultType;
  }
  set dbtype(dbType: string) {
    this._dbtype = dbType;
  }
  get isDbTypeDefined(): boolean {
    return this._dbtype ? true : false;
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
