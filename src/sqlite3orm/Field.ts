import {Table} from './Table';

/**
 * Class holding a field reference ( table and column name )
 *
 * @export
 * @class FieldReference
 */
export class FieldReference {
  /**
   * A table name
   *
   * @type {string}
   */
  tableName: string;
  /**
   * A column name
   *
   * @type {string}
   */
  colName: string;

  /**
   * Creates an instance of FieldReference.
   *
   * @param {string} tableName
   * @param {string} colName
   */
  public constructor(tableName: string, colName: string) {
    this.tableName = tableName;
    this.colName = colName;
  }
}

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
  private _name: string;

  get name(): string {
    return this._name;
  }
  set name(value: string) {
    this._name = value;
    this._hostParameterName = ':' + value;
  }
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
  propertyType?: string;
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


  private _hostParameterName: string;

  get hostParameterName(): string {
    return this._hostParameterName;
  }

  /**
   * Creates an instance of Field.
   *
   */
  public constructor(key: string|symbol) {
    this.propertyKey = key;
    this.propertyType = undefined;
    this.isIdentity = false;
    this.dbtype = 'TEXT';
    this.foreignKeys = new Map<string, FieldReference>();
  }

  public hasForeignKeyConstraint(constraintName: string): boolean {
    return this.foreignKeys.has(constraintName);
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

}
