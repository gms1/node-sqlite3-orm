import { backtickQuoteSimpleIdentifier } from '../utils';
import { DbColumnTypeInfo, DbCatalogDAO } from '../dbcatalog';
import { PropertyType } from './PropertyType';
import { FieldOpts } from './decorators';
import { schema } from './Schema';

/**
 * Class holding a field definition
 *
 * @export
 * @class Field
 */
export class Field {
  /**
   * The name of the column
   */
  public name!: string;

  /**
   * The quoted field name
   */
  get quotedName(): string {
    return backtickQuoteSimpleIdentifier(this.name);
  }

  private _dbDefaultType!: string;
  get dbDefaultType(): string {
    return this._dbDefaultType;
  }
  set dbDefaultType(dbType: string) {
    this._dbDefaultType = dbType;
    if (!this._dbtype) {
      this._dbTypeInfo = Field.parseDbType(this._dbDefaultType);
    }
  }

  /**
   * The type of the table column
   */
  private _dbtype?: string;
  private _dbTypeInfo!: DbColumnTypeInfo;

  get dbtype(): string {
    return this._dbtype ? this._dbtype : this.dbDefaultType;
  }
  set dbtype(dbType: string) {
    this._dbtype = dbType;
    this._dbTypeInfo = Field.parseDbType(this._dbtype);
  }
  get isDbTypeDefined(): boolean {
    return this._dbtype ? true : false;
  }

  get dbTypeInfo(): DbColumnTypeInfo {
    return this._dbTypeInfo;
  }

  /**
   * If this property should be serialized/deserialized to the database as Json data
   */
  private _isJson?: boolean;

  get isJson(): boolean {
    // tslint:disable-next-line triple-equals
    return this._isJson == undefined ? false : this._isJson;
  }
  set isJson(isJson: boolean) {
    this._isJson = isJson;
  }
  get isIsJsonDefined(): boolean {
    // tslint:disable-next-line triple-equals
    return this._isJson == undefined ? false : true;
  }

  private _dateInMilliSeconds?: boolean;
  get dateInMilliSeconds(): boolean {
    // tslint:disable-next-line triple-equals
    return this._dateInMilliSeconds == undefined
      ? schema().dateInMilliSeconds
      : this._dateInMilliSeconds;
  }
  set dateInMilliSeconds(val: boolean) {
    this._dateInMilliSeconds = val;
  }
  get isDateInMilliSecondsDefined(): boolean {
    // tslint:disable-next-line triple-equals
    return this._dateInMilliSeconds == undefined ? false : true;
  }

  /**
   * Flag if this field is part of the primary key
   */
  isIdentity: boolean;

  /**
   * Creates an instance of Field.
   *
   */
  public constructor(
    name: string,
    isIdentity?: boolean,
    opts?: FieldOpts,
    propertyType?: PropertyType,
  ) {
    this.name = name;
    this.isIdentity = !!isIdentity;

    this.setDbDefaultType(propertyType, opts);
    if (opts) {
      if (opts.dbtype) {
        this.dbtype = opts.dbtype;
      }
      // tslint:disable-next-line triple-equals
      if (opts.isJson != undefined) {
        this._isJson = opts.isJson;
      }
      // tslint:disable-next-line triple-equals
      if (opts.dateInMilliSeconds != undefined) {
        this._dateInMilliSeconds = opts.dateInMilliSeconds;
      }
    }
  }

  setDbDefaultType(propertyType?: PropertyType, opts?: FieldOpts): void {
    switch (propertyType) {
      case PropertyType.BOOLEAN:
      case PropertyType.DATE:
        if (opts && opts.notNull) {
          this.dbDefaultType = 'INTEGER NOT NULL';
        } else {
          this.dbDefaultType = 'INTEGER';
        }
        break;
      case PropertyType.NUMBER:
        if (this.isIdentity) {
          this.dbDefaultType = 'INTEGER NOT NULL';
        } else {
          if (opts && opts.notNull) {
            this.dbDefaultType = 'REAL NOT NULL';
          } else {
            this.dbDefaultType = 'REAL';
          }
        }
        break;
      default:
        // otherwise 'TEXT' will be used as default
        if (opts && opts.notNull) {
          this.dbDefaultType = 'TEXT NOT NULL';
        } else {
          this.dbDefaultType = 'TEXT';
        }
        break;
    }
  }

  static parseDbType(dbtype: string): DbColumnTypeInfo {
    const typeDefMatches = /^\s*((\w+)(\s*\(\s*\d+\s*(,\s*\d+\s*)?\))?)(.*)$/.exec(dbtype);

    /* istanbul ignore if */
    if (!typeDefMatches) {
      throw new Error(`failed to parse '${dbtype}'`);
    }
    const typeAffinity = DbCatalogDAO.getTypeAffinity(typeDefMatches[2]);
    const rest = typeDefMatches[5];

    const notNull = /\bNOT\s+NULL\b/i.exec(rest) ? true : false;

    let defaultValue;
    const defaultNumberMatches = /\bDEFAULT\s+([+-]?\d+(\.\d*)?)/i.exec(rest);
    if (defaultNumberMatches) {
      defaultValue = defaultNumberMatches[1];
    }
    const defaultLiteralMatches = /\bDEFAULT\s+(('[^']*')+)/i.exec(rest);
    if (defaultLiteralMatches) {
      defaultValue = defaultLiteralMatches[1];
      defaultValue.replace(/\'\'/g, "'");
    }
    const defaultExprMatches = /\bDEFAULT\s*\(([^\)]*)\)/i.exec(rest);
    if (defaultExprMatches) {
      defaultValue = defaultExprMatches[1];
    }

    // debug(`dbtype='${dbtype}'`);
    // debug(`type='${typeName}'`);
    // debug(`notNull='${notNull}'`);
    // debug(`default='${defaultValue}'`);
    return { typeAffinity, notNull, defaultValue };
  }
}
