// tslint:disable callable-types

import { METADATA_MODEL_KEY, MetaModel, MetaProperty, Table } from '../metadata';

export const TABLEALIAS = 'T';

export class QueryModelBase<T> {
  readonly type: { new (): T };
  readonly metaModel: MetaModel;
  readonly table: Table;

  constructor(type: { new (): T }) {
    this.type = type;
    this.metaModel = Reflect.getMetadata(METADATA_MODEL_KEY, type.prototype);
    if (!this.metaModel) {
      throw new Error(`no table-definition defined on prototype of ${this.type.name}'`);
    }
    this.table = this.metaModel.table;
    if (!this.metaModel.qmCache) {
      this.metaModel.qmCache = this.buildCache();
    }
  }

  /**
   * Get 'SELECT ALL'-statement
   *
   * @returns The sql-statement
   */
  public getSelectAllStatement<K extends keyof T>(keys?: K[], tableAlias?: string): string {
    tableAlias = tableAlias || '';
    const tablePrefix = tableAlias.length ? `${tableAlias}.` : '';
    const props = this.getPropertiesFromKeys(keys);
    let stmt = 'SELECT\n';
    stmt +=
      `  ${tablePrefix}` + props.map((prop) => prop.field.quotedName).join(`,\n  ${tablePrefix}`);
    stmt += `\nFROM ${this.table.quotedName} ${tableAlias}\n`;
    return stmt;
  }

  /**
   * Get 'SELECT BY PRIMARY KEY'-statement
   *
   * @returns The sql-statement
   */
  public getSelectByIdStatement<K extends keyof T>(keys?: K[], tableAlias?: string): string {
    const tablePrefix = tableAlias && tableAlias.length ? `${tableAlias}.` : '';
    let stmt = this.getSelectAllStatement(keys, tableAlias);
    stmt += 'WHERE\n';
    stmt +=
      `  ${tablePrefix}` + this.metaModel.qmCache.primaryKeyPredicates.join(` AND ${tablePrefix}`);
    return stmt;
  }

  /**
   * Get 'UPDATE ALL' statement
   *
   * @returns The sql-statement
   */
  public getUpdateAllStatement<K extends keyof T>(keys?: K[]): string {
    let props = this.getPropertiesFromKeys(keys);
    props = props.filter((prop) => !prop.field.isIdentity);

    /* istanbul ignore if */
    if (!props.length) {
      throw new Error(`no columns to update'`);
    }

    let stmt = `UPDATE ${this.table.quotedName} SET\n  `;
    stmt += props
      .map((prop) => `${prop.field.quotedName} = ${prop.getHostParameterName()}`)
      .join(',\n  ');
    return stmt;
  }

  /**
   * Get 'UPDATE BY PRIMARY KEY' statement
   *
   * @returns The sql-statement
   */
  public getUpdateByIdStatement<K extends keyof T>(keys?: K[]): string {
    let stmt = this.getUpdateAllStatement(keys);
    stmt += '\nWHERE\n  ';
    stmt += this.metaModel.qmCache.primaryKeyPredicates.join(' AND ');
    return stmt;
  }

  /**
   * Get 'DELETE ALL'-statement
   *
   * @returns The sql-statement
   */
  public getDeleteAllStatement(): string {
    return `DELETE FROM ${this.table.quotedName}`;
  }

  /**
   * Get 'DELETE BY PRIMARY KEY'-statement
   *
   * @returns The sql-statement
   */
  public getDeleteByIdStatement(): string {
    let stmt = this.getDeleteAllStatement();
    stmt += '\nWHERE\n  ';
    stmt += this.metaModel.qmCache.primaryKeyPredicates.join(' AND ');
    return stmt;
  }

  /**
   * Get 'INSERT INTO'-statement
   *
   * @returns The sql-statement
   */
  public getInsertIntoStatement<K extends keyof T>(keys?: K[]): string {
    let props = this.getPropertiesFromKeys(keys);
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
  }

  /**
   * Get a select-condition for a foreign key constraint
   *
   * @param constraintName - The constraint name
   * @returns The partial where-clause
   */
  public getForeignKeyPredicates(constraintName: string): string[] | undefined {
    return this.metaModel.qmCache.foreignKeyPredicates.get(constraintName);
  }

  /**
   * Get the foreign key (child) properties for a foreign key constraint
   *
   * @param constraintName - The constraint name
   * @returns The properties holding the foreign key
   */
  public getForeignKeyProps(constraintName: string): MetaProperty[] | undefined {
    return this.metaModel.qmCache.foreignKeyProps.get(constraintName);
  }

  /**
   * Get the reference (parent) columns for a foreign key constraint
   *
   * @param constraintName - The constraint name
   * @returns The referenced column names
   */
  public getForeignKeyRefCols(constraintName: string): string[] | undefined {
    return this.metaModel.qmCache.foreignKeyRefCols.get(constraintName);
  }

  public getPropertiesFromKeys(keys?: (keyof T)[], addIdentity?: boolean): MetaProperty[] {
    if (!keys) {
      return Array.from(this.metaModel.properties.values());
    }
    const res: Map<string | number | symbol, MetaProperty> = new Map();
    keys.forEach((key) => {
      const prop = this.metaModel.properties.get(key);
      if (!prop) {
        return;
      }
      res.set(key, prop);
    });
    /* istanbul ignore if */
    if (addIdentity) {
      // for later use
      this.metaModel.qmCache.primaryKeyProps
        .filter((prop: MetaProperty) => !res.has(prop.key))
        .forEach((prop) => {
          res.set(prop.key, prop);
        });
    }
    return Array.from(res.values());
  }

