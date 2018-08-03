import {DbTableInfo, DbColumnInfo, DbIndexInfo, DbForeignKeyInfo, DbIndexColumnInfo} from './DbTableInfo';
import {SqlDatabase} from './SqlDatabase';
import {quoteAndSplitIdentifiers, quoteSimpleIdentifier} from './utils';

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

  async readTableInfo(fullTableName: string): Promise<DbTableInfo|undefined> {
    try {
      const {identName, identSchema} = quoteAndSplitIdentifiers(fullTableName);
      const tableInfo = await this.callSchemaPragma('table_info', identName, identSchema);
      if (tableInfo.length === 0) {
        return undefined;
      }
      const idxList = await this.callSchemaPragma('index_list', identName, identSchema);
      const fkList = await this.callSchemaPragma('foreign_key_list', identName, identSchema);

      const info: DbTableInfo = {name: fullTableName, columns: {}, primaryKey: [], indexes: {}, foreignKeys: {}};


      tableInfo.sort((colA, colB) => colA.pk - colB.pk).forEach((col) => {
        const colInfo:
            DbColumnInfo = {name: col.name, type: col.type, notNull: !!col.notnull, defaultValue: col.dflt_value};
        info.columns[col.name] = colInfo;
        if (col.pk) {
          info.primaryKey.push(col.name);
        }
      });

      const promises: Promise<DbIndexInfo>[] = [];
      idxList.forEach((idx) => {
        if (idx.origin !== 'pk') {
          promises.push(new Promise((resolve, reject) => {
            const idxInfo: DbIndexInfo = {name: idx.name, unique: !!idx.unique, partial: !!idx.partial, columns: []};
            this.callSchemaPragma('index_xinfo', quoteSimpleIdentifier(idx.name), identSchema)
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
            info.foreignKeys[DbCatalogDAO.genericForeignKeyId(fromCols, lastFk.table, toCols)] = fkInfo;
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
        info.foreignKeys[DbCatalogDAO.genericForeignKeyId(fromCols, lastFk.table, toCols)] = fkInfo;
      }
      return info;
    } catch (err) {
      /* istanbul ignore next */
      return Promise.reject(err);
    }
  }

  protected schemaPragma(pragmaName: string, identifierName: string, identifierSchema?: string): string {
    if (identifierSchema) {
      return `${identifierSchema}.${pragmaName}(${identifierName})`;
    } else {
      return `${pragmaName}(${identifierName})`;
    }
  }

  protected callSchemaPragma(pragmaName: string, identifierName: string, identifierSchema?: string): Promise<any[]> {
    return this.sqldb.all(`PRAGMA ${this.schemaPragma(pragmaName, identifierName, identifierSchema)}`);
  }

  static genericForeignKeyId(fromCols: string[], toTable: string, toCols: string[]): string {
    let res = '(';
    res += fromCols.join(',');
    res += `) => ${toTable}(`;
    res += toCols.join(',');
    res += ')';
    return res;
  }
}
