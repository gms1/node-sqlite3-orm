// import * as core from './core';

// tslint:disable no-use-before-declare
import {Field} from './Field';
import {FKDefinition} from './FKDefinition';
import {IDXDefinition} from './IDXDefinition';
import {
  quoteIdentifier,
  quoteAndUnqualiyIdentifier,
  quoteSimpleIdentifier,
  qualifiyIdentifier,
  splitIdentifiers
} from './utils';
import {MetaModel} from './MetaModel';

/**
 * Class holding a table definition (name of the table and fields in the table)
 *
 * @export
 * @class Table
 */
export class Table {
  get quotedName(): string {
    return quoteIdentifier(this.name);
  }

  get schemaName(): string|undefined {
    return splitIdentifiers(this.name).identSchema;
  }

  /**
   * Flag to indicate if this table should be created with the 'WITHOUT
   * ROWID'-clause
   */
  private _withoutRowId?: boolean;

  get withoutRowId(): boolean {
    // tslint:disable-next-line triple-equals
    return this._withoutRowId == undefined ? false : this._withoutRowId;
  }
  set withoutRowId(withoutRowId: boolean) {
    this._withoutRowId = withoutRowId;
  }
  get isWithoutRowIdDefined(): boolean {
    // tslint:disable-next-line triple-equals
    return this._withoutRowId == undefined ? false : true;
  }

  /**
   * Flag to indicate if AUTOINCREMENT should be enabled for a table having a
   * single-column INTEGER primary key
   * and withoutRowId is disabled
   */
  private _autoIncrement?: boolean;

  get autoIncrement(): boolean {
    // tslint:disable-next-line triple-equals
    return this._autoIncrement == undefined ? false : this._autoIncrement;
  }
  set autoIncrement(autoIncrement: boolean) {
    this._autoIncrement = autoIncrement;
  }
  get isAutoIncrementDefined(): boolean {
    // tslint:disable-next-line triple-equals
    return this._autoIncrement == undefined ? false : true;
  }

  /**
   * The fields defined for this table
   */
  fields: Field[] = [];

  /**
   * The field mapped to the primary key; only set if the
   * AUTOINCREMENT feature can be used
   */
  private _autoIncrementField: Field|undefined;

  get autoIncrementField(): Field|undefined {
    return this._autoIncrementField;
  }

  // map column name to a field definition
  private mapNameToField: Map<string, Field>;

  // map column name to a identity field definition
  private mapNameToIdentityField: Map<string, Field>;

  // map constraint name to foreign key definition
  public readonly mapNameToFKDef: Map<string, FKDefinition>;

  // map index name to index key definition
  private mapNameToIDXDef: Map<string, IDXDefinition>;


  public models: Set<MetaModel>;


  /**
   * Creates an instance of Table.
   *
   * @param name - The table name (containing the schema name if specified)
   */
  public constructor(public readonly name: string) {
    this.mapNameToField = new Map<string, Field>();
    this.mapNameToIdentityField = new Map<string, Field>();
    this.mapNameToFKDef = new Map<string, FKDefinition>();
    this.mapNameToIDXDef = new Map<string, IDXDefinition>();
    this.fields = [];
    this.models = new Set<MetaModel>();
  }


  /**
   * Test if table has a column with the given column name
   *
   * @param colName - The name of the column
   */
  public hasTableField(name: string): Field|undefined {
    return this.mapNameToField.get(name);
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
      throw new Error(`table '${this.name}': field '${name}' not registered yet`);
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
    /* istanbul ignore if */
    if (this.mapNameToField.has(field.name)) {
      throw new Error(`table '${this.name}': field '${field.name}' on table  already defined`);
    }
    this.fields.push(field);
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
    field.indexKeys.forEach((idxFieldDef, idxName) => {
      let idxDef = this.hasIDXDefinition(idxName);
      if (!idxDef) {
        idxDef = new IDXDefinition(idxName, idxFieldDef.isUnique);
        this.addIDXDefinition(idxDef);
      }
      idxDef.fields.push(field);
    });
    field.foreignKeys.forEach((fkFieldDef, constraintName) => {
      let fkDef = this.hasFKDefinition(constraintName);
      if (!fkDef) {
        fkDef = new FKDefinition(constraintName, fkFieldDef.foreignTableName);
        this.addFKDefinition(fkDef);
      }
      fkDef.fields.push(field);
      fkDef.foreignColumNames.push(fkFieldDef.foreignColumName);
    });
    return field;
  }


  public hasFKDefinition(name: string): FKDefinition|undefined {
    return this.mapNameToFKDef.get(name);
  }

  public getFKDefinition(name: string): FKDefinition {
    const constraint = this.mapNameToFKDef.get(name);
    if (!constraint) {
      throw new Error(`table '${this.name}': foreign key constraint ${name} not registered yet`);
    }
    return constraint;
  }

  public addFKDefinition(fkDef: FKDefinition): void {
    /* istanbul ignore if */
    if (this.mapNameToFKDef.has(fkDef.name)) {
      throw new Error(`table '${this.name}': foreign key constraint ${fkDef.name} already registered`);
    }
    this.mapNameToFKDef.set(fkDef.name, fkDef);
  }

  public hasIDXDefinition(name: string): IDXDefinition|undefined {
    return this.mapNameToIDXDef.get(qualifiyIdentifier(name));
  }

