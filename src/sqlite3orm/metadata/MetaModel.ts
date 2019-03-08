// import * as core from './core';
import { MetaProperty } from './MetaProperty';
import { TableOpts, FieldOpts } from './decorators';
import { Table } from './Table';
import { schema } from './Schema';
import { FKDefinition } from './FKDefinition';
import { IDXDefinition } from './IDXDefinition';
import { QueryModelCache } from '../query/QueryModelBase';

export type KeyType = string | number | symbol;

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
  field?: Map<KeyType, PropertyFieldOptions>;
  fk?: Map<KeyType, Map<string, PropertyForeignKeyOptions>>;
  index?: Map<KeyType, Map<string, PropertyIndexOptions>>;
}

export class MetaModel {
  public readonly properties: Map<KeyType, MetaProperty>;
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

  qmCache!: QueryModelCache; // initialized by QueryModel (BaseDAO,..)

  constructor(public readonly name: string) {
    this.properties = new Map<KeyType, MetaProperty>();
    this.mapColNameToProp = new Map<string, MetaProperty>();
    this.opts = {};
  }

  hasProperty(key: KeyType): MetaProperty | undefined {
    return this.properties.get(key);
  }

  getProperty(key: KeyType): MetaProperty {
    const prop = this.properties.get(key);
    if (prop) {
      return prop;
    }
    throw new Error(`property '${key.toString()}' not defined for meta model '${this.name}'`);
  }

  getOrAddProperty(key: KeyType): MetaProperty {
    let prop = this.properties.get(key);
    if (!prop) {
      prop = new MetaProperty(this.name, key);
      this.properties.set(key, prop);
    }
    return prop;
  }

  setPropertyField(key: KeyType, isIdentity: boolean, opts: FieldOpts): void {
    this.getOrAddProperty(key);
    if (!this.opts.field) {
      this.opts.field = new Map<KeyType, PropertyFieldOptions>();
    }
    let fieldOpts = this.opts.field.get(key);
    if (fieldOpts) {
      throw new Error(
        `property '${this.name}.${key.toString()}' already mapped to '${fieldOpts.name}'`,
      );
    }
    fieldOpts = { name: opts.name || key.toString(), isIdentity, opts };
    this.opts.field.set(key, fieldOpts);
  }

  setPropertyForeignKey(
    key: KeyType,
    constraintName: string,
    foreignTableName: string,
    foreignTableField: string,
  ): void {
    this.getOrAddProperty(key);
    if (!this.opts.fk) {
      this.opts.fk = new Map<KeyType, Map<string, PropertyForeignKeyOptions>>();
    }
    let propertyFkOpts = this.opts.fk.get(key);
    if (!propertyFkOpts) {
      propertyFkOpts = new Map<string, PropertyForeignKeyOptions>();
      this.opts.fk.set(key, propertyFkOpts);
    }
    if (propertyFkOpts.has(constraintName)) {
      throw new Error(
        `property '${
          this.name
        }.${key.toString()}' already mapped to foreign key '${constraintName}'`,
      );
    }
    propertyFkOpts.set(constraintName, { constraintName, foreignTableName, foreignTableField });
  }

  setPropertyIndexKey(key: KeyType, indexName: string, isUnique?: boolean, desc?: boolean): void {
    this.getOrAddProperty(key);
    if (!this.opts.index) {
      this.opts.index = new Map<KeyType, Map<string, PropertyIndexOptions>>();
    }
    let propertyIdxOpts = this.opts.index.get(key);
    if (!propertyIdxOpts) {
      propertyIdxOpts = new Map<string, PropertyIndexOptions>();
      this.opts.index.set(key, propertyIdxOpts);
    }
    if (propertyIdxOpts.has(indexName)) {
      throw new Error(
        `property '${this.name}.${key.toString()}' already mapped to index '${indexName}'`,
      );
    }
    propertyIdxOpts.set(indexName, { name: indexName, isUnique, desc });
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
      this.opts.field = new Map<KeyType, PropertyFieldOptions>();
    }

    // after all the decoraters have run and a table has been created
    // we are able to fully initialize all properties:
    this.properties.forEach((prop, key) => {
      let fieldOpts = this.opts.field!.get(key);
      /* istanbul ignore if */
      if (!fieldOpts) {
        fieldOpts = { name: key.toString(), isIdentity: false, opts: {} };
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
                throw new Error(
                  `property '${
                    this.name
                  }.${prop.key.toString()}': conflicting index uniqueness setting`,
                );
              }
              idxDef.isUnique = propIdxOpts.isUnique;
            }
            // tslint:enable triple-equals
          }
          idxDef.fields.push({ name: prop.field.name, desc: propIdxOpts.desc });
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
                `property '${
                  this.name
                }.${prop.key.toString()}': conflicting foreign table setting: new: '${
                  propFkOpts.foreignTableName
                }', old '${fkDef.foreignTableName}'`,
              );
            }
          }
          fkDef.fields.push({
            name: prop.field.name,
            foreignColumnName: propFkOpts.foreignTableField,
          });
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
      (this.properties as any) = new Map<KeyType, MetaProperty>();
      (this.mapColNameToProp as any) = new Map<string, MetaProperty>();
    }
  }
}
