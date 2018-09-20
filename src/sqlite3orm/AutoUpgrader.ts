// tslint:disable-next-line no-require-imports
import * as _dbg from 'debug';

import {SqlDatabase} from './core/SqlDatabase';
import {DbCatalogDAO, DbTableInfo} from './dbcatalog';
import {Field, FKDefinition, schema, Table} from './metadata';
import {PromiseFactories, qualifiyIdentifier, quoteIdentifier, sequentialize} from './utils';

const debug = _dbg('sqlite3orm:autoupgrade');

export interface UpgradeOptions {
  keepOldColumns?: boolean;
  forceRecreate?: boolean;
}

export enum UpgradeMode {
  ACTUAL = 0,
  CREATE = 1,
  ALTER,
  RECREATE
}

export interface UpgradeInfo {
  tableInfo?: DbTableInfo;
  upgradeMode: UpgradeMode;
  opts?: UpgradeOptions;
}

export class AutoUpgrader {
  static defaults?: UpgradeOptions;

  private readonly sqldb: SqlDatabase;
  private readonly catalogDao: DbCatalogDAO;

  constructor(sqldb: SqlDatabase) {
    this.sqldb = sqldb;
    this.catalogDao = new DbCatalogDAO(sqldb);
  }

  /*
   * upgrade all registered tables
   */
  /* istanbul ignore next */
  upgradeAllTables(opts?: UpgradeOptions): Promise<void> {
    return this.upgradeTables(schema().getAllTables(), opts);
  }

  /*
   * upgrade specified tables
   */
  async upgradeTables(tables: Table[]|Table, opts?: UpgradeOptions): Promise<void> {
    let fkEnabled: boolean;
    let error: Error|undefined;

    // set fkEnabled and if foreign key constraints are enabled, disable them
    try {
      fkEnabled = await this.foreignKeyEnabled();
      if (fkEnabled) {
        await this.foreignKeyEnable(false);
      }
    } catch (e /* istanbul ignore next */) {
      return Promise.reject(e);
    }

    // upgrade tables
    try {
      if (Array.isArray(tables)) {
        const factories: PromiseFactories<void> = [];
        tables.forEach((table) => {
          factories.push(() => this._upgradeTable(table, opts));
        });

        await sequentialize(factories);

      } else {
        await this._upgradeTable(tables, opts);
      }
    } catch (e) {
      error = e;
    }

    // If foreign key constraints were originally enabled, enable them again
    if (fkEnabled) {
      try {
        await this.foreignKeyEnable(true);
      } catch (e /* istanbul ignore next */) {
        if (!error) {
          error = e;
        }
      }
    }
    if (error) {
      return Promise.reject(error);
    }
  }


  isActual(tables: Table|Table[], opts?: UpgradeOptions): Promise<boolean> {
    const promises: Promise<boolean>[] = [];
    if (Array.isArray(tables)) {
      tables.forEach((tab) => {
        promises.push(this.getUpgradeInfo(tab, opts).then((info) => info.upgradeMode === UpgradeMode.ACTUAL));
      });
    } else {
      promises.push(this.getUpgradeInfo(tables, opts).then((info) => info.upgradeMode === UpgradeMode.ACTUAL));
    }
    return Promise.all(promises).then((results) => results.reduce((prev, curr) => prev && curr));
  }


  async getUpgradeInfo(table: Table, opts?: UpgradeOptions): Promise<UpgradeInfo> {
    let tableInfo: DbTableInfo|undefined;
    try {
      tableInfo = await this.catalogDao.readTableInfo(table.name);
    } catch (err /* istanbul ignore next */) {
      return Promise.reject(err);
    }
    return this._getUpgradeInfo(table, tableInfo, opts);
  }


