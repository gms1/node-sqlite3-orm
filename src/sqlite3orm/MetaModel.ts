// import * as core from './core';

// tslint:disable no-use-before-declare
// tslint:disable-next-line no-require-imports
import * as _dbg from 'debug';

import {MetaProperty} from './MetaProperty';
import {TableOpts} from './decorators';
import {Table} from './Table';
import {schema} from './Schema';


export const debugModel = _dbg('sqlite3orm:model');

const TABLEALIAS = 'T';


export class MetaModel {
  public readonly properties: Map<string|symbol, MetaProperty>;
  public readonly mapColNameToProp: Map<string, MetaProperty>;

  private _table?: Table;
  get table(): Table {
    /* istanbul ignore else */
    if (this._table) {
      return this._table;
    }
    /* istanbul ignore next */
    throw new Error(`meta model '${this.name}' not fully initialized yet`);
  }

  private _statementsText?: SqlStatementText;
  public get statementsText(): SqlStatementText {
    if (!this._statementsText) {
      this._statementsText = this.generateStatementsText();
    }
    return this._statementsText;
  }

  constructor(public readonly name: string) {
    this.properties = new Map<string|symbol, MetaProperty>();
    this.mapColNameToProp = new Map<string, MetaProperty>();
  }

  hasProperty(key: string|symbol): MetaProperty|undefined {
    return this.properties.get(key);
  }

  getProperty(key: string|symbol): MetaProperty {
    const prop = this.properties.get(key);
    if (prop) {
      return prop;
    }
    throw new Error(`property '${key.toString()}' not defined for meta model '${this.name}'`);
  }

  getPropertyAlways(key: string|symbol): MetaProperty {
    let prop = this.properties.get(key);
    if (!prop) {
      prop = new MetaProperty(this.name, key);
      this.properties.set(key, prop);
    }
    return prop;
  }

  init(opts: TableOpts): void {
    if (this._table) {
      throw new Error(`meta model '${this.name}' already mapped to '${this._table.name}'`);
    }
    const tableName = opts.name || this.name;
    this._table = schema().hasTable(tableName);
    if (!this._table) {
      this._table = new Table(tableName);
      schema().addTable(this.table);
    }
    const metaTable = this._table;

    if (!!opts.withoutRowId) {
      metaTable.withoutRowId = true;
    }
    if (!!opts.autoIncrement) {
      metaTable.autoIncrement = true;
    }
    this.properties.forEach((prop) => {
      prop.init(this);
    });
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
   * Get 'UPDATE BY PRIMARY KEY' statement
   *
   * @returns The sql-statement
   */
  public getUpdateByIdStatement(): string {
    return this.statementsText.updateById;
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
   * @returns The properties holding the foreign key
   */
  public getForeignKeyProps(constraintName: string): MetaProperty[]|undefined {
    return this.statementsText.foreignKeyProps.get(constraintName);
  }


  /**
   * Get the reference fields for a foreign key constraint
   *
   * @param constraintName - The constraint name
   * @returns The referenced column names
   */
  public getForeignKeyRefCols(constraintName: string): string[]|undefined {
    return this.statementsText.foreignKeyRefCols.get(constraintName);
  }



  /**
   * Generate SQL Statements
   *
   */
  private generateStatementsText(): SqlStatementText {
    const colNames: string[] = [];
    const colNamesNoPK: string[] = [];
    const colParms: string[] = [];
    const colParmsNoPK: string[] = [];
    const colSetsNoPK: string[] = [];
    const colSelPK: string[] = [];
    const stmts = new SqlStatementText();

    const table = this.table;
    const quotedTableName = table.quotedName;

    if (!this.properties.size) {
      throw new Error(`class '${this.name}': does not have any mapped properties`);
    }

    this.properties.forEach((prop) => {
      const field = prop.field;
      const quotedFieldName = field.quotedName;
      const hostParmName = prop.getHostParameterName();

      colNames.push(quotedFieldName);
      colParms.push(hostParmName);
      if (field.isIdentity) {
        colSelPK.push(`${quotedFieldName}=${hostParmName}`);
      } else {
        colNamesNoPK.push(quotedFieldName);
        colParmsNoPK.push(hostParmName);
        colSetsNoPK.push(`${quotedFieldName} = ${hostParmName}`);
      }
    });

    // --------------------------------------------------------------
    // generate INSERT INTO statement
    stmts.insertInto = `INSERT INTO ${quotedTableName} (\n  `;
    if (!table.autoIncrementField) {
      stmts.insertInto += colNames.join(', ');
    } else {
      stmts.insertInto += colNamesNoPK.join(', ');
    }
    stmts.insertInto += '\n) VALUES (\n  ';
    if (!table.autoIncrementField) {
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
    stmts.deleteById = `DELETE FROM ${quotedTableName}`;
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

    table.mapNameToFKDef.forEach((fkDef, constraintName) => {
      const props: MetaProperty[] = [];
      fkDef.fields.forEach((fkField) => {
        const prop = this.mapColNameToProp.get(fkField.name);
        if (prop) {
          props.push(prop);
        }
      });
      if (props.length === fkDef.fields.length) {
        const selectCondition =
            props.map((prop) => `${TABLEALIASPREFIX}${prop.field.quotedName}=${prop.getHostParameterName()}`)
                .join(' AND ');
        stmts.foreignKeySelects.set(constraintName, selectCondition);
        stmts.foreignKeyProps.set(constraintName, props);
        stmts.foreignKeyRefCols.set(constraintName, fkDef.foreignColumNames);
      }

    });
    // stmts.log();
    return stmts;
  }
}


/**
 * helper class holding sql-statements/fragments
 *
 * @class SqlStatementText
 */
class SqlStatementText {
  insertInto!: string;
  updateById!: string;
  deleteById!: string;
  selectAll!: string;
  selectById!: string;

  foreignKeySelects: Map<string, string>;
  foreignKeyProps: Map<string, MetaProperty[]>;
  foreignKeyRefCols: Map<string, string[]>;

  public constructor() {
    this.foreignKeySelects = new Map<string, string>();
    this.foreignKeyProps = new Map<string, MetaProperty[]>();
    this.foreignKeyRefCols = new Map<string, string[]>();
  }
}
