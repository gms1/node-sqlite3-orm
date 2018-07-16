
import {FieldOpts} from './decorators';
import {PropertyType} from './PropertyType';
import {Field} from './Field';
import {Table} from './Table';
import {TableReference} from './TableReference';
import {FieldReference} from './FieldReference';

interface TempData {
  propertyType?: string;
  name?: string;
  isIdentity?: boolean;
  opts?: FieldOpts;
  indexes?: Map<string, {name: string, isUnique: boolean}>;
  foreignKeys?: Map<string, {name: string, foreignTableName: string, foreignTableField: string}>;
}


export class MetaProperty {
  /**
   * The property type enum mapped to this field
   */
  private _propertyType: PropertyType;

  get propertyType(): PropertyType {
    return this._propertyType;
  }

  private _temp: TempData;

  constructor(public readonly className: string, public readonly key: string|symbol) {
    this._propertyType = PropertyType.UNKNOWN;
    this._temp = {};
  }

  setPropertyType(propertyType: string|undefined): void {
    this._temp.propertyType = propertyType;
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
    if (this._temp.name) {
      throw new Error(
          `in class '${this.className}: property '${this.key.toString()}' is already mapped to '${this._temp.name}`);
    }
    this._temp.name = name;
    this._temp.isIdentity = isIdentity;
    this._temp.opts = opts;
  }

  addForeignKeyProperties(constraintName: string, foreignTableName: string, foreignTableField: string): void {
    if (!this._temp.foreignKeys) {
      this._temp.foreignKeys = new Map<string, {name: string, foreignTableName: string, foreignTableField: string}>();
    }
    if (this._temp.foreignKeys.has(constraintName)) {
      throw new Error(
          `in class '${this.className}: foreign key '${
                                                       constraintName
                                                     }' is already defined on property '${this.key.toString()}'`);
    }
    this._temp.foreignKeys.set(constraintName, {name: constraintName, foreignTableName, foreignTableField});
  }

  addIndex(indexName: string, isUnique: boolean = false): void {
    if (isUnique) {
      // TODO: implement unique index
      throw new Error(`index ${indexName}: sorry, creating unique indexes is currently not supported`);
    }
    if (!this._temp.indexes) {
      this._temp.indexes = new Map<string, {name: string, isUnique: boolean}>();
    }
    if (this._temp.indexes.has(indexName)) {
      throw new Error(
          `in class '${this.className}': index '${indexName}' is already defined on property '${this.key.toString()}'`);
    }
    this._temp.indexes.set(indexName, {name: indexName, isUnique});
  }

  buildFieldDefinition(metaTable: Table): Field {
    const metaField = new Field(this.key);
    metaField.propertyType = this._temp.propertyType;
    metaField.name = this._temp.name as string;
    metaField.isIdentity = !!this._temp.isIdentity;
    const opts = this._temp.opts as FieldOpts;
    if (opts.dbtype) {
      metaField.dbtype = opts.dbtype;
    }
    if (opts.isJson) {
      metaField.isJson = opts.isJson;
    }

    metaTable.addPropertyField(metaField);
    if (this._temp.indexes) {
      this._temp.indexes.forEach((value) => {
        // TODO: implement unique index
        metaField.setIndexField(value.name);

      });
    }
    if (this._temp.foreignKeys) {
      this._temp.foreignKeys.forEach((value) => {
        let tableRef = metaTable.hasTableReference(value.name);
        if (!tableRef) {
          tableRef = new TableReference(value.name, value.foreignTableName);
          metaTable.addTableReference(tableRef);
        }
        metaField.setForeignKeyField(value.name, new FieldReference(tableRef, value.foreignTableField));
      });
    }
    metaTable.addTableField(metaField);
    return metaField;
  }
}
