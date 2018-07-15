// tslint:disable no-use-before-declare
import {Field} from './Field';
import {TableReference} from './TableReference';
import {quotedQualifiedIdentifierName, quotedUnqualifiedIdentifierName} from './utils';

const TABLEALIAS = 'T';

/**
 * Class holding a table definition (name of the table and fields in the table)
 *
 * @export
 * @class Table
 */
export class Table {
  /**
   * The table name (containing the schema name if specified)
   */
  name!: string;

  get quotedName(): string {
    return quotedQualifiedIdentifierName(this.name);
  }

  /**
   * The class name
   */
  className: string;

  /**
   * Flag to indicate if this table should be created with the 'WITHOUT
   * ROWID'-clause
   */
  withoutRowId: boolean;

  /**
   * Flag to indicate if AUTOINCREMENT should be enabled for a table having a
   * single-column INTEGER primary key
   * and withoutRowId is disabled
   */
  autoIncrement: boolean;

  /**
   * The fields defined for this table
   */
  fields: Field[] = [];

  /**
   * This contains the generated SQL-statements/fragments
   */
  private _statementsText?: SqlStatementText;

  private get statementsText(): SqlStatementText {
    if (!this._statementsText) {
      this._statementsText = this.generateStatementsText();
    }
    return this._statementsText;
  }

  /**
   * The field mapped to the primary key; only set if the
   * AUTOINCREMENT feature can be used
   */
  private _autoIncrementField: Field|undefined;

  get autoIncrementField(): Field|undefined {
    return this._autoIncrementField;
  }

  // map property keys to a field definition
  private mapPropToField: Map<string|symbol, Field>;

  // map column name to a field definition
  private mapNameToField: Map<string, Field>;

  // map column name to a identity field definition
  private mapNameToIdentityField: Map<string, Field>;

  // map constraint name to foreign table reference
  private mapNameToTableReference: Map<string, TableReference>;

  /**
   * Creates an instance of Table.
   *
   * @param className - The name or the class bound to this table definition
   */
  public constructor(className: string) {
    this.className = className;
    this.mapPropToField = new Map<string|symbol, Field>();
    this.mapNameToField = new Map<string, Field>();
    this.mapNameToIdentityField = new Map<string, Field>();
    this.mapNameToTableReference = new Map<string, TableReference>();
    this.fields = [];
    this.withoutRowId = false;
    this.autoIncrement = false;
    this._autoIncrementField = undefined;
    this._statementsText = undefined;
  }

  /**
   * Test if property has been mapped to a column of this table
   *
   * @param key - The property key
   */
  public hasPropertyField(key: string|symbol): boolean {
    return this.mapPropToField.has(key);
  }

  /**
   * Get the field definition for the mapped property key
   *
   * @param key - The property key
   * @returns The field definition
   */
  public getPropertyField(key: string|symbol): Field {
    const field = this.mapPropToField.get(key);
    if (!field) {
      throw new Error(`property '${key.toString()}' on class '${this.className}' not mapped to any field`);
    }
    return field;
  }

  /**
   * Add a property key mapped to field definition to this table
   *
   * @param key - The property key
   * @param field - The field definition
   */
  public addPropertyField(field: Field): void {
    if (this.mapPropToField.has(field.propertyKey)) {
      if (field !== this.mapPropToField.get(field.propertyKey)) {
        throw new Error(
            `property '${field.propertyKey.toString()}' on class '${this.className}' is mapped to multiple fields`);
      }
      return;
    }
    this.fields.push(field);
    this.mapPropToField.set(field.propertyKey, field);
  }

  /**
   * Test if table has a column with the given column name
   *
   * @param colName - The name of the column
   */
  public hasTableField(name: string): boolean {
    return this.mapNameToField.has(name);
  }

  /**
   * Get the field definition for the given column name
   *
   * @param colName - The name of the column
   * @returns The field definition
   */
  public getTableField(name: string): Field {
    const field = this.mapNameToField.get(name) as Field;
    if (!field) {
      throw new Error(`field '${name}' not registered yet`);
    }
    return field;
  }

  /**
   * Add a table field to this table
   *
   * @param colName - The name of the column
   * @returns The field definition
   */
  public addTableField(field: Field): Field {
    this._statementsText = undefined;
    if (!field.name) {
      throw new Error(`property '${field.propertyKey.toString()}' on class '${this.className}': field name missing`);
    }
    if (this.mapNameToField.has(field.name)) {
      const oldField = this.mapNameToField.get(field.name) as Field;
      if (field !== oldField) {
        throw new Error(
            `properties '${
                           field.propertyKey.toString()
                         }' and '${
                                   oldField.propertyKey.toString()
                                 }' on class '${this.className}' are mapped to the same column ${field.name}`);
      }
    }
    this.mapNameToField.set(field.name, field);
    if (field.isIdentity) {
      this.mapNameToIdentityField.set(field.name, field);

      if (this.autoIncrement && !this.withoutRowId && this.mapNameToIdentityField.size === 1 &&
          field.dbtype.toUpperCase().indexOf('INTEGER') !== -1) {
        this._autoIncrementField = field;
      } else {
        this._autoIncrementField = undefined;
      }
    }
    return field;
  }


