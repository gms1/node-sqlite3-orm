import {SQL_DEFAULT_SCHEMA, SqlDatabase} from '../core';
import {FKDefinition} from '../metadata';
import {quoteSimpleIdentifier, splitSchemaIdentifier} from '../utils';

import {DbColumnInfo, DbForeignKeyInfo, DbIndexColumnInfo, DbIndexInfo, DbTableInfo} from './DbTableInfo';

export class DbCatalogDAO {
  sqldb: SqlDatabase;

  constructor(sqldb: SqlDatabase) {
    this.sqldb = sqldb;
  }

  readSchemas(): Promise<string[]> {
    const schemas: string[] = [];
    return this.sqldb.all(`PRAGMA database_list`).then((res) => {
      res.forEach((db) => schemas.push(db.name));
      return schemas;
    });
  }

  readTables(schemaName: string): Promise<string[]> {
    const tables: string[] = [];
    const quotedSchemaName = quoteSimpleIdentifier(schemaName);
    return this.sqldb.all(`select * from ${quotedSchemaName}.sqlite_master where type='table'`).then((res) => {
      res.forEach((tab) => tables.push(tab.name));
      return tables;
    });
  }

  async readTableInfo(tableName: string, schemaName?: string): Promise<DbTableInfo|undefined> {
    try {
      const {identName, identSchema} = splitSchemaIdentifier(tableName);
      tableName = identName;
      schemaName = identSchema || schemaName || SQL_DEFAULT_SCHEMA;

      const quotedName = quoteSimpleIdentifier(tableName);
      const quotedSchema = quoteSimpleIdentifier(schemaName);

      // TODO: sqlite3 issue regarding schema queries from multiple connections
      // The result of table_info seems to be somehow cached, so subsequent calls to table_info may return wrong results
      // The scenario where this problem was detected:
      //    connection 1:   PRAGMA table_info('FOO_TABLE') => ok (no data)
      //    connection 2:   PRAGMA table_info('FOO_TABLE') => ok (no data)
      //    connection 2:   CREATE TABLE FOO_TABLE (...)
      //    connection 3:   PRAGMA table_info('FOO_TABLE') => ok (data)
      //    connection 2:   PRAGMA table_info('FOO_TABLE') => ok (data)
      //    connection 1:   PRAGMA table_info('FOO_TABLE') => NOT OK (NO DATA)
      // known workarounds:
      //    1) perform all schema discovery and schema modifications from the same connection
      //    2) if using a connection pool, do not recycle a connection after performing schema queries
      //    3) not verified yet: using shared cache

      //  workaround for issue described above (required by e.g 'loopback-connector-sqlite3x')
      this.sqldb.dirty = true;

      const tableInfo = await this.callSchemaQueryPragma('table_info', quotedName, quotedSchema);
      if (tableInfo.length === 0) {
        return undefined;
      }
      const idxList = await this.callSchemaQueryPragma('index_list', quotedName, quotedSchema);
      const fkList = await this.callSchemaQueryPragma('foreign_key_list', quotedName, quotedSchema);

      const info: DbTableInfo = {
        name: `${schemaName}.${tableName}`,
        tableName,
        schemaName,
        columns: {},
        primaryKey: [],
        indexes: {},
        foreignKeys: {}
      };


      tableInfo.sort((colA, colB) => colA.pk - colB.pk).forEach((col) => {
        const colInfo: DbColumnInfo = {
          name: col.name,
          type: col.type,
          typeAffinity: DbCatalogDAO.getTypeAffinity(col.type),
          notNull: !!col.notnull,
          defaultValue: col.dflt_value
        };
        info.columns[col.name] = colInfo;
        if (col.pk) {
          info.primaryKey.push(col.name);
        }
      });

      if (info.primaryKey.length === 1 && info.columns[info.primaryKey[0]].typeAffinity === 'INTEGER') {
        // dirty hack to check if this column is autoincrementable
        // not checked: if autoincrement is part of column/index/foreign key name
        // not checked: if autoincrement is part of default literal text
        // however, test is sufficient for autoupgrade
        const schema = quotedSchema || '"main"';
        const res = await this.sqldb.all(
            `select * from ${
                             schema
                           }.sqlite_master where type='table' and name=:tableName and UPPER(sql) like '%AUTOINCREMENT%'`,
            {':tableName': tableName});
        if (res && res.length === 1) {
          info.autoIncrement = true;
        }
      }

      const promises: Promise<DbIndexInfo>[] = [];
      idxList.forEach((idx) => {
        if (idx.origin !== 'pk') {
          promises.push(new Promise((resolve, reject) => {
            const idxInfo: DbIndexInfo = {name: idx.name, unique: !!idx.unique, partial: !!idx.partial, columns: []};
            this.callSchemaQueryPragma('index_xinfo', quoteSimpleIdentifier(idx.name), quotedSchema)
                .then((xinfo) => {
                  xinfo.sort((idxColA, idxColB) => idxColA.seqno - idxColB.seqno).forEach((idxCol) => {
                    if (idxCol.cid >= 0) {
                      const idxColInfo: DbIndexColumnInfo =
                          {name: idxCol.name, desc: !!idxCol.desc, coll: idxCol.coll, key: !!idxCol.key};
                      idxInfo.columns.push(idxColInfo);
                    }
                  });
                  return idxInfo;
                })
                .then((val) => resolve(val))
                .catch(/* istanbul ignore next */ (err) => reject(err));
          }));
        }
      });
      const indexInfos = await Promise.all(promises);
      indexInfos.forEach((idxInfo) => {
        info.indexes[idxInfo.name] = idxInfo;
      });

      // NOTE: because we are currently not able to discover the FK constraint name
      // (not reported by 'foreign_key_list' pragma)
      // we are currently using a 'genericForeignKeyId' here, which is readable, but does not look like an identifier
      let lastId: number;
      let lastFk: any;
      let fromCols: string[] = [];
      let toCols: string[] = [];
      // tslint:disable-next-line restrict-plus-operands
      fkList.sort((fkA, fkB) => (fkA.id * 1000 + fkA.seq) - (fkB.id * 1000 + fkB.seq)).forEach((fk) => {
        if (lastId === fk.id) {
          // continue
          fromCols.push(fk.from);
          toCols.push(fk.to);
        } else {
          // old fk
          if (lastFk) {
            const fkInfo: DbForeignKeyInfo = {refTable: lastFk.table, columns: fromCols, refColumns: toCols};
            info.foreignKeys[FKDefinition.genericForeignKeyId(fromCols, lastFk.table, toCols)] = fkInfo;
          }
          // new fk
          lastId = fk.id;
          lastFk = fk;
          fromCols = [];
          toCols = [];
          fromCols.push(fk.from);
          toCols.push(fk.to);
        }
      });
      if (lastFk) {
        const fkInfo: DbForeignKeyInfo = {refTable: lastFk.table, columns: fromCols, refColumns: toCols};
        info.foreignKeys[FKDefinition.genericForeignKeyId(fromCols, lastFk.table, toCols)] = fkInfo;
      }
      return info;
    } catch (err) {
      /* istanbul ignore next */
      return Promise.reject(err);
    }
  }

  protected callSchemaQueryPragma(pragmaName: string, identifierName: string, identifierSchema: string):
      Promise<any[]> {
    return this.sqldb.all(`PRAGMA ${identifierSchema}.${pragmaName}(${identifierName})`);
  }



  static getTypeAffinity(typeDef: string): string {
    const type = typeDef.toUpperCase();
    if (type.indexOf('INT') !== -1) {
      return 'INTEGER';
    }
    const textMatches = /(CHAR|CLOB|TEXT)/.exec(type);
    if (textMatches) {
      return 'TEXT';
    }
    if (type.indexOf('BLOB') !== -1) {
      return 'BLOB';
    }
    const realMatches = /(REAL|FLOA|DOUB)/.exec(type);
    if (realMatches) {
      return 'REAL';
    }
    return 'NUMERIC';
  }
}