  // tslint:disable cyclomatic-complexity
  protected _getUpgradeInfo(table: Table, tableInfo?: DbTableInfo, opts?: UpgradeOptions): UpgradeInfo {
    opts = AutoUpgrader.defaults || opts ? Object.assign({}, AutoUpgrader.defaults, opts) : undefined;

    if (!tableInfo) {
      debug(`  does not exist`);
      return {tableInfo, opts, upgradeMode: UpgradeMode.CREATE};
    }
    if (opts && opts.forceRecreate) {
      debug(`  forcing recreate`);
      return {tableInfo, opts, upgradeMode: UpgradeMode.RECREATE};
    }

    // test if foreign key definitions are equal, otherwise return UpgradeMode.RECREATE
    if (table.mapNameToFKDef.size !== Object.keys(tableInfo.foreignKeys).length) {
      debug(`  foreign key added or removed`);
      return {tableInfo, opts, upgradeMode: UpgradeMode.RECREATE};
    }
    for (const fk of table.mapNameToFKDef.values()) {
      const genName = FKDefinition.genericForeignKeyId(
          fk.fields.map((f) => f.name), fk.foreignTableName, fk.fields.map((field) => field.foreignColumnName));
      if (!tableInfo.foreignKeys[genName]) {
        debug(`  foreign key definition for '${fk.name}' changed`);
        return {tableInfo, opts, upgradeMode: UpgradeMode.RECREATE};
      }
    }

    // test if no column needs to be dropped, otherwise return UpgradeMode.RECREATE
    const keepOldColumns = opts && opts.keepOldColumns ? true : false;
    let oldColumnsCount = 0;
    for (const colName of Object.keys(tableInfo.columns)) {
      const field = table.mapNameToField.get(colName);
      if (!field) {
        if (!keepOldColumns || tableInfo.columns[colName].notNull) {
          if (keepOldColumns) {
            debug(`  column to keep '${colName} as nullable'`);
          } else {
            debug(`  column dropped '${colName}'`);
          }
          return {tableInfo, opts, upgradeMode: UpgradeMode.RECREATE};
        } else {
          oldColumnsCount += 1;
          debug(`  column to keep '${colName}'`);
          continue;
        }
      }
      const newFldDef = Field.parseDbType(field.dbtype);
      if (!newFldDef || (newFldDef.typeAffinity !== tableInfo.columns[colName].typeAffinity) ||
          (newFldDef.notNull !== tableInfo.columns[colName].notNull) ||
          // tslint:disable-next-line triple-equals
          (newFldDef.defaultValue != tableInfo.columns[colName].defaultValue)) {
        debug(`  column changed '${colName}'`);
        // debug(`    old: `, JSON.stringify(tableInfo.columns[colName]));
        // debug(`    new: `, JSON.stringify(newFldDef));
        return {tableInfo, opts, upgradeMode: UpgradeMode.RECREATE};
      }
    }

    // test if primary key columns are equal, otherwise return UpgradeMode.RECREATE
    if (table.mapNameToIdentityField.size !== tableInfo.primaryKey.length) {
      debug(`  primary key column added or removed`);
      return {tableInfo, opts, upgradeMode: UpgradeMode.RECREATE};
    }

    let pkIdx = 0;
    for (const fld of table.fields) {
      if (!table.mapNameToIdentityField.has(fld.name)) {
        continue;
      }
      if (fld.name !== tableInfo.primaryKey[pkIdx++]) {
        debug(`  primary key column changed`);
        return {tableInfo, opts, upgradeMode: UpgradeMode.RECREATE};
      }
    }

    // test if autoIncrement is equal, otherwise return UpgradeMode.RECREATE
    if (table.autoIncrementField && !tableInfo.autoIncrement || !table.autoIncrementField && tableInfo.autoIncrement) {
      debug(`  autoIncrement changed`);
      return {tableInfo, opts, upgradeMode: UpgradeMode.RECREATE};
    }

    // test if no column needs to be added, otherwise return UpgradeMode.ALTER
    if ((Object.keys(tableInfo.columns).length - oldColumnsCount) !== table.fields.length) {
      debug(`  column(s) added`);
      return {tableInfo, opts, upgradeMode: UpgradeMode.ALTER};
    }

    // test if no index needs to be changed, otherwise return UpgradeMode.ALTER
    if ((Object.keys(tableInfo.indexes).length) !== table.mapNameToIDXDef.size) {
      debug(`  indexes added or removed`);
      return {tableInfo, opts, upgradeMode: UpgradeMode.ALTER};
    }
    for (const name of Object.keys(tableInfo.indexes)) {
      const idx = table.mapNameToIDXDef.get(qualifiyIdentifier(name));
      if (!idx) {
        debug(`  index '${name}' dropped`);
        return {tableInfo, opts, upgradeMode: UpgradeMode.ALTER};
      }
      const oldCols = tableInfo.indexes[name].columns.map((idxCol) => idxCol.name).join(',');
      const newCols = idx.fields.map((fld) => fld.name).join(',');
      if (oldCols !== newCols) {
        debug(`  index '${name}' changed`);
        // debug(`     old: ${oldCols}`);
        // debug(`     new: ${newCols}`);
        return {tableInfo, opts, upgradeMode: UpgradeMode.ALTER};
      }
    }

    // tslint:enable cyclomatic-complexity
    return {tableInfo, opts, upgradeMode: UpgradeMode.ACTUAL};
  }


