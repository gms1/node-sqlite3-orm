import {TableReference} from './TableReference';

/**
 * Class holding a field reference ( table and column name )
 *
 * @export
 * @class FieldReference
 */
export class FieldReference {
  /**
   * A table name
   */
  tableRef: TableReference;
  /**
   * A column name
   */
  colName: string;

  /**
   * Creates an instance of FieldReference.
   *
   * @param {TableReference} constraint
   * @param {string} colName
   */
  public constructor(tableRef: TableReference, colName: string) {
    this.tableRef = tableRef;
    this.colName = colName;
  }
}
