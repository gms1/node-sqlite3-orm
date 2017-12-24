// tslint:disable no-use-before-declare
import {Field} from './Field';

const TABLEALIAS = 'T';

/**
 * Class holding a table definition (name of the table and fields in the table)
 *
 * @export
 * @class Table
 */
export class Table {
  /**
   * The table name
   *
   * @type {string}
   */
  name: string;

  /**
   * The class name
   *
   * @type {string}
   */
  className: string;

  /**
   * Flag to indicate if this table should be created with the 'WITHOUT
   * ROWID'-clause
   *
   * @type {boolean}
   */
  withoutRowId: boolean;

  /**
   * Flag to indicate if AUTOINCREMENT should be enabled for a table having a
   * single-column INTEGER primary key
   * and withoutRowId is disabled
   *
   * @type {boolean}
   */
  autoIncrement: boolean;

  /**
   * The fields defined for this table
   *
   * @type {Field[]}
   */
  fields: Field[] = [];

  /**
   * This contains the generated SQL-statements/fragments
   *
   * @type {SqlStatementText}
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
   *
   * @type {string|symbol}
   */
  private _autoIncrementField: Field|undefined;

  get autoIncrementField(): Field|undefined { return this._autoIncrementField; }

  // map property keys to a field definition
  private mapPropToField: Map<string|symbol, Field>;

  // map column name to a field definition
  private mapNameToField: Map<string, Field>;

  // map column name to a field definition
  private mapNameToIdentityField: Map<string, Field>;

  /**
   * Creates an instance of Table.
   *
   * @param {string} className
   */
  public constructor(className: string) {
    this.className = className;
    this.mapPropToField = new Map<string|symbol, Field>();
    this.mapNameToField = new Map<string, Field>();
    this.mapNameToIdentityField = new Map<string, Field>();
    this.fields = [];
    this.withoutRowId = false;
    this.autoIncrement = false;
    this._autoIncrementField = undefined;
    this._statementsText = undefined;
  }

  /**
   * Test if property has been mapped to a column of this table
   *
   * @param {(string|symbol)} key - The property key
   * @returns {boolean}
   */
  public hasPropertyField(key: string|symbol): boolean { return this.mapPropToField.has(key); }

  /**
   * Get the field definition for the mapped property key
   *
   * @param {(string|symbol)} key - The property key
   * @returns {Field}
   */
  public getPropertyField(key: string|symbol): Field {
    if (!this.mapPropToField.has(key)) {
      throw new Error(`property '${key.toString()}' on class '${this.className}' not mapped to any field`);
    }
    return this.mapPropToField.get(key) as Field;
  }

  /**
   * Add a property key mapped to field definition to this table
   *
   * @param {(string|symbol)} key - The property key
   * @param {Field} field
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
   * @param {string} colName - The name of the column
   * @returns {boolean}
   */
  public hasTableField(name: string): boolean { return this.mapNameToField.has(name); }

  /**
   * Get the field definition for the given column name
   *
   * @param {string} colName - The name of the column
   * @returns {Field}
   */
  public getTableField(name: string): Field {
    if (!this.mapNameToField.has(name)) {
      throw new Error(`field '${name}' not registered yet`);
    }
    return this.mapNameToField.get(name) as Field;
  }

