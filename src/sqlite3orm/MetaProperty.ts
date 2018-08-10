// import * as core from './core';

// tslint:disable-next-line no-require-imports
import {FieldOpts} from './decorators';
import {PropertyType} from './PropertyType';
import {Field} from './Field';
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



  init(model: MetaModel, name: string, isIdentity: boolean, opts: FieldOpts): void {
    try {
      this._field = model.table.getOrAddTableField(name, isIdentity, opts, this.propertyType);
    } catch (err) {
      throw new Error(`property '${this.className}.${this.key.toString()}': failed to add field: ${err.message}`);
    }

    // add mapping from column name to this property
    model.mapColNameToProp.set(this._field.name, this);
  }
}
