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
  private _tmpOpts?: FieldOpts;

  constructor(public readonly className: string, public readonly key: string|symbol) {
    this._propertyType = PropertyType.UNKNOWN;
  }

  // called from decorator
  setPropertyType(propertyType: string|undefined): void {
    // tslint:disable: triple-equals
    if (propertyType == 'function Boolean() { [native code] }') {
      this._propertyType = PropertyType.BOOLEAN;
    } else if (propertyType == 'function String() { [native code] }') {
      this._propertyType = PropertyType.STRING;
    } else if (propertyType == 'function Number() { [native code] }') {
      this._propertyType = PropertyType.NUMBER;
    } else if (propertyType == 'function Date() { [native code] }') {
      this._propertyType = PropertyType.DATE;
    } else {
      this._propertyType = PropertyType.UNKNOWN;
    }
    // tslint:enable: triple-equals
  }

  setFieldProperties(name: string, isIdentity: boolean, opts: FieldOpts): void {
    if (this._tmpField) {
      if (this._tmpField.name) {
        throw new Error(`in class '${this.className}: property '${
                                                                  this.key.toString()
                                                                }' is already mapped to '${this._tmpField.name}`);
      }
      this._tmpField.name = name;
    } else {
      this._tmpField = new Field(name);
    }
    this._tmpField.isIdentity = isIdentity;
    this._tmpOpts = opts;
  }

  addForeignKeyProperties(constraintName: string, foreignTableName: string, foreignTableField: string): void {
    if (!this._tmpField) {
      this._tmpField = new Field();
    }
    if (this._tmpField.foreignKeys.has(constraintName)) {
      throw new Error(
          `in class '${this.className}: foreign key '${
                                                       constraintName
                                                     }' is already defined on property '${this.key.toString()}'`);
    }
    const fkFieldDef = new FKFieldDefinition(constraintName, foreignTableName, foreignTableField);
    this._tmpField.setFKField(fkFieldDef);
  }

  addIndex(indexName: string, isUnique?: boolean): void {
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
    if (this._field) {
      throw new Error(
          `meta model property '${this.className}.${this.key.toString()}' already mapped to '${this._field.name}'`);
    }
    if (!this._tmpField) {
      throw new Error(`meta model property '${this.className}.${this.key.toString()}' not mapped to any field'`);
    }
    const metaTable = model.table;

    const fieldName = this._tmpField.name;
    this._field = metaTable.hasTableField(fieldName);
    if (!this._field) {
      this._field = new Field(fieldName);
    }
    const metaField = this._field;
    metaField.isIdentity = this._tmpField.isIdentity;
    if (this._tmpOpts) {
      if (this._tmpOpts.dbtype) {
        metaField.dbtype = this._tmpOpts.dbtype;
      }
      if (this._tmpOpts.isJson) {
        metaField.isJson = this._tmpOpts.isJson;
      }
    }

    if (this._tmpField.indexKeys) {
      this._tmpField.indexKeys.forEach((idxField, idxName) => {
        if (!metaField.isIndexField(idxName)) {
          metaField.setIndexField(idxField);
        }
      });
    }
    if (this._tmpField.foreignKeys) {
      this._tmpField.foreignKeys.forEach((fkFieldDef, constraintName) => {
        if (!metaField.isFKField(constraintName)) {
          metaField.setFKField(fkFieldDef);
        }
      });
    }

    // add this field to the table:
    metaTable.addTableField(metaField);

    // add mapping from column name to this property
    model.mapColNameToProp.set(metaField.name, this);

    // cleanup
    this._tmpField = undefined;
    this._tmpOpts = undefined;
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
          if (field.dbtype.toUpperCase().indexOf('INT') !== -1) {
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
                // TODO: currently not supported
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