  public getIDXDefinition(name: string): IDXDefinition {
    const idxDef = this.mapNameToIDXDef.get(qualifiyIdentifier(name));
    if (!idxDef) {
      throw new Error(`table '${this.name}': foreign key constraint ${name} not registered yet`);
    }
    return idxDef;
  }

  public addIDXDefinition(idxDef: IDXDefinition): void {
    const name = qualifiyIdentifier(idxDef.name);
    /* istanbul ignore if */
    if (this.mapNameToIDXDef.has(name)) {
      throw new Error(`table '${this.name}': foreign key constraint ${idxDef.name} already registered`);
    }
    this.mapNameToIDXDef.set(name, idxDef);
  }



  /**
   * Get 'CREATE TABLE'-statement using 'IF NOT EXISTS'-clause
   *
   * @returns The sql-statement
   */
  public getCreateTableStatement(): string {
    return this.createCreateTableStatement();
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
    const idxDef = this.hasIDXDefinition(idxName);
    if (!idxDef) {
      throw new Error(`table '${this.name}': index '${idxName}' is not defined on table '${this.name}'`);
    }
    // tslint:disable-next-line triple-equals
    if (unique == undefined) {
      unique = idxDef.isUnique ? true : false;
    }

    const quotedIdxName = quoteIdentifier(idxName);
    const quotedTableName = quoteAndUnqualiyIdentifier(this.name);

    const idxCols = idxDef.fields.map((field) => field.quotedName);
    // tslint:disable-next-line: restrict-plus-operands
    return 'CREATE ' + (unique ? 'UNIQUE ' : ' ') + `INDEX IF NOT EXISTS ${quotedIdxName} ON ${quotedTableName} ` +
        `(` + idxCols.join(', ') + ')';
  }

  /**
   * Get 'DROP TABLE'-statement
   *
   * @returns The sql-statement
   */
  public getDropIndexStatement(idxName: string): string {
    const idxDef = this.hasIDXDefinition(idxName);
    if (!idxDef) {
      throw new Error(`table '${this.name}': index '${idxName}' is not defined on table '${this.name}'`);
    }
    const quotedIdxName = quoteIdentifier(idxName);
    return `DROP INDEX IF EXISTS ${quotedIdxName}`;
  }

  /**
   * Generate SQL Statements
   *
   */
  private createCreateTableStatement(): string {
    const colNamesPK: string[] = [];
    const colDefs: string[] = [];

    const quotedTableName = this.quotedName;

    /* istanbul ignore if */
    if (!this.fields.length) {
      throw new Error(`table '${this.name}': does not have any fields defined`);
    }

    this.fields.forEach((field) => {
      const quotedFieldName = field.quotedName;
      let colDef = `${quotedFieldName} ${field.dbtype}`;

      if (field.isIdentity) {
        colNamesPK.push(quotedFieldName);
        if (this.mapNameToIdentityField.size === 1) {
          colDef += ' PRIMARY KEY';
          if (!!this.autoIncrementField) {
            colDef += ' AUTOINCREMENT';
          }
        }
      }
      colDefs.push(colDef);
    });
    // --------------------------------------------------------------
    // generate CREATE TABLE statement
    let stmt = `CREATE TABLE IF NOT EXISTS ${quotedTableName} (\n  `;

    // add column definitions
    stmt += colDefs.join(',\n  ');
    if (this.mapNameToIdentityField.size > 1) {
      // add multi-column primary key ćonstraint:
      stmt += ',\n  CONSTRAINT PRIMARY_KEY PRIMARY KEY (';
      stmt += colNamesPK.join(', ');
      stmt += ')';
    }


    // add foreign key constraint definition:
    this.mapNameToFKDef.forEach((fk, fkName) => {
      /* istanbul ignore if */
      if (!fk.fields.length || !fk.foreignColumNames.length || fk.fields.length !== fk.foreignColumNames.length) {
        throw new Error(`table '${this.name}': foreign key constraint '${fkName}' definition is incomplete`);
      }
      stmt += `,\n  CONSTRAINT ${quoteSimpleIdentifier(fk.name)}\n`;
      stmt += `    FOREIGN KEY (`;
      stmt += fk.fields.map((field) => field.quotedName).join(', ');
      stmt += ')\n';

      // TODO if fk.foreignTableName has qualifier it must match the qualifier of this.name
      const {identName, identSchema} = splitIdentifiers(fk.foreignTableName);

      const tableSchema = this.schemaName;
      if (identSchema) {
        if ((identSchema === 'main' && tableSchema && tableSchema !== identSchema) ||
            (identSchema !== 'main' && (!tableSchema || tableSchema !== identSchema))) {
          throw new Error(
              `table '${this.name}': foreign key '${fkName}' references table in wrong schema: '${
                                                                                                  fk.foreignTableName
                                                                                                }'`);
        }
      }

      stmt += `    REFERENCES ${quoteSimpleIdentifier(identName)} (`;
      // tslint:disable-next-line: restrict-plus-operands
      stmt += fk.foreignColumNames.map((colName) => quoteSimpleIdentifier(colName)).join(', ') +
          ') ON DELETE CASCADE';  // TODO: hard-coded 'ON DELETE CASCADE'
      stmt += '\n';

    });
    stmt += '\n)';
    if (this.withoutRowId) {
      stmt += ' WITHOUT ROWID';
    }
    return stmt;
  }
}