  protected async _upgradeTable(table: Table, opts?: UpgradeOptions): Promise<void> {
    debug(`upgradeTable(${table.name}):`);
    let upgradeInfo: UpgradeInfo;
    try {
      upgradeInfo = await this.getUpgradeInfo(table, opts);
    } catch (err /* istanbul ignore next */) {
      return Promise.reject(err);
    }
    switch (upgradeInfo.upgradeMode) {
      case UpgradeMode.ACTUAL:
        return;
      case UpgradeMode.CREATE:
        return this.createTable(table);
      case UpgradeMode.ALTER:
        return this.alterTable(table, upgradeInfo);
      case UpgradeMode.RECREATE:
        return this.recreateTable(table, upgradeInfo);
        /* istanbul ignore next */
      default:
        return Promise.reject(`table '${table.name}': unknown upgrade-mode detected`);
    }
  }


  /*
   * create table and indexes
   */
  protected createTable(table: Table): Promise<void> {
    const factories: PromiseFactories<void> = [];

    debug(`  => create table`);

    // create table
    factories.push(() => this.sqldb.exec(table.getCreateTableStatement(true)));

    // create all indexes
    table.mapNameToIDXDef.forEach((idx) => {
      debug(`  => create index '${idx.name}'`);
      factories.push(() => this.sqldb.exec(table.getCreateIndexStatement(idx.name)));
    });
    return sequentialize(factories).then(() => {});
  }


  /*
   * alter table and add missing table colums and indexes
   */
  protected alterTable(table: Table, upgradeInfo: UpgradeInfo): Promise<void> {
    const tableInfo = upgradeInfo.tableInfo as DbTableInfo;
    const factories: PromiseFactories<void> = [];

    debug(`  => alter table`);

    // add missing columns
    table.mapNameToField.forEach((field) => {
      if (!tableInfo.columns[field.name]) {
        debug(`  => alter table add column '${field.name}'`);
        factories.push(() => this.sqldb.exec(table.getAlterTableAddColumnStatement(field.name)));
      }
    });

    // drop indexes
    Object.keys(tableInfo.indexes).forEach((name) => {
      const idx = table.mapNameToIDXDef.get(qualifiyIdentifier(name));
      if (!idx) {
        debug(`  => drop index '${name}'`);
        factories.push(() => this.sqldb.exec(`DROP INDEX IF EXISTS ${quoteIdentifier(name)}`));
        delete tableInfo.indexes[name];  // delete to enable re-creation
        return;
      }
      const oldCols = tableInfo.indexes[name].columns.map((idxCol) => idxCol.name).join(',');
      const newCols = idx.fields.map((fld) => fld.name).join(',');
      if (oldCols !== newCols) {
        debug(`  => drop index '${name}' (changed)`);
        // debug(`     oldCols='${oldCols}'`);
        // debug(`     newCols='${newCols}'`);
        factories.push(() => this.sqldb.exec(`DROP INDEX IF EXISTS ${quoteIdentifier(name)}`));
        delete tableInfo.indexes[name];  // delete to enable re-creation
        return;
      }
    });

    // add missing indexes
    table.mapNameToIDXDef.forEach((idx) => {
      if (!tableInfo.indexes[idx.name]) {
        debug(`  => create index '${idx.name}'`);
        factories.push(() => this.sqldb.exec(table.getCreateIndexStatement(idx.name)));
      }
    });

    return sequentialize(factories).then(() => {});
  }



