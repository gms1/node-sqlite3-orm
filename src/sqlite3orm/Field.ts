import {FieldReference} from './FieldReference';
import {PropertyType} from './PropertyType';

/**
 * Class holding a field definition
 *
 * @export
 * @class Field
 */
export class Field {
  /**
   * The name of the column
   *
   * @type {string}
   */
  public name: string;

  /**
   * The property key mapped to this field
   *
   * @type {(string|symbol)}
   */
  propertyKey: string|symbol;
  /**
   * The property type mapped to this field
   *
   * @type {string}
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
   *
   * @type {string}
   */
  dbtype: string;
  /**
   * Flag if this field is part of the primary key
   *
   * @type {boolean}
   */
  isIdentity: boolean;
  /**
   * Map of all the foreign key constraints this field participates
   *
   * @type {Map<string, FieldReference>}
   */
  foreignKeys: Map<string, FieldReference>;


  /**
   * Set of all the indexes this field participates
   *
   * @type {Set<string}
   */
  indexKeys: Set<string>;

  /**
   * The property type enum mapped to this field
   *
   * @type {PropertyType}
   */
  private _propertyKnownType: PropertyType;

  get propertyKnownType(): PropertyType {
    return this._propertyKnownType;
  }

  /**
   * If this property should be serialized/deserialized to the database as Json data
   *
   * @type {boolean}
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
   * @param {string} constraintName
   * @returns {boolean}
   */
  public hasForeignKeyField(constraintName: string): boolean {
    return this.foreignKeys.has(constraintName);
  }

  /**
   * Get the field reference for the given foreign key constraint
   *
   * @param {string} constraintName
   * @returns {FieldReference}
   */
  public getForeignKeyField(constraintName: string): FieldReference {
    return this.foreignKeys.get(constraintName) as FieldReference;
  }

  /**
   * Set this field to participate in a foreign key constraint
   *
   * @param {string} constraintName - The constraint name
   * @param {FieldReference} foreignTableField - The referenced table and column
   */
  public setForeignKeyField(
      constraintName: string, foreignTableField: FieldReference): void {
    this.foreignKeys.set(constraintName, foreignTableField);
  }


  /**
   * Test if this field is part of the given index
   *
   * @param {string} constraintName
   * @returns {boolean}
   */
  public isIndexField(indexName: string): boolean {
    return this.indexKeys.has(indexName);
  }

  /**
   * Test if this field is part of the given index
   *
   * @param {string} indexName
   * @returns {void}
   */
  public setIndexField(indexName: string): void {
    this.indexKeys.add(indexName);
  }


}
