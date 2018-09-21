import {SqlDatabase} from '../core';
import {FKDefinition} from '../metadata';
import {quoteSimpleIdentifier, splitIdentifiers} from '../utils';

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
      if (!schemaName) {
        // tableName could be qualified by schema
        const {identName, identSchema} = splitIdentifiers(tableName);
        tableName = identName;
        schemaName = identSchema;
      }

      const quotedName = quoteSimpleIdentifier(tableName);
      const quotedSchema = schemaName ? quoteSimpleIdentifier(schemaName) : undefined;

      const tableInfo = await this.callSchemaQueryPragma('table_info', quotedName, quotedSchema);
      if (tableInfo.length === 0) {
        return undefined;
      }
      const idxList = await this.callSchemaQueryPragma('index_list', quotedName, quotedSchema);
      const fkList = await this.callSchemaQueryPragma('foreign_key_list', quotedName, quotedSchema);

      const info: DbTableInfo = {
        name: schemaName ? `${schemaName}.${tableName}` : tableName,
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

  protected schemaQueryPragma(pragmaName: string, identifierName: string, identifierSchema?: string): string {
    if (identifierSchema) {
      return `${identifierSchema}.${pragmaName}(${identifierName})`;
    } else {
      return `${pragmaName}(${identifierName})`;
    }
  }

  protected callSchemaQueryPragma(pragmaName: string, identifierName: string, identifierSchema?: string):
      Promise<any[]> {
    return this.sqldb.all(`PRAGMA ${this.schemaQueryPragma(pragmaName, identifierName, identifierSchema)}`);
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
