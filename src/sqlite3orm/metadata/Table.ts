import * as core from '../core/core';

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
} from '../utils';
import {MetaModel} from './MetaModel';
import {FieldOpts} from './decorators';
import {PropertyType} from './PropertyType';

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
  readonly fields: Field[] = [];

  /**
   * The field mapped to the primary key; only set if the
   * AUTOINCREMENT feature can be used
   */
  private _autoIncrementField: Field|undefined;

  get autoIncrementField(): Field|undefined {
    return this._autoIncrementField;
  }

  // map column name to a field definition
  readonly mapNameToField: Map<string, Field>;

  // map column name to a identity field definition
  readonly mapNameToIdentityField: Map<string, Field>;

  // map constraint name to foreign key definition
  readonly mapNameToFKDef: Map<string, FKDefinition>;

  // map index name to index key definition
  readonly mapNameToIDXDef: Map<string, IDXDefinition>;


  readonly models: Set<MetaModel>;


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
   * @param name - The name of the column
   * @param isIdentity
   * @param [opts]
   * @param [propertyType]
   * @returns The field definition
   */
  // tslint:disable cyclomatic-complexity
  public getOrAddTableField(name: string, isIdentity: boolean, opts?: FieldOpts, propertyType?: PropertyType): Field {
    let field = this.mapNameToField.get(name);
    if (!field) {
      // create field
      field = new Field(name, isIdentity, opts, propertyType);
      this.fields.push(field);
      this.mapNameToField.set(field.name, field);

      if (field.isIdentity) {
        this.mapNameToIdentityField.set(field.name, field);
      }
    } else {
      // merge field
      if (field.isIdentity !== isIdentity) {
        throw new Error(`conflicting identity setting: new: ${isIdentity}, old: ${field.isIdentity}`);
      }
      if (opts && opts.dbtype) {
        if (field.isDbTypeDefined && field.dbtype !== opts.dbtype) {
          throw new Error(`conflicting dbtype setting: new: '${opts.dbtype}', old: '${field.dbtype}'`);
        }
        field.dbtype = opts.dbtype;
      }
      // tslint:disable-next-line triple-equals
      if (opts && opts.isJson != undefined) {
        if (field.isIsJsonDefined && field.isJson !== opts.isJson) {
          throw new Error(`conflicting json setting: new: ${opts.isJson}, old: ${field.isJson}`);
        }
        field.isJson = opts.isJson;
      }
      // tslint:disable-next-line triple-equals
      if (opts && opts.dateInMilliSeconds != undefined) {
        if (field.isDateInMilliSecondsDefined && field.dateInMilliSeconds !== opts.dateInMilliSeconds) {
          throw new Error(`conflicting dateInMilliSeconds setting: new: ${
                                                                          opts.dateInMilliSeconds
                                                                        }, old: ${field.dateInMilliSeconds}`);
        }
        field.dateInMilliSeconds = opts.dateInMilliSeconds;
      }
    }
    if (field.isIdentity) {
      if (this.autoIncrement && !this.withoutRowId && this.mapNameToIdentityField.size === 1 &&
          field.dbTypeInfo.typeAffinity === 'INTEGER') {
        this._autoIncrementField = field;
      } else {
        this._autoIncrementField = undefined;
      }
    }
    return field;
  }
  // tslint:enable cyclomatic-complexity


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

  public addFKDefinition(fkDef: FKDefinition): FKDefinition {
    const oldFkDef = this.mapNameToFKDef.get(fkDef.name);
    if (!oldFkDef) {
      this.mapNameToFKDef.set(fkDef.name, fkDef);
    } else {
      // check conflicts
      if (oldFkDef.id !== fkDef.id) {
        core.debugORM(`table '${this.name}': conflicting foreign key definition for '${fkDef.name}'`);
        core.debugORM(`   old: ${oldFkDef.id}`);
        core.debugORM(`   new: ${fkDef.id}`);
        throw new Error(`table '${this.name}': conflicting foreign key definition for '${fkDef.name}'`);
      }
    }
    return fkDef;
  }

  public hasIDXDefinition(name: string): IDXDefinition|undefined {
    // NOTE: creating a index in schema1 on a table in schema2 is not supported by Sqlite3
    //  so using qualifiedIndentifier is currently not required
    return this.mapNameToIDXDef.get(qualifiyIdentifier(name));
  }

  public getIDXDefinition(name: string): IDXDefinition {
    // NOTE: creating a index in schema1 on a table in schema2 is not supported by Sqlite3
    //  so using qualifiedIndentifier is currently not required
    const idxDef = this.mapNameToIDXDef.get(qualifiyIdentifier(name));
    if (!idxDef) {
      throw new Error(`table '${this.name}': index ${name} not registered yet`);
    }
    return idxDef;
  }

  public addIDXDefinition(idxDef: IDXDefinition): IDXDefinition {
    // NOTE: creating a index in schema1 on a table in schema2 is not supported by Sqlite3
    //  so using qualifiedIndentifier is currently not required
    const qname = qualifiyIdentifier(idxDef.name);
    const oldIdxDef = this.mapNameToIDXDef.get(qname);
    if (!oldIdxDef) {
      this.mapNameToIDXDef.set(qname, idxDef);
    } else {
      // check conflicts
      if (oldIdxDef.id !== idxDef.id) {
        core.debugORM(`table '${this.name}': conflicting index definition for '${idxDef.name}'`);
        core.debugORM(`   old: ${oldIdxDef.id}`);
        core.debugORM(`   new: ${idxDef.id}`);
        throw new Error(`table '${this.name}': conflicting index definition '${idxDef.name}'`);
      }
    }
    return idxDef;
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

    const idxCols = idxDef.fields.map((field) => quoteSimpleIdentifier(field.name) + (field.desc ? ' DESC' : ''));
    // tslint:disable-next-line: restrict-plus-operands
    return 'CREATE ' + (unique ? 'UNIQUE ' : ' ') +
        `INDEX IF NOT EXISTS ${quoteIdentifier(idxName)} ON ${quoteAndUnqualiyIdentifier(this.name)} ` +
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
    return `DROP INDEX IF EXISTS ${quoteIdentifier(idxName)}`;
  }

  /**
   * Generate SQL Statements
   *
   */
  public createCreateTableStatement(addFields?: Field[]): string {
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
    if (addFields) {
      addFields.forEach((field) => {
        const quotedFieldName = field.quotedName;
        colDefs.push(`${quotedFieldName} ${field.dbtype}`);
      });
    }
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
      if (!fk.fields.length || !fk.fields.length || fk.fields.length !== fk.fields.length) {
        throw new Error(`table '${this.name}': foreign key constraint '${fkName}' definition is incomplete`);
      }
      stmt += `,\n  CONSTRAINT ${quoteSimpleIdentifier(fk.name)}\n`;
      stmt += `    FOREIGN KEY (`;
      stmt += fk.fields.map((field) => quoteSimpleIdentifier(field.name)).join(', ');
      stmt += ')\n';

      // if fk.foreignTableName has qualifier it must match the qualifier of this.name
      const {identName, identSchema} = splitIdentifiers(fk.foreignTableName);

      const tableSchema = this.schemaName;
      /* istanbul ignore next */
      if (identSchema &&
          ((identSchema === 'main' && tableSchema && tableSchema !== identSchema) ||
           (identSchema !== 'main' && (!tableSchema || tableSchema !== identSchema)))) {
        throw new Error(
            `table '${this.name}': foreign key '${fkName}' references table in wrong schema: '${fk.foreignTableName}'`);
      }

      stmt += `    REFERENCES ${quoteSimpleIdentifier(identName)} (`;
      // tslint:disable-next-line: restrict-plus-operands
      stmt += fk.fields.map((field) => quoteSimpleIdentifier(field.foreignColumnName)).join(', ') +
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
