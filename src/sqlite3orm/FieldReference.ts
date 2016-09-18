
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
