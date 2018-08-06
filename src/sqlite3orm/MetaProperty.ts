// import * as core from './core';

// tslint:disable-next-line no-require-imports
import {FieldOpts} from './decorators';
import {PropertyType} from './PropertyType';
import {Field} from './Field';
import {FKFieldDefinition} from './FKFieldDefinition';
import {IDXFieldDefinition} from './IDXFieldDefinition';
import {MetaModel} from './MetaModel';


export class MetaProperty {
  /**
   * The property type enum mapped to this field
   */
  private _propertyType: PropertyType;

  get propertyType(): PropertyType {
    return this._propertyType;
  }

  private _field?: Field;
  public get field(): Field {
    /* istanbul ignore else */
    if (this._field) {
      return this._field;
    }
    /* istanbul ignore next */
    throw new Error(`meta model property '${this.className}.${this.key.toString()}' not fully initialized yet`);
  }

  private _tmpField?: Field;

  constructor(public readonly className: string, public readonly key: string|symbol) {
    this._propertyType = PropertyType.UNKNOWN;
  }

  // called from decorator
  setPropertyType(propertyType: Function): void {
    if (propertyType.name === 'Boolean') {
      this._propertyType = PropertyType.BOOLEAN;
    } else if (propertyType.name === 'String') {
      this._propertyType = PropertyType.STRING;
    } else if (propertyType.name === 'Number') {
      this._propertyType = PropertyType.NUMBER;
    } else if (propertyType.name === 'Date') {
      this._propertyType = PropertyType.DATE;
    } else {
      this._propertyType = PropertyType.UNKNOWN;
    }
  }

  addField(name: string, isIdentity: boolean, opts?: FieldOpts): void {
    opts = opts || {};
    if (this._tmpField) {
      if (this._tmpField.name) {
        throw new Error(`in class '${this.className}': property '${
                                                                   this.key.toString()
                                                                 }' is already mapped to '${this._tmpField.name}`);
      }
      this._tmpField.name = name;
    } else {
      this._tmpField = new Field(name);
    }
    this._tmpField.isIdentity = isIdentity;
    if (opts.dbtype) {
      this._tmpField.dbtype = opts.dbtype;
    }
    // tslint:disable-next-line triple-equals
    if (opts.isJson != undefined) {
      this._tmpField.isJson = opts.isJson;
    }
  }

  addForeignKey(constraintName: string, foreignTableName: string, foreignTableField: string): void {
    if (!this._tmpField) {
      this._tmpField = new Field();
    }
    if (this._tmpField.foreignKeys.has(constraintName)) {
      throw new Error(
          `in class '${this.className}': foreign key '${
                                                        constraintName
                                                      }' is already defined on property '${this.key.toString()}'`);
    }
    const fkFieldDef = new FKFieldDefinition(constraintName, foreignTableName, foreignTableField);
    this._tmpField.setFKField(fkFieldDef);
  }

  addIndexKey(indexName: string, isUnique?: boolean): void {
    if (!this._tmpField) {
      this._tmpField = new Field();
    }
    if (this._tmpField.isIndexField(indexName)) {
      throw new Error(
          `in class '${this.className}': index '${indexName}' is already defined on property '${this.key.toString()}'`);
    }
    this._tmpField.setIndexField(new IDXFieldDefinition(indexName, isUnique));
  }

  init(model: MetaModel): void {
    /* istanbul ignore if */
    if (this._field) {
      throw new Error(
          `meta model property '${this.className}.${this.key.toString()}' already mapped to '${this._field.name}'`);
    }

    /* istanbul ignore if */
    if (!this._tmpField) {
      throw new Error(`meta model property '${this.className}.${this.key.toString()}' not mapped to any field'`);
    }

    const oldField = model.table.hasTableField(this._tmpField.name);
    this._field = this.initField(model);
    this.initIndexKeys();
    this.initForeignKeys();

    if (oldField !== this._field) {
      // add this field to the table:
      model.table.addTableField(this._field);
    }

    // add mapping from column name to this property
    model.mapColNameToProp.set(this._field.name, this);

    // cleanup
    this._tmpField = undefined;
  }


  protected initField(model: MetaModel): Field {
    /* istanbul ignore if */
    if (!this._tmpField) {
      throw new Error(`meta model property '${this.className}.${this.key.toString()}' not mapped to any field'`);
    }

    let metaField = model.table.hasTableField(this._tmpField.name);
    if (!metaField) {
      // new field
      metaField = new Field(this._tmpField.name);
      metaField.isIdentity = this._tmpField.isIdentity;
      if (this._tmpField.isDbTypeDefined) {
        metaField.dbtype = this._tmpField.dbtype;
      } else {
        this.setDbDefaultType(metaField);
      }
      if (this._tmpField.isIsJsonDefined) {
        metaField.isJson = this._tmpField.isJson;
      }

    } else {
      // merge field
      if (metaField.isIdentity !== this._tmpField.isIdentity) {
        throw new Error(`in class '${
                                     this.className
                                   }': detected conflicting identity settings for property '${this.key.toString()}'`);
      }
      if (this._tmpField.isDbTypeDefined) {
        if (metaField.isDbTypeDefined && metaField.dbtype !== this._tmpField.dbtype) {
          throw new Error(`in class '${
                                       this.className
                                     }': detected conflicting dbtype settings for property '${this.key.toString()}'`);
        } else {
          this.setDbDefaultType(metaField);
        }
        metaField.dbtype = this._tmpField.dbtype;
      }
      // tslint:disable-next-line triple-equals
      if (this._tmpField.isIsJsonDefined) {
        if (metaField.isIsJsonDefined && metaField.isJson !== this._tmpField.isJson) {
          throw new Error(
              `in class '${this.className}': detected conflicting json settings for property '${this.key.toString()}'`);
        }
        metaField.isJson = this._tmpField.isJson;
      }
    }
    return metaField;
  }

