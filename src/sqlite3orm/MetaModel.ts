// import * as core from './core';
import {MetaProperty} from './MetaProperty';
import {TableOpts, FieldOpts} from './decorators';
import {Table} from './Table';
import {schema} from './Schema';
import {FKDefinition} from './FKDefinition';
import {IDXDefinition} from './IDXDefinition';

export const TABLEALIAS = 'T';
/* istanbul ignore next */
export const TABLEALIASPREFIX = TABLEALIAS.length ? TABLEALIAS + '.' : '';

interface PropertyFieldOptions {
  name: string;
  isIdentity: boolean;
  opts: FieldOpts;
}

interface PropertyForeignKeyOptions {
  constraintName: string;
  foreignTableName: string;
  foreignTableField: string;
}

interface PropertyIndexOptions {
  name: string;
  isUnique?: boolean;
  desc?: boolean;
}

interface PropertyOptions {
  field?: Map<string|symbol, PropertyFieldOptions>;
  fk?: Map<string|symbol, Map<string, PropertyForeignKeyOptions>>;
  index?: Map<string|symbol, Map<string, PropertyIndexOptions>>;
}


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

  private opts: PropertyOptions;

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
    this.opts = {};
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

  getOrAddProperty(key: string|symbol): MetaProperty {
    let prop = this.properties.get(key);
    if (!prop) {
      prop = new MetaProperty(this.name, key);
      this.properties.set(key, prop);
    }
    return prop;
  }

  setPropertyField(key: string|symbol, isIdentity: boolean, opts: FieldOpts): void {
    this.getOrAddProperty(key);
    if (!this.opts.field) {
      this.opts.field = new Map<string|symbol, PropertyFieldOptions>();
    }
    let fieldOpts = this.opts.field.get(key);
    if (fieldOpts) {
      throw new Error(`property '${this.name}.${key.toString()}' already mapped to '${fieldOpts.name}'`);
    }
    fieldOpts = {name: opts.name || key.toString(), isIdentity, opts};
    this.opts.field.set(key, fieldOpts);
  }

  setPropertyForeignKey(
      key: string|symbol, constraintName: string, foreignTableName: string, foreignTableField: string): void {
    this.getOrAddProperty(key);
    if (!this.opts.fk) {
      this.opts.fk = new Map<string|symbol, Map<string, PropertyForeignKeyOptions>>();
    }
    let propertyFkOpts = this.opts.fk.get(key);
    if (!propertyFkOpts) {
      propertyFkOpts = new Map<string, PropertyForeignKeyOptions>();
      this.opts.fk.set(key, propertyFkOpts);
    }
    if (propertyFkOpts.has(constraintName)) {
      throw new Error(`property '${this.name}.${key.toString()}' already mapped to foreign key '${constraintName}'`);
    }
    propertyFkOpts.set(constraintName, {constraintName, foreignTableName, foreignTableField});
  }

  setPropertyIndexKey(key: string|symbol, indexName: string, isUnique?: boolean, desc?: boolean): void {
    this.getOrAddProperty(key);
    if (!this.opts.index) {
      this.opts.index = new Map<string|symbol, Map<string, PropertyIndexOptions>>();
    }
    let propertyIdxOpts = this.opts.index.get(key);
    if (!propertyIdxOpts) {
      propertyIdxOpts = new Map<string, PropertyIndexOptions>();
      this.opts.index.set(key, propertyIdxOpts);
    }
    if (propertyIdxOpts.has(indexName)) {
      throw new Error(`property '${this.name}.${key.toString()}' already mapped to index '${indexName}'`);
    }
    propertyIdxOpts.set(indexName, {name: indexName, isUnique, desc});
  }



  init(tableOpts: TableOpts): void {
    if (this._table) {
      throw new Error(`meta model '${this.name}' already mapped to '${this._table.name}'`);
    }
    const tableName = tableOpts.name || this.name;
    try {
      this._table = schema().getOrAddTable(tableName, tableOpts);
    } catch (err) {
      throw new Error(`meta model '${this.name}': failed to add field: ${err.message}`);
    }

    const idxDefs = new Map<string, IDXDefinition>();
    const fkDefs = new Map<string, FKDefinition>();

    // tslint:disable no-non-null-assertion
    /* istanbul ignore if */
    if (!this.opts.field) {
      this.opts.field = new Map<string|symbol, PropertyFieldOptions>();
    }

    // after all the decoraters have run and a table has been created
    // we are able to fully initialize all properties:
    this.properties.forEach((prop, key) => {
      let fieldOpts = this.opts.field!.get(key);
      /* istanbul ignore if */
      if (!fieldOpts) {
        fieldOpts = {name: key.toString(), isIdentity: false, opts: {}};
        this.opts.field!.set(key, fieldOpts);
      }
      prop.init(this, fieldOpts.name, fieldOpts.isIdentity, fieldOpts.opts);

      const allPropIdxOpts = this.opts.index && this.opts.index.get(key);
      if (allPropIdxOpts) {
        allPropIdxOpts.forEach((propIdxOpts, idxName) => {
          let idxDef = idxDefs.get(idxName);
          if (!idxDef) {
            idxDef = new IDXDefinition(idxName, propIdxOpts.isUnique);
            idxDefs.set(idxName, idxDef);
          } else {
            // test for conflicting isUniqe setting
            // tslint:disable triple-equals
            if (propIdxOpts.isUnique != undefined) {
              if (idxDef.isUnique != undefined && propIdxOpts.isUnique !== idxDef.isUnique) {
                throw new Error(`property '${this.name}.${prop.key.toString()}': conflicting index uniqueness setting`);
              }
              idxDef.isUnique = propIdxOpts.isUnique;
            }
            // tslint:enable triple-equals
          }
          idxDef.fields.push({name: prop.field.name, desc: propIdxOpts.desc});
        });
      }

      const allPropFkOpts = this.opts.fk && this.opts.fk.get(key);
      if (allPropFkOpts) {
        allPropFkOpts.forEach((propFkOpts, constraintName) => {
          let fkDef = fkDefs.get(constraintName);
          if (!fkDef) {
            fkDef = new FKDefinition(constraintName, propFkOpts.foreignTableName);
            fkDefs.set(constraintName, fkDef);
          } else {
            // test for conflicting foreign table setting
            if (propFkOpts.foreignTableName !== fkDef.foreignTableName) {
              throw new Error(
                  `property '${this.name}.${
                                            prop.key.toString()
                                          }': conflicting foreign table setting: new: '${
                                                                                         propFkOpts.foreignTableName
                                                                                       }', old '${
                                                                                                  fkDef.foreignTableName
                                                                                                }'`);
            }
          }
          fkDef.fields.push({name: prop.field.name, foreignColumnName: propFkOpts.foreignTableField});
        });
      }
    });
    // tslint:enable no-non-null-assertion

    idxDefs.forEach((idxDef) => {
      this.table.addIDXDefinition(idxDef);
    });

    fkDefs.forEach((fkDef) => {
      this.table.addFKDefinition(fkDef);
    });

    this.table.models.add(this);
    this.opts = {};
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
    stmts.selectAll += `\nFROM ${this.table.quotedName} ${TABLEALIAS}\n`;

    // --------------------------------------------------------------
    // generate SELECT-one statement
    stmts.selectById = stmts.selectAll;
    stmts.selectById += 'WHERE\n';
    stmts.selectById += `  ${TABLEALIASPREFIX}` + colSelPK.join(` AND ${TABLEALIASPREFIX}`);

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
        stmts.foreignKeyRefCols.set(constraintName, fkDef.fields.map((field) => field.foreignColumnName));
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