  /*
   * recreate table
   */
  protected recreateTable(table: Table, upgradeInfo: UpgradeInfo): Promise<void> {
    const tableInfo = upgradeInfo.tableInfo as DbTableInfo;
    const addFields: Field[] = [];
    const factories: PromiseFactories<void> = [];

    debug(`  => recreate table`);
    const keepOldColumns = upgradeInfo.opts && upgradeInfo.opts.keepOldColumns ? true : false;

    if (keepOldColumns) {
      for (const colName of Object.keys(tableInfo.columns)) {
        const field = table.mapNameToField.get(colName);
        if (field) {
          continue;
        }
        const addField = new Field(colName, false);

        // NOTE: these columns should always be nullable
        addField.dbtype = tableInfo.columns[colName].type;
        const defaultValue = tableInfo.columns[colName].defaultValue;
        // tslint:disable-next-line triple-equals
        if (defaultValue != undefined) {
          addField.dbtype += ` DEFAULT(${defaultValue.toString()})`;
        }
        addFields.push(addField);
      }
    }
    const tmpTableName = quoteIdentifier(table.name + '_autoupgrade');

    // rename old table
    factories.push(() => this.sqldb.exec(`ALTER TABLE ${table.quotedName} RENAME TO ${tmpTableName}`));

    // create table
    factories.push(() => this.sqldb.exec(table.createCreateTableStatement(true, addFields)));

    // data transfer
    let colNames;
    if (keepOldColumns) {
      colNames = Object.keys(tableInfo.columns).map((colName) => quoteIdentifier(colName)).join(',');
    } else {
      colNames = Object.keys(tableInfo.columns)
                     .filter((colName) => table.mapNameToField.has(colName))
                     .map((colName) => quoteIdentifier(colName))
                     .join(',');
    }

    const insertStmt = `INSERT INTO ${table.quotedName} (
  ${colNames}
) SELECT
  ${colNames}
FROM  ${tmpTableName}`;

    factories.push(() => this.sqldb.exec(insertStmt));

    // drop old table
    factories.push(() => this.sqldb.exec(`DROP TABLE ${tmpTableName}`));


    // create all indexes
    table.mapNameToIDXDef.forEach((idx) => {
      debug(`  => create index '${idx.name}'`);
      factories.push(() => this.sqldb.exec(table.getCreateIndexStatement(idx.name)));
    });

    return this.sqldb.transactionalize(() => sequentialize(factories).then(() => {}));
  }


  /*
   * get current foreign key enforcement status
   */
  foreignKeyEnabled(): Promise<boolean> {
    return this.sqldb.get('PRAGMA foreign_keys').then((row: any) => !!row.foreign_keys);
  }

  /*
   * set current foreign key enforcement status
   */
  foreignKeyEnable(enable: boolean): Promise<void> {
    const val = enable ? 'TRUE' : 'FALSE';
    return this.sqldb.exec(`PRAGMA foreign_keys = ${val}`);
  }



  static debug(formatter: any, ...args: any[]): void {
    debug(formatter, ...args);
  }
}