  protected setDbDefaultType(metaField: Field): void {
    switch (this.propertyType) {
      case PropertyType.BOOLEAN:
      case PropertyType.DATE:
        metaField.dbDefaultType = 'INTEGER';
        break;
      case PropertyType.NUMBER:
        if (metaField.isIdentity) {
          metaField.dbDefaultType = 'INTEGER NOT NULL';
        } else {
          metaField.dbDefaultType = 'REAL';
        }
        break;
    }
    // otherwise 'TEXT' will be used as default
  }


  protected initIndexKeys(): void {
    const metaField = this._field as Field;
    /* istanbul ignore else */
    if (this._tmpField) {
      this._tmpField.indexKeys.forEach((idxField, idxName) => {
        if (!metaField.isIndexField(idxName)) {
          metaField.setIndexField(idxField);
        } else {
          const oldIDXDef = metaField.indexKeys.get(idxName) as IDXFieldDefinition;
          // tslint:disable-next-line triple-equals
          if (idxField.isUnique != undefined && oldIDXDef.isUnique != undefined &&
              idxField.isUnique !== oldIDXDef.isUnique) {
            throw new Error(`in class '${this.className}': detected conflicting index settings for ${idxName}`);
          }
        }
      });
    }
  }


  protected initForeignKeys(): void {
    const metaField = this._field as Field;
    /* istanbul ignore else */
    if (this._tmpField) {
      this._tmpField.foreignKeys.forEach((fkFieldDef, constraintName) => {
        if (!metaField.isFKField(constraintName)) {
          metaField.setFKField(fkFieldDef);
        } else {
          const oldFKDef = metaField.foreignKeys.get(constraintName) as FKFieldDefinition;
          if (oldFKDef.foreignTableName !== fkFieldDef.foreignTableName ||
              oldFKDef.foreignColumName !== fkFieldDef.foreignColumName) {
            throw new Error(
                `in class '${this.className}': detected conflicting foreign key settings for ${constraintName}`);
          }
        }
      });
    }
  }



  getPropertyValue(model: any): any {
    const field = this.field;
    let value = Reflect.get(model, this.key);
    // tslint:disable-next-line: triple-equals
    if (value == undefined) {
      return value;
    }
    if (field.isJson) {
      value = JSON.stringify(value);
    } else {
      switch (this.propertyType) {
        case PropertyType.BOOLEAN:
          value = !value ? 0 : 1;
          break;
        case PropertyType.DATE:
          if (field.dbTypeInfo.typeAffinity === 'INTEGER') {
            value = Math.floor((value as Date).getTime() / 1000);
          } else {
            value = (value as Date).toISOString();
          }
          break;
      }
    }
    return value;
  }

  setPropertyValue(model: any, value: any): void {
    const field = this.field;
    // tslint:disable-next-line: triple-equals
    if (value == undefined) {
      Reflect.set(model, this.key, undefined);
      return;
    }
    if (field.isJson) {
      value = JSON.parse(value);
    } else {
      switch (this.propertyType) {
        case PropertyType.BOOLEAN:
          if (typeof value === 'string') {
            if (value === '0' || value === 'false') {
              value = false;
            } else if (value === '1' || value === 'true') {
              value = true;
            } else {
              value = undefined;
            }
          } else {
            value = !value ? false : true;
          }
          break;
        case PropertyType.DATE:
          switch (typeof value) {
            case 'string':
              value = new Date(Date.parse(value));
              break;
            case 'number':
              if (Number.isInteger(value)) {
                // unix time
                value = new Date((value as number) * 1000);
              } else {
                // Julian day numbers ?
                // TODO: convert real-number to Date is currently not supported
                value = NaN;
              }
              break;
            /* istanbul ignore next */
            default:
              // NOTE: should not happen
              value = NaN;
              break;
          }
          break;
        case PropertyType.NUMBER:
          if (typeof value !== 'number') {
            value = Number(value);
          }
          break;
        case PropertyType.STRING:
          if (typeof value !== 'string') {
            value = String(value);
          }
          break;
      }
    }
    Reflect.set(model, this.key, value);
  }

  /**
   * Get the name for the corresponding host parameter
   *
   * @returns {string}
   */
  public getHostParameterName(): string {
    return ':' + this.key.toString();
  }
}