  /**
   * Add a table field to this table
   *
   * @param {string} colName - The name of the column
   * @returns {Field}
   */
  public addTableField(field: Field): Field {
    this._statementsText = undefined;
    if (this.mapNameToField.has(field.name)) {
      let oldField = this.mapNameToField.get(field.name) as Field;
      if (field !== oldField) {
        throw new Error(
            `properties '${field.propertyKey.toString()}' and '${oldField.propertyKey.toString()}' on class '${this.className}' are mapped to the same column ${field.name}`);
      }
    }
    if (!field.name) {
      throw new Error(`property '${field.propertyKey.toString()}' on class '${this.className}': field name missing`);
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

  /**
   * Get 'CREATE TABLE'-statement using 'IF NOT EXISTS'-clause
   *
   * @returns {string}
   */
  public getCreateTableStatement(): string { return this.statementsText.createTable; }

  /**
   * Get 'DROP TABLE'-statement
   *
   * @returns {string}
   */
  public getDropTableStatement(): string { return `DROP TABLE IF EXISTS ${this.name}`; }

  /**
   * Get 'ALTER TABLE...ADD COLUMN'-statement for the given column
   *
   * @param {string} colName - The name of the column to add to the table
   * @returns {string}
   */
  public getAlterTableAddColumnStatement(colName: string): string {
    let stmt = `ALTER TABLE ${this.name}`;

    let field = this.getTableField(colName);
    stmt += ` ADD COLUMN ${field.name} ${field.dbtype}`;
    return stmt;
  }

  /**
   * Get 'CREATE TABLE'-statement using 'IF NOT EXISTS'-clause
   *
   * @returns {string}
   */
  public getCreateIndexStatement(idxName: string, unique?: boolean): string {
    let stmtText = this.statementsText.indexKeys.get(idxName);
    if (!stmtText) {
      throw new Error(`index '${idxName}' is not defined on table '${this.name}'`);
    }
    // tslint:disable-next-line: restrict-plus-operands
    return 'CREATE ' + (unique ? 'UNIQUE ' : '') + stmtText;
  }

  /**
   * Get 'DROP TABLE'-statement
   *
   * @returns {string}
   */
  public getDropIndexStatement(idxName: string): string {
    let stmtText = this.statementsText.indexKeys.get(idxName);
    if (!stmtText) {
      throw new Error(`index '${idxName}' is defined on table '${this.name}'`);
    }
    return `DROP INDEX IF EXISTS ${idxName}`;
  }

  /**
   * Get 'INSERT INTO'-statement
   *
   * @returns {string}
   */
  public getInsertIntoStatement(): string { return this.statementsText.insertInto; }

  /**
   * Get 'UPDATE SET'-statement
   * @deprecated use getUpdateByIdStatement instead
   *
   * @returns {string}
   */
  public getUpdateSetStatement(): string { return this.statementsText.updateById; }

  /**
   * Get 'UPDATE BY PRIMARY KEY' statement
   *
   * @returns {string}
   */
  public getUpdateByIdStatement(): string { return this.statementsText.updateById; }

  /**
   * Get 'DELETE FROM'-statement
   * @deprecated use getDeleteByIdStatement instead
   *
   * @returns {string}
   */
  public getDeleteFromStatement(): string { return this.statementsText.deleteById; }

  /**
   * Get 'DELETE BY PRIMARY KE'-statement
   *
   * @returns {string}
   */
  public getDeleteByIdStatement(): string { return this.statementsText.deleteById; }

  /**
   * Get 'SELECT' all-statement
   *
   * @returns {string}
   */
  public getSelectAllStatement(): string { return this.statementsText.selectAll; }

  /**
   * Get 'SELECT' one-statement
   * @deprecated use getSelectByIdStatement instead
   *
   * @returns {string}
   */
  public getSelectOneStatement(): string { return this.statementsText.selectById; }

  /**
   * Get 'SELECT BY PRIMARY KEY'-statement
   *
   * @returns {string}
   */
  public getSelectByIdStatement(): string { return this.statementsText.selectById; }

  /**
   * Get a select-condition for a foreign key constraint
   *
   * @param {string} constraintName - The constraint name
   * @returns {string}
   */
  public getForeignKeySelects(constraintName: string): string|undefined {
    return this.statementsText.foreignKeySelects.get(constraintName);
  }

  /**
   * Get the reference fields for a foreign key constraint
   *
   * @param {string} constraintName - The constraint name
   * @returns {string}
   */
  public getForeignKeyFields(constraintName: string): Field[]|undefined {
    return this.statementsText.foreignKeyFields.get(constraintName);
  }

  /**
   * Generate SQL Statements
   *
   */
  private generateStatementsText(): SqlStatementText {
    let colNames: string[] = [];
    let colNamesPK: string[] = [];
    let colNamesNoPK: string[] = [];
    let colParms: string[] = [];
    let colParmsNoPK: string[] = [];
    let colSetsNoPK: string[] = [];
    let colSelPK: string[] = [];
    let colDefs: string[] = [];
    let stmts = new SqlStatementText();
    let foreignKeys = new Map<string, ForeignKeyHelper>();
    let indexKeys = new Map<string, string[]>();

    if (!this.fields.length) {
      throw new Error(`table '${this.name}': does not have any fields defined`);
    }

    this.fields.forEach((field) => {
      let colDef = `${field.name} ${field.dbtype}`;
      let hostParmName = field.getHostParameterName();

      colNames.push(field.name);
      colParms.push(hostParmName);
      if (field.isIdentity) {
        colNamesPK.push(field.name);
        colSelPK.push(`${field.name}=${hostParmName}`);
        if (this.mapNameToIdentityField.size === 1) {
          colDef += ' PRIMARY KEY';
          if (!!this.autoIncrementField) {
            colDef += ' AUTOINCREMENT';
          }
        }
      } else {
        colNamesNoPK.push(field.name);
        colParmsNoPK.push(hostParmName);
        colSetsNoPK.push(`${field.name}=${hostParmName}`);
      }
      colDefs.push(colDef);
      field.foreignKeys.forEach((refColumn, constraintName) => {
        let fk: ForeignKeyHelper = foreignKeys.get(constraintName) as ForeignKeyHelper;
        if (!fk) {
          fk = new ForeignKeyHelper(constraintName, refColumn.tableName);
          foreignKeys.set(constraintName, fk);
        }
        if (refColumn.tableName !== fk.refTableName) {
          // TODO: this error should be found earlier
          throw new Error(
              `table '${this.name}': foreign key constraint '${constraintName}' references different tables: '${refColumn.tableName}' vs '${fk.refTableName}'`);
        }
        fk.fields.push(field);
        fk.refColumns.push(refColumn.colName);
      });
      field.indexKeys.forEach((indexName) => {
        let idx: string[] = indexKeys.get(indexName) as string[];
        if (!idx) {
          idx = [];
          indexKeys.set(indexName, idx);
        }
        idx.push(field.name);
      });
    });
    // --------------------------------------------------------------
    // generate CREATE TABLE statement
    stmts.createTable = `CREATE TABLE IF NOT EXISTS ${this.name} (\n  `;

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
      stmts.createTable += `,\n  CONSTRAINT ${fkName} FOREIGN KEY (`;
      stmts.createTable += fk.fields.map((field) => field.name).join(', ');
      stmts.createTable += ')\n';

      stmts.createTable += `    REFERENCES ${fk.refTableName} (`;
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
    stmts.insertInto = `INSERT INTO ${this.name} (\n  `;
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
    stmts.updateById = `UPDATE ${this.name} SET\n  `;
    stmts.updateById += colSetsNoPK.join(',\n  ');
    stmts.updateById += wherePrimaryKeyClause;

    // --------------------------------------------------------------
    // generate DELETE FROM statement
    stmts.deleteById = `DELETE FROM ${this.name}\n  `;
    stmts.deleteById += wherePrimaryKeyClause;

    // --------------------------------------------------------------
    // generate SELECT-all statement
    const TABLEALIASPREFIX = TABLEALIAS.length ? TABLEALIAS + '.' : '';

    stmts.selectAll = 'SELECT\n  ';
    stmts.selectAll += `${TABLEALIASPREFIX}` + colNames.join(`, ${TABLEALIASPREFIX}`);
    stmts.selectAll += `\nFROM ${this.name} ${TABLEALIAS} `;

    // --------------------------------------------------------------
    // generate SELECT-one statement
    stmts.selectById = stmts.selectAll;
    stmts.selectById += '\nWHERE\n  ';
    stmts.selectById += `${TABLEALIASPREFIX}` + colSelPK.join(` AND ${TABLEALIASPREFIX}`);

    // --------------------------------------------------------------
    // generate SELECT-fk condition
    foreignKeys.forEach((fk, constraintName) => {
      let selectCondition =
          fk.fields.map((field) => `${TABLEALIASPREFIX}${field.name}=${field.getHostParameterName()}`).join(' AND ');
      stmts.foreignKeySelects.set(constraintName, selectCondition);
      stmts.foreignKeyFields.set(constraintName, fk.fields);
    });

    indexKeys.forEach((cols, indexName) => {
      // tslint:disable-next-line: restrict-plus-operands
      let createIdxCols = `INDEX IF NOT EXISTS ${indexName} ON ${this.name} (` + cols.join(', ') + ')';
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
  createTable: string;
  insertInto: string;
  updateById: string;
  deleteById: string;
  selectAll: string;
  selectById: string;

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
  refTableName: string;
  refColumns: string[] = [];
  fields: Field[] = [];

  public constructor(name: string, refTableName: string) {
    this.name = name;
    this.refTableName = refTableName;
  }
}
