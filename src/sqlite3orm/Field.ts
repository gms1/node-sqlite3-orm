import {FieldReference} from './FieldReference';
import {PropertyType} from './PropertyType';
import {quotedIdentifierName} from './utils';

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
    return quotedIdentifierName(this.name);
  }

  /**
   * The property key mapped to this field
   */
  propertyKey: string|symbol;
  /**
   * The property type mapped to this field
   */
  private _propertyType?: string;

  get propertyType(): string|undefined {
    return this._propertyType;
  }

  set propertyType(propertyType: string|undefined) {
    this._propertyType = propertyType;
    // tslint:disable: triple-equals
    if (this._propertyType == 'function Boolean() { [native code] }') {
      this._propertyKnownType = PropertyType.BOOLEAN;
    } else if (this._propertyType == 'function String() { [native code] }') {
      this._propertyKnownType = PropertyType.STRING;
    } else if (this._propertyType == 'function Number() { [native code] }') {
      this._propertyKnownType = PropertyType.NUMBER;
    } else if (this._propertyType == 'function Date() { [native code] }') {
      this._propertyKnownType = PropertyType.DATE;
    } else {
      this._propertyKnownType = PropertyType.UNKNOWN;
    }
    // tslint:enable: triple-equals
  }

  /**
   * The type of the table column
   */
  dbtype: string;
  /**
   * Flag if this field is part of the primary key
   */
  isIdentity: boolean;
  /**
   * Map of all the foreign key constraints this field participates
   */
  foreignKeys: Map<string, FieldReference>;

  /**
   * Set of all the indexes this field participates
   */
  indexKeys: Set<string>;

  /**
   * The property type enum mapped to this field
   */
  private _propertyKnownType: PropertyType;

  get propertyKnownType(): PropertyType {
    return this._propertyKnownType;
  }

  /**
   * If this property should be serialized/deserialized to the database as Json data
   */
  isJson: boolean;

  /**
   * Creates an instance of Field.
   *
   */
  public constructor(key: string|symbol) {
    this.propertyKey = key;
    this._propertyType = undefined;
    this._propertyKnownType = PropertyType.UNKNOWN;
    this.isIdentity = false;
    this.dbtype = 'TEXT';
    this.foreignKeys = new Map<string, FieldReference>();
    this.indexKeys = new Set<string>();
    this.isJson = false;
  }

  /**
   * Get the name for the corresponding host parameter
   *
   * @returns {string}
   */
  public getHostParameterName(): string {
    return ':' + this.name;
  }

  /**
   * Test if this field is part of the given foreign key constraint
   *
   * @param constraintName
   */
  public hasForeignKeyField(constraintName: string): boolean {
    return this.foreignKeys.has(constraintName);
  }

  /**
   * Get the field reference for the given foreign key constraint
   *
   * @param constraintName
   * @returns The referenced table and column
   */
  public getForeignKeyField(constraintName: string): FieldReference {
    return this.foreignKeys.get(constraintName) as FieldReference;
  }

  /**
   * Set this field to participate in a foreign key constraint
   *
   * @param constraintName - The constraint name
   * @param foreignTableField - The referenced table and column
   */
  public setForeignKeyField(constraintName: string, foreignTableField: FieldReference): void {
    this.foreignKeys.set(constraintName, foreignTableField);
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
   * @param indexName
   */
  public setIndexField(indexName: string): void {
    this.indexKeys.add(indexName);
  }
}