  public hasTableReference(name: string): TableReference|undefined {
    return this.mapNameToTableReference.get(name);
  }

  public getTableReference(name: string): TableReference {
    const constraint = this.mapNameToTableReference.get(name);
    if (!constraint) {
      throw new Error(`foreign key constraint ${name} not registered yet`);
    }
    return constraint;
  }

  public addTableReference(constraint: TableReference): void {
    if (this.mapNameToTableReference.has(constraint.constraintName)) {
      throw new Error(`foreign key constraint ${constraint.constraintName} already registered`);
    }
    this.mapNameToTableReference.set(constraint.constraintName, constraint);
  }

  /**
   * Get 'CREATE TABLE'-statement using 'IF NOT EXISTS'-clause
   *
   * @returns The sql-statement
   */
  public getCreateTableStatement(): string {
    return this.statementsText.createTable;
  }

  /**
   * Get 'DROP TABLE'-statement
   *
   * @returns {string}
   */
  public getDropTableStatement(): string {
    return `DROP TABLE IF EXISTS ${this.quotedName}`;
  }

  /**
   * Get 'ALTER TABLE...ADD COLUMN'-statement for the given column
   *
   * @param colName - The name of the column to add to the table
   * @returns The sql-statment
   */
  public getAlterTableAddColumnStatement(colName: string): string {
    let stmt = `ALTER TABLE ${this.quotedName}`;

    const field = this.getTableField(colName);
    stmt += ` ADD COLUMN ${field.quotedName} ${field.dbtype}`;
    return stmt;
  }

  /**
   * Get 'CREATE [UNIQUE] INDEX'-statement using 'IF NOT EXISTS'-clause
   *
   * @returns The sql-statement
   */
  public getCreateIndexStatement(idxName: string, unique?: boolean): string {
    const stmtText = this.statementsText.indexKeys.get(idxName);
    if (!stmtText) {
      throw new Error(`index '${idxName}' is not defined on table '${this.name}'`);
    }
    const quotedIdxName = quotedQualifiedIdentifierName(idxName);
    const quotedTableName = quotedUnqualifiedIdentifierName(this.name);
    // tslint:disable-next-line: restrict-plus-operands
    return 'CREATE ' + (unique ? 'UNIQUE ' : ' ') + `INDEX IF NOT EXISTS ${quotedIdxName} ON ${quotedTableName} ` +
        stmtText;
  }

  /**
   * Get 'DROP TABLE'-statement
   *
   * @returns The sql-statement
   */
  public getDropIndexStatement(idxName: string): string {
    const stmtText = this.statementsText.indexKeys.get(idxName);
    if (!stmtText) {
      throw new Error(`index '${idxName}' is not defined on table '${this.name}'`);
    }
    const quotedIdxName = quotedQualifiedIdentifierName(idxName);
    return `DROP INDEX IF EXISTS ${quotedIdxName}`;
  }

  /**
   * Get 'INSERT INTO'-statement
   *
   * @returns The sql-statement
   */
  public getInsertIntoStatement(): string {
    return this.statementsText.insertInto;
  }

  /**
   * Get 'UPDATE SET'-statement
   * @deprecated use getUpdateByIdStatement instead
   *
   * @returns The sql-statement
   */
  public getUpdateSetStatement(): string {
    return this.statementsText.updateById;
  }

  /**
   * Get 'UPDATE BY PRIMARY KEY' statement
   *
   * @returns The sql-statement
   */
  public getUpdateByIdStatement(): string {
    return this.statementsText.updateById;
  }

  /**
   * Get 'DELETE FROM'-statement
   * @deprecated use getDeleteByIdStatement instead
   *
   * @returns The sql-statement
   */
  public getDeleteFromStatement(): string {
    return this.statementsText.deleteById;
  }

  /**
   * Get 'DELETE BY PRIMARY KEY'-statement
   *
   * @returns The sql-statement
   */
  public getDeleteByIdStatement(): string {
    return this.statementsText.deleteById;
  }

  /**
   * Get 'SELECT' all-statement
   *
   * @returns The sql-statement
   */
  public getSelectAllStatement(): string {
    return this.statementsText.selectAll;
  }

