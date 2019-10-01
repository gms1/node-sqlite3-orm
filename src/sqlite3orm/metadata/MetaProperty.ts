// import * as core from './core';

// tslint:disable-next-line no-require-imports
import { FieldOpts } from './decorators';
import { DEFAULT_VALUE_TRANSFORMERS } from './DefaultValueTransformers';
import { Field } from './Field';
import { KeyType, MetaModel } from './MetaModel';
import { PropertyType } from './PropertyType';
import { ValueTransformer } from './ValueTransformer';

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
    throw new Error(
      `meta model property '${this.className}.${this.key.toString()}' not fully initialized yet`,
    );
  }

  private _transform!: ValueTransformer;
  public get transform(): ValueTransformer {
    return this._transform;
  }

  constructor(public readonly className: string, public readonly key: KeyType) {
    this._propertyType = PropertyType.UNKNOWN;
  }

  // called from decorator
  setPropertyType(propertyType: Function | string): void {
    let typeName: string;
    /* istanbul ignore else */
    if (typeof propertyType === 'function') {
      typeName = propertyType.name.toLowerCase();
    } else {
      typeName = propertyType.toLowerCase();
    }
    switch (typeName) {
      case 'boolean':
        this._propertyType = PropertyType.BOOLEAN;
        break;
      case 'string':
        this._propertyType = PropertyType.STRING;
        break;
      case 'number':
        this._propertyType = PropertyType.NUMBER;
        break;
      case 'date':
        this._propertyType = PropertyType.DATE;
        break;
      default:
        this._propertyType = PropertyType.UNKNOWN;
        break;
    }
  }

  valueToDB(value: any): any {
    return this._transform.toDB(value);
  }

  getDBValueFromModel(model: any): any {
    return this._transform.toDB(Reflect.get(model, this.key));
  }

  setDBValueIntoModel(model: any, value: any): void {
    Reflect.set(model, this.key, this._transform.fromDB(value));
  }

  /**
   * Get the name for the corresponding host parameter
   *
   * @returns {string}
   */
  public getHostParameterName(prefix?: string): string {
    prefix = prefix || '';
    return `:${prefix}${this.key.toString()}`;
  }

  init(model: MetaModel, name: string, isIdentity: boolean, opts: FieldOpts): void {
    try {
      this._field = model.table.getOrAddTableField(name, isIdentity, opts, this.propertyType);
    } catch (err) {
      throw new Error(
        `property '${this.className}.${this.key.toString()}': failed to add field: ${err.message}`,
      );
    }

    // add mapping from column name to this property
    model.mapColNameToProp.set(this._field.name, this);

    // init transform
    const typeAffinity = this.field.dbTypeInfo.typeAffinity;

    if (opts.transform) {
      this._transform = opts.transform;
    } else {
      if (this.field.isJson) {
        this._transform = DEFAULT_VALUE_TRANSFORMERS.json;
      } else {
        switch (this.propertyType) {
          /* BOOLEAN */
          case PropertyType.BOOLEAN:
            if (typeAffinity === 'TEXT') {
              this._transform = DEFAULT_VALUE_TRANSFORMERS.booleanText;
            } else {
              this._transform = DEFAULT_VALUE_TRANSFORMERS.booleanNumber;
            }
            break;
          case PropertyType.DATE:
            if (typeAffinity === 'TEXT') {
              this._transform = DEFAULT_VALUE_TRANSFORMERS.dateText;
            } else {
              if (this._field.dateInMilliSeconds) {
                this._transform = DEFAULT_VALUE_TRANSFORMERS.dateIntegerAsMilliseconds;
              } else {
                this._transform = DEFAULT_VALUE_TRANSFORMERS.dateIntegerAsSeconds;
              }
            }
            break;
          case PropertyType.NUMBER:
            if (typeAffinity === 'TEXT') {
              this._transform = DEFAULT_VALUE_TRANSFORMERS.numberText;
            } else {
              this._transform = DEFAULT_VALUE_TRANSFORMERS.numberDefault;
            }
            break;
          case PropertyType.STRING:
            if (typeAffinity === 'TEXT') {
              this._transform = DEFAULT_VALUE_TRANSFORMERS.stringDefault;
            } else {
              this._transform = DEFAULT_VALUE_TRANSFORMERS.stringNumber;
            }
            break;
          default:
            this._transform = DEFAULT_VALUE_TRANSFORMERS.unknownDefault;
            break;
        }
      }
    }
  }
}
