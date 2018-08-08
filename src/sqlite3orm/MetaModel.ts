// import * as core from './core';
import {MetaProperty} from './MetaProperty';
import {TableOpts} from './decorators';
import {Table} from './Table';
import {schema} from './Schema';


export const TABLEALIAS = 'T';
export const TABLEALIASPREFIX = TABLEALIAS.length ? TABLEALIAS + '.' : '';


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
      // tslint:disable-next-line triple-equals
      if (opts.withoutRowId != undefined) {
        this._table.withoutRowId = opts.withoutRowId;
      }
      // tslint:disable-next-line triple-equals
      if (opts.autoIncrement != undefined) {
        this._table.autoIncrement = opts.autoIncrement;
      }
    } else {
      // tslint:disable-next-line triple-equals
      if (opts.withoutRowId != undefined) {
        // tslint:disable-next-line triple-equals
        if (this._table.isWithoutRowIdDefined && opts.withoutRowId != this._table.withoutRowId) {
          throw new Error(`in class '${this.name}': detected conflicting withoutRowId settings`);
        }
        this._table.withoutRowId = opts.withoutRowId;
      }
      // tslint:disable-next-line triple-equals
      if (opts.autoIncrement != undefined) {
        // tslint:disable-next-line triple-equals
        if (this._table.isAutoIncrementDefined && opts.autoIncrement != this._table.autoIncrement) {
          throw new Error(`in class '${this.name}': detected conflicting autoIncrement settings`);
        }
        this._table.autoIncrement = opts.autoIncrement;
      }
    }

    this.properties.forEach((prop) => {
      prop.init(this);
    });

    this._table.models.add(this);
  }

  destroy(): void {
    if (this._table) {
      this._table.models.delete(this);
      if (!this.table.models.size) {
        schema().deleteTable(this._table.name);
      }
      this._table = undefined;
      (this.properties as any) = new Map<string|symbol, MetaProperty>();
      (this.mapColNameToProp as any) = new Map<string, MetaProperty>();
    }
  }


  /**
   * Get 'INSERT INTO'-statement
   *
   * @returns The sql-statement
   */
  public getInsertIntoStatement(keys?: (string|symbol)[]): string {
    return this.statementsText.insertInto(this.getPropertiesFromKeys(keys));
  }

  /**
   * Get 'UPDATE BY PRIMARY KEY' statement
   *
   * @returns The sql-statement
   */
  public getUpdateByIdStatement(keys?: (string|symbol)[]): string {
    return this.statementsText.updateById(this.getPropertiesFromKeys(keys));
  }

  /**
   * Get 'UPDATE ALL' statement
   *
   * @returns The sql-statement
   */
  public getUpdateAllStatement(keys?: (string|symbol)[]): string {
    return this.statementsText.updateAll(this.getPropertiesFromKeys(keys));
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
   * Get 'DELETE ALL'-statement
   *
   * @returns The sql-statement
   */
  public getDeleteAllStatement(): string {
    return this.statementsText.deleteAll;
  }

  /**
   * Get 'SELECT ALL'-statement
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
   * Get the foreign key (child) properties for a foreign key constraint
   *
   * @param constraintName - The constraint name
   * @returns The properties holding the foreign key
   */
  public getForeignKeyProps(constraintName: string): MetaProperty[]|undefined {
    return this.statementsText.foreignKeyProps.get(constraintName);
  }


  /**
   * Get the reference (parent) columns for a foreign key constraint
   *
   * @param constraintName - The constraint name
   * @returns The referenced column names
   */
  public getForeignKeyRefCols(constraintName: string): string[]|undefined {
    return this.statementsText.foreignKeyRefCols.get(constraintName);
  }


  public getPropertiesFromKeys(keys?: (string|symbol)[], addIdentity?: boolean): MetaProperty[] {
    let props: MetaProperty[];
    if (keys) {
      const addedMap = new Set<string|symbol>();
      props = [];
      keys.forEach((key) => {
        const prop = this.properties.get(key);
        if (!prop) {
          return;
        }
        if (!addedMap.has(key)) {
          props.push(prop);
          addedMap.add(key);
        }
      });
      /* istanbul ignore if */
      if (addIdentity) {
        // for later use
        props.push(
            ...Array.from(this.properties.values()).filter((prop) => prop.field.isIdentity && !addedMap.has(prop.key)));
      }
    } else {
      props = Array.from(this.properties.values());
    }
    return props;
  }



  public getPropertiesFromColumnNames(cols: string[], notFoundCols?: string[]): MetaProperty[]|undefined {
    const resProps: MetaProperty[] = [];
    /* istanbul ignore if */
    if (!notFoundCols) {
      notFoundCols = [];
    }
    cols.forEach((colName) => {
      const refProp = this.mapColNameToProp.get(colName);
      /* istanbul ignore else */
      if (refProp) {
        resProps.push(refProp);
      } else {
        (notFoundCols as string[]).push(colName);
      }
    });
    /* istanbul ignore if */
    if (notFoundCols.length) {
      return undefined;
    }
    return resProps;
  }

  /**
   * Generate SQL Statements
   *
   */
  private generateStatementsText(): SqlStatementText {
    // tslint:disable-next-line no-use-before-declare
    const stmts = new SqlStatementText();

    /* istanbul ignore if */
    if (!this.properties.size) {
      throw new Error(`class '${this.name}': does not have any mapped properties`);
    }

    const properties = Array.from(this.properties.values());
    const colSelPK = properties.filter((prop) => prop.field.isIdentity)
                         .map((prop) => `${prop.field.quotedName}=${prop.getHostParameterName()}`);

    // --------------------------------------------------------------
    // generate simple where clause for selecting via primary key
    let wherePrimaryKeyClause = '\nWHERE\n  ';
    wherePrimaryKeyClause += colSelPK.join(' AND ');

    // --------------------------------------------------------------
    // generate INSERT INTO statement

    stmts.insertInto = (props: MetaProperty[]): string => {
      if (this.table.autoIncrementField) {
        props = props.filter((prop) => !prop.field.isIdentity);
      }
      if (!props.length) {
        return `INSERT INTO ${this.table.quotedName} DEFAULT VALUES`;
      }

      let stmt = `INSERT INTO ${this.table.quotedName} (\n  `;
      stmt += props.map((prop) => prop.field.quotedName).join(', ');
      stmt += '\n) VALUES (\n  ';
      stmt += props.map((prop) => prop.getHostParameterName()).join(', ');
      stmt += '\n)';
      return stmt;
    };

    // --------------------------------------------------------------
    // generate UPDATE ALL statement

    stmts.updateAll = (props: MetaProperty[]): string => {
      props = props.filter((prop) => !prop.field.isIdentity);

      /* istanbul ignore if */
      if (!props.length) {
        throw new Error(`no columns to update'`);
      }

      let stmt = `UPDATE ${this.table.quotedName} SET\n  `;
      stmt += props.map((prop) => `${prop.field.quotedName} = ${prop.getHostParameterName()}`).join(',\n  ');
      return stmt;
    };

    // tslint:disable

    // --------------------------------------------------------------
    // generate UPDATE BY PRIMARY KEY statement

    // tslint:disable
    stmts.updateById = (props: MetaProperty[]): string => {
      let stmt = stmts.updateAll(props);
      stmt += wherePrimaryKeyClause;
      return stmt;
    };

    // --------------------------------------------------------------
    // generate DELETE ALL statement
    stmts.deleteAll = `DELETE FROM ${this.table.quotedName}`;

    // --------------------------------------------------------------
    // generate DELETE FROM statement
    stmts.deleteById = stmts.deleteAll;
    stmts.deleteById += wherePrimaryKeyClause;

    // --------------------------------------------------------------
    // generate SELECT-all statement

    stmts.selectAll = 'SELECT\n  ';
    stmts.selectAll +=
        `${TABLEALIASPREFIX}` + properties.map((prop) => prop.field.quotedName).join(`, ${TABLEALIASPREFIX}`);
    stmts.selectAll += `\nFROM ${this.table.quotedName} ${TABLEALIAS} `;

    // --------------------------------------------------------------
    // generate SELECT-one statement
    stmts.selectById = stmts.selectAll;
    stmts.selectById += '\nWHERE\n  ';
    stmts.selectById += `${TABLEALIASPREFIX}` + colSelPK.join(` AND ${TABLEALIASPREFIX}`);

    // --------------------------------------------------------------
    // generate SELECT-fk condition

    this.table.mapNameToFKDef.forEach((fkDef, constraintName) => {
      const props: MetaProperty[] = [];
      fkDef.fields.forEach((fkField) => {
        const prop = this.mapColNameToProp.get(fkField.name);
        /* istanbul ignore else */
        if (prop) {
          props.push(prop);
        }
      });
      /* istanbul ignore else */
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
  insertInto!: (props: MetaProperty[]) => string;
  updateById!: (props: MetaProperty[]) => string;
  deleteById!: string;
  updateAll!: (props: MetaProperty[]) => string;
  deleteAll!: string;
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
