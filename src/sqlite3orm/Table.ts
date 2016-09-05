import {Field, FieldReference} from './Field';

const TABLEALIAS = 'T';


/**
 * Class with the foreign key definition
 *
 * @export
 * @class Table
 */
export class ForeignKey {
  name: string;
  refTableName: string;
  refColumns: Array<string>;
  fields: Array<Field>;
  selectCondition: string;

  public constructor(name: string, refTableName: string) {
    this.name = name;
    this.refTableName = refTableName;
    this.refColumns = new Array<string>();
    this.fields = new Array<Field>();
  }
}

/**
 * Class with the sql statements
 *
 * @export
 * @class Table
 */
export class SqlStatementText {
  createTable: string;
  dropTable: string;
  alterTable: string;
  insertInto: string;
  updateSet: string;
  deleteFrom: string;
  selectAll: string;
  selectOne: string;
  foreignKeys: Map<string, ForeignKey>;

  public constructor() {
    this.foreignKeys = new Map<string, ForeignKey>();
  }
}

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
   * @type {Array<Field>}
   */
  fields: Array<Field>;


  /**
   * This contains the generated SQL-statements/fragments
   *
   * @type {SqlStatementText}
   */
  private _statementsText?: SqlStatementText;

  get statementsText(): SqlStatementText {
    if (!this._statementsText) {
      this.generateStatementsText();
    }
    return this._statementsText as SqlStatementText;
  }


  /**
   * The field mapped to the primary key; only set if the
   * AUTOINCREMENT feature can be used
   *
   * @type {string|symbol}
   */
  private _autoIncrementField: Field|undefined;

  get autoIncrementField(): Field|undefined {
    return this._autoIncrementField;
  }


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
    this.fields = new Array<Field>();
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
  public hasPropertyField(key: string|symbol): boolean {
    return this.mapPropToField.has(key);
  }

  /**
   * Get the field definition for the mapped property key
   *
   * @param {(string|symbol)} key - The property key
   * @returns {Field}
   */
  public getPropertyField(key: string|symbol): Field {
    if (!this.mapPropToField.has(key)) {
      throw new Error(
          `property '${key.toString()}' on class '${this.className}' not mapped to any field`);
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
  public hasTableField(name: string): boolean {
    return this.mapNameToField.has(name);
  }

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
      throw new Error(
          `property '${field.propertyKey.toString()}' on class '${this.className}': field name missing`);
    }
    this.mapNameToField.set(field.name, field);
    if (field.isIdentity) {
      this.mapNameToIdentityField.set(field.name, field);

      if (this.autoIncrement && !this.withoutRowId &&
          this.mapNameToIdentityField.size === 1 &&
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
  public getCreateTableStatement(): string {
    return this.statementsText.createTable;
  }

  /**
   * Get 'DROP TABLE'-statement
   *
   * @returns {string}
   */
  public getDropTableStatement(): string {
    return this.statementsText.dropTable;
  }

  /**
   * Get 'ALTER TABLE...ADD COLUMN'-statement for the given column
   *
   * @param {string} colName - The name of the column to add to the table
   * @returns {string}
   */
  public getAlterTableAddColumnStatement(colName: string): string {
    let stmt = this.statementsText.alterTable;

    let field = this.getTableField(colName);
    stmt += ` ADD COLUMN ${field.name} ${field.dbtype}`;
    return stmt;
  }


  /**
   * Get 'INSERT INTO'-statement
   *
   * @returns {string}
   */
  public getInsertIntoStatement(): string {
    return this.statementsText.insertInto;
  }

  /**
   * Get 'UPDATE SET'-statement
   *
   * @returns {string}
   */
  public getUpdateSetStatement(): string {
    return this.statementsText.updateSet;
  }

  /**
   * Get 'DELETE FROM'-statement
   *
   * @returns {string}
   */
  public getDeleteFromStatement(): string {
    return this.statementsText.deleteFrom;
  }

  /**
   * Get 'SELECT' all-statement
   *
   * @returns {string}
   */
  public getSelectAllStatement(): string {
    return this.statementsText.selectAll;
  }

  /**
   * Get 'SELECT' one-statement
   *
   * @returns {string}
   */
  public getSelectOneStatement(): string {
    return this.statementsText.selectOne;
  }

  /**
   * Generate SQL Statements
   *
   */
  private generateStatementsText(): void {
    let colNames = new Array<string>();
    let colNamesPK = new Array<string>();
    let colNamesNoPK = new Array<string>();
    let colParms = new Array<string>();
    let colParmsNoPK = new Array<string>();
    let colSetsNoPK = new Array<string>();
    let colSelPK = new Array<string>();
    let colDefs = new Array<string>();
    let stmts = new SqlStatementText();

    if (!this.fields.length) {
      throw new Error(`table '${this.name}': does not have any fields defined`);
    }

    this.fields.forEach((field) => {
      let colDef = `${field.name} ${field.dbtype}`;

      colNames.push(field.name);
      colParms.push(field.hostParameterName);
      if (field.isIdentity) {
        colNamesPK.push(field.name);
        colSelPK.push(`${field.name}=${field.hostParameterName}`);
        if (this.mapNameToIdentityField.size === 1) {
          colDef += ' PRIMARY KEY';
          if (!!this.autoIncrementField) {
            colDef += ' AUTOINCREMENT';
          }
        }
      } else {
        colNamesNoPK.push(field.name);
        colParmsNoPK.push(field.hostParameterName);
        colSetsNoPK.push(`${field.name}=${field.hostParameterName}`);
      }
      colDefs.push(colDef);
      field.foreignKeys.forEach((refColumn, constraintName) => {
        let fk: ForeignKey;
        if (!stmts.foreignKeys.has(constraintName)) {
          fk = new ForeignKey(constraintName, refColumn.tableName);
          stmts.foreignKeys.set(constraintName, fk);
        } else {
          fk = stmts.foreignKeys.get(constraintName) as ForeignKey;
        }
        if (refColumn.tableName !== fk.refTableName) {
          throw new Error(
              `table '${this.name}': foreign key constraint '${constraintName}' references different tables: '${refColumn.tableName}' vs '${fk.refTableName}'`);
        }
        fk.fields.push(field);
        fk.refColumns.push(refColumn.colName);
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
    let i = stmts.foreignKeys.size - 1;
    stmts.foreignKeys.forEach((fk, fkName) => {
      if (!fk.fields.length || !fk.refColumns.length ||
          fk.fields.length !== fk.refColumns.length) {
        throw new Error(
            `table '${this.name}': foreign key constraint '${fkName}' definition is incomplete`);
      }
      stmts.createTable += `,\n  CONSTRAINT ${fkName} FOREIGN KEY (`;
      stmts.createTable += fk.fields.map((field) => field.name).join(', ');
      stmts.createTable += ')\n';

      stmts.createTable += `    REFERENCES ${fk.refTableName} (`;
      stmts.createTable += fk.refColumns.join(', ') +
          ') ON DELETE CASCADE';  // TODO: hard-coded 'ON DELETE CASCADE'
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
    // generate DROP TABLE statement
    stmts.dropTable = `DROP TABLE IF EXISTS ${this.name}`;

    // --------------------------------------------------------------
    // generate ALTER TABLE statement
    stmts.alterTable = `ALTER TABLE ${this.name}`;

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
    // generate UPDATE SET statement
    stmts.updateSet = `UPDATE ${this.name} SET\n  `;
    stmts.updateSet += colSetsNoPK.join(',\n  ');
    stmts.updateSet += '\nWHERE\n  ';
    stmts.updateSet += colSelPK.join(' AND ');

    // --------------------------------------------------------------
    // generate DELETE FROM statement
    stmts.deleteFrom = `DELETE FROM ${this.name} WHERE\n  `;
    stmts.deleteFrom += colSelPK.join(' AND ');

    // --------------------------------------------------------------
    // generate SELECT-all statement

    const TABLEALIASPREFIX = TABLEALIAS.length ? TABLEALIAS + '.' : '';

    stmts.selectAll = 'SELECT\n  ';
    stmts.selectAll += `${TABLEALIASPREFIX}` + colNames.join(`, ${TABLEALIASPREFIX}`);
    stmts.selectAll += `\nFROM ${this.name} ${TABLEALIAS} `;

    // --------------------------------------------------------------
    // generate SELECT-one statement
    stmts.selectOne = stmts.selectAll;
    stmts.selectOne += '\nWHERE\n  ';
    stmts.selectOne += `${TABLEALIASPREFIX}` + colSelPK.join(` AND ${TABLEALIASPREFIX}`);

    // --------------------------------------------------------------
    // generate SELECT-fk condition
    stmts.foreignKeys.forEach((fk, constraintName) => {
      fk.selectCondition =
          fk.fields.map((field) => `${TABLEALIASPREFIX}${field.name}=${field.hostParameterName}`)
              .join(' AND ');
    });


    this._statementsText = stmts;
  }
}