  public getPropertiesFromColumnNames(
    cols: string[],
    notFoundCols?: string[],
  ): MetaProperty[] | undefined {
    const resProps: MetaProperty[] = [];
    /* istanbul ignore if */
    if (!notFoundCols) {
      notFoundCols = [];
    }
    cols.forEach((colName) => {
      const refProp = this.metaModel.mapColNameToProp.get(colName);
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

  public setHostParam(hostParams: any, prop: MetaProperty, model: Partial<T>): void {
    hostParams[prop.getHostParameterName()] = prop.getDBValueFromModel(model);
  }

  public setHostParamValue(hostParams: any, prop: MetaProperty, value: any): void {
    hostParams[prop.getHostParameterName()] = value;
  }

  public updateModelFromRow(model: T, row: any): T {
    this.metaModel.properties.forEach((prop) => {
      prop.setDBValueIntoModel(model, row[prop.field.name]);
    });
    return model;
  }

  public getPartialFromRow(row: any): Partial<T> {
    const res: Partial<T> = {};
    this.metaModel.properties.forEach((prop) => {
      if (row[prop.field.name] !== undefined) {
        prop.setDBValueIntoModel(res, row[prop.field.name]);
      }
    });
    return res;
  }

  public bindForeignParams<F extends Object>(
    foreignQueryModel: QueryModelBase<F>,
    constraintName: string,
    foreignObject: F,
    more: Object = {},
  ): Object {
    const hostParams: Object = Object.assign({}, more);
    const fkProps = this.getForeignKeyProps(constraintName);
    const refCols = this.getForeignKeyRefCols(constraintName);

    /* istanbul ignore if */
    if (!fkProps || !refCols || fkProps.length !== refCols.length) {
      throw new Error(
        `bind information for '${constraintName}' in table '${this.table.name}' is incomplete`,
      );
    }

    const refNotFoundCols: string[] = [];
    const refProps = foreignQueryModel.getPropertiesFromColumnNames(refCols, refNotFoundCols);
    /* istanbul ignore if */
    if (!refProps || refNotFoundCols.length) {
      const s = '"' + refNotFoundCols.join('", "') + '"';
      throw new Error(
        `in '${foreignQueryModel.metaModel.name}': no property mapped to these fields: ${s}`,
      );
    }

    for (let i = 0; i < fkProps.length; ++i) {
      const fkProp = fkProps[i];
      const refProp = refProps[i];
      this.setHostParamValue(hostParams, fkProp, refProp.getDBValueFromModel(foreignObject));
    }
    return hostParams;
  }

  public bindAllInputParams(model: Partial<T>, keys?: (keyof T)[], addIdentity?: boolean): Object {
    const hostParams: Object = {};
    const props = this.getPropertiesFromKeys(keys, addIdentity);
    props.forEach((prop) => {
      this.setHostParam(hostParams, prop, model);
    });
    return hostParams;
  }

  public bindNonPrimaryKeyInputParams(model: Partial<T>, keys?: (keyof T)[]): Object {
    const hostParams: Object = {};
    const props = this.getPropertiesFromKeys(keys);
    props
      .filter((prop) => !prop.field.isIdentity)
      .forEach((prop) => {
        this.setHostParam(hostParams, prop, model);
      });
    return hostParams;
  }

  public bindPrimaryKeyInputParams(model: Partial<T>): Object {
    const hostParams: Object = {};
    this.metaModel.qmCache.primaryKeyProps.forEach((prop: MetaProperty) => {
      this.setHostParam(hostParams, prop, model);
    });
    return hostParams;
  }

  private buildCache(): QueryModelCache {
    /* istanbul ignore if */
    if (!this.metaModel.properties.size) {
      throw new Error(`class '${this.metaModel.name}': does not have any mapped properties`);
    }

    // primary key predicates
    const props = Array.from(this.metaModel.properties.values());
    const primaryKeyProps = props.filter((prop) => prop.field.isIdentity);
    const primaryKeyPredicates = primaryKeyProps.map(
      (prop) => `${prop.field.quotedName}=${prop.getHostParameterName()}`,
    );

    // --------------------------------------------------------------
    // generate SELECT-fk condition
    const foreignKeyPredicates = new Map<string, string[]>();
    const foreignKeyProps = new Map<string, MetaProperty[]>();
    const foreignKeyRefCols = new Map<string, string[]>();

    this.table.mapNameToFKDef.forEach((fkDef, constraintName) => {
      const fkProps: MetaProperty[] = [];
      fkDef.fields.forEach((fkField) => {
        const prop = this.metaModel.mapColNameToProp.get(fkField.name);
        /* istanbul ignore else */
        if (prop) {
          fkProps.push(prop);
        }
      });
      /* istanbul ignore else */
      if (fkProps.length === fkDef.fields.length) {
        const selectCondition = fkProps.map(
          (prop) => `${prop.field.quotedName}=${prop.getHostParameterName()}`,
        );
        // tslint:disable no-non-null-assertion
        foreignKeyPredicates.set(constraintName, selectCondition);
        foreignKeyProps.set(constraintName, fkProps);
        foreignKeyRefCols.set(
          constraintName,
          fkDef.fields.map((field) => field.foreignColumnName),
        );
        // tslint:enable no-non-null-assertion
      }
    });
    return {
      primaryKeyProps,
      primaryKeyPredicates,
      foreignKeyPredicates,
      foreignKeyProps,
      foreignKeyRefCols,
    };
  }
}

export interface QueryModelCache {
  primaryKeyProps: MetaProperty[];
  primaryKeyPredicates: string[];
  foreignKeyPredicates: Map<string, string[]>;
  foreignKeyProps: Map<string, MetaProperty[]>;
  foreignKeyRefCols: Map<string, string[]>;
}