  /**
   * Get 'SELECT' one-statement
   * @deprecated use getSelectByIdStatement instead
   *
   * @returns The sql-statement
   */
  public getSelectOneStatement(): string {
    return this.statementsText.selectById;
  }

  /**
   * Get 'SELECT BY PRIMARY KEY'-statement
   *
   * @returns The sql-statement
   */
  public getSelectByIdStatement(): string {
    return this.statementsText.selectById;
  }

  /**
   * Get a select-condition for a foreign key constraint
   *
   * @param constraintName - The constraint name
   * @returns The partial where-clause
   */
  public getForeignKeySelects(constraintName: string): string|undefined {
    return this.statementsText.foreignKeySelects.get(constraintName);
  }

  /**
   * Get the reference fields for a foreign key constraint
   *
   * @param constraintName - The constraint name
   * @returns The fields holding the foreign key
   */
  public getForeignKeyFields(constraintName: string): Field[]|undefined {
    return this.statementsText.foreignKeyFields.get(constraintName);
  }

  /**
   * Generate SQL Statements
   *
   */
  private generateStatementsText(): SqlStatementText {
    const colNames: string[] = [];
    const colNamesPK: string[] = [];
    const colNamesNoPK: string[] = [];
    const colParms: string[] = [];
    const colParmsNoPK: string[] = [];
    const colSetsNoPK: string[] = [];
    const colSelPK: string[] = [];
    const colDefs: string[] = [];
    const stmts = new SqlStatementText();
    const foreignKeys = new Map<string, ForeignKeyHelper>();
    const indexKeys = new Map<string, string[]>();

    const quotedTableName = this.quotedName;

    if (!this.fields.length) {
      throw new Error(`table '${this.name}': does not have any fields defined`);
    }

    this.fields.forEach((field) => {
      const quotedFieldName = field.quotedName;
      let colDef = `${quotedFieldName} ${field.dbtype}`;
      const hostParmName = field.getHostParameterName();

      colNames.push(quotedFieldName);
      colParms.push(hostParmName);
      if (field.isIdentity) {
        colNamesPK.push(quotedFieldName);
        colSelPK.push(`${quotedFieldName}=${hostParmName}`);
        if (this.mapNameToIdentityField.size === 1) {
          colDef += ' PRIMARY KEY';
          if (!!this.autoIncrementField) {
            colDef += ' AUTOINCREMENT';
          }
        }
      } else {
        colNamesNoPK.push(quotedFieldName);
        colParmsNoPK.push(hostParmName);
        colSetsNoPK.push(`${quotedFieldName}=${hostParmName}`);
      }
      colDefs.push(colDef);
      field.foreignKeys.forEach((fieldRef, constraintName) => {
        let fk: ForeignKeyHelper = foreignKeys.get(constraintName) as ForeignKeyHelper;
        if (!fk) {
          const table = fieldRef.tableRef.table;
          if (!table) {
            throw new Error(
                `table '${
                          this.name
                        }': foreign key constraint '${
                                                      constraintName
                                                    }' references unknown tables: '${fieldRef.tableRef.tableName}'`);
          }
          fk = new ForeignKeyHelper(constraintName, fieldRef.tableRef);
          foreignKeys.set(constraintName, fk);
        }
        if (fieldRef.tableRef.tableName !== fk.tableRef.tableName) {
          // TODO: this error should be found earlier
          throw new Error(
              `table '${
                        this.name
                      }': foreign key constraint '${
                                                    constraintName
                                                  }' references different tables: '${
                                                                                     fieldRef.tableRef.tableName
                                                                                   }' vs '${fk.tableRef.tableName}'`);
        }
        fk.fields.push(field);
        fk.refColumns.push(fieldRef.colName);
      });
      field.indexKeys.forEach((indexName) => {
        let idx: string[] = indexKeys.get(indexName) as string[];
        if (!idx) {
          idx = [];
          indexKeys.set(indexName, idx);
        }
        idx.push(quotedFieldName);
      });
    });
    // --------------------------------------------------------------
    // generate CREATE TABLE statement
    stmts.createTable = `CREATE TABLE IF NOT EXISTS ${quotedTableName} (\n  `;

    // add column definitions
    stmts.createTable += colDefs.join(',\n  ');
    if (this.mapNameToIdentityField.size > 1) {
      // add multi-column primary key ćonstraint:
      stmts.createTable += ',\n  CONSTRAINT PRIMARY_KEY PRIMARY KEY (';
      stmts.createTable += colNamesPK.join(', ');
      stmts.createTable += ')';
    }

    // add foreign key constraint definition:
    let i = foreignKeys.size - 1;
    foreignKeys.forEach((fk, fkName) => {
      if (!fk.fields.length || !fk.refColumns.length || fk.fields.length !== fk.refColumns.length) {
        throw new Error(`table '${this.name}': foreign key constraint '${fkName}' definition is incomplete`);
      }
      stmts.createTable += `,\n  CONSTRAINT ${fk.tableRef.quotedConstraintName} FOREIGN KEY (`;
      stmts.createTable += fk.fields.map((field) => field.quotedName).join(', ');
      stmts.createTable += ')\n';

      // tslint:disable-next-line no-non-null-assertion
      stmts.createTable += `    REFERENCES ${fk.tableRef.table!.quotedName} (`;
      // tslint:disable-next-line: restrict-plus-operands
      stmts.createTable += fk.refColumns.join(', ') + ') ON DELETE CASCADE';  // TODO: hard-coded 'ON DELETE CASCADE'
      if (i--) {
        stmts.createTable += ',';
      }
      stmts.createTable += '\n';

    });
    stmts.createTable += '\n)';
    if (this.withoutRowId) {
      stmts.createTable += ' WITHOUT ROWID';
    }

    // --------------------------------------------------------------
    // generate INSERT INTO statement
    stmts.insertInto = `INSERT INTO ${quotedTableName} (\n  `;
    if (!this.autoIncrementField) {
      stmts.insertInto += colNames.join(', ');
    } else {
      stmts.insertInto += colNamesNoPK.join(', ');
    }
    stmts.insertInto += '\n) VALUES (\n  ';
    if (!this.autoIncrementField) {
      stmts.insertInto += colParms.join(', ');
    } else {
      stmts.insertInto += colParmsNoPK.join(', ');
    }
    stmts.insertInto += '\n)';

    // --------------------------------------------------------------
    // generate simple where clause for selecting via primary key
    let wherePrimaryKeyClause = '\nWHERE\n  ';
    wherePrimaryKeyClause += colSelPK.join(' AND ');

    // --------------------------------------------------------------
    // generate UPDATE SET statement
    stmts.updateById = `UPDATE ${quotedTableName} SET\n  `;
    stmts.updateById += colSetsNoPK.join(',\n  ');
    stmts.updateById += wherePrimaryKeyClause;

    // --------------------------------------------------------------
    // generate DELETE FROM statement
    stmts.deleteById = `DELETE FROM ${quotedTableName}\n  `;
    stmts.deleteById += wherePrimaryKeyClause;

    // --------------------------------------------------------------
    // generate SELECT-all statement
    const TABLEALIASPREFIX = TABLEALIAS.length ? TABLEALIAS + '.' : '';

    stmts.selectAll = 'SELECT\n  ';
    stmts.selectAll += `${TABLEALIASPREFIX}` + colNames.join(`, ${TABLEALIASPREFIX}`);
    stmts.selectAll += `\nFROM ${quotedTableName} ${TABLEALIAS} `;

    // --------------------------------------------------------------
    // generate SELECT-one statement
    stmts.selectById = stmts.selectAll;
    stmts.selectById += '\nWHERE\n  ';
    stmts.selectById += `${TABLEALIASPREFIX}` + colSelPK.join(` AND ${TABLEALIASPREFIX}`);

    // --------------------------------------------------------------
    // generate SELECT-fk condition
    foreignKeys.forEach((fk, constraintName) => {
      const selectCondition =
          fk.fields.map((field) => `${TABLEALIASPREFIX}${field.quotedName}=${field.getHostParameterName()}`)
              .join(' AND ');
      stmts.foreignKeySelects.set(constraintName, selectCondition);
      stmts.foreignKeyFields.set(constraintName, fk.fields);
    });

    indexKeys.forEach((cols, indexName) => {
      // tslint:disable-next-line: restrict-plus-operands
      const createIdxCols = `(` + cols.join(', ') + ')';
      stmts.indexKeys.set(indexName, createIdxCols);
    });

    return stmts;
  }
}

/**
 * helper class holding sql-statements/fragments
 *
 * @class SqlStatementText
 */
class SqlStatementText {
  createTable!: string;
  insertInto!: string;
  updateById!: string;
  deleteById!: string;
  selectAll!: string;
  selectById!: string;

  foreignKeySelects: Map<string, string>;
  foreignKeyFields: Map<string, Field[]>;
  indexKeys: Map<string, string>;

  public constructor() {
    this.foreignKeySelects = new Map<string, string>();
    this.foreignKeyFields = new Map<string, Field[]>();
    this.indexKeys = new Map<string, string>();
  }
}

/**
 * helper class holding a foreign key definition
 *
 * @class ForeignKeyHelper
 */
class ForeignKeyHelper {
  name: string;
  tableRef: TableReference;
  refColumns: string[] = [];
  fields: Field[] = [];

  public constructor(name: string, tableRef: TableReference) {
    this.name = name;
    this.tableRef = tableRef;
  }
}
