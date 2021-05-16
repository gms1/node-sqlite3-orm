/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  BaseDAO,
  DbCatalogDAO,
  field,
  fk,
  FKDefinition,
  id,
  index,
  SQL_MEMORY_DB_PRIVATE,
  SqlDatabase,
  table,
} from '../..';

const PREFIX = 'DC';

const PARENT_TABLE = `${PREFIX}:PARENT TABLE`;
const PARENT_TABLEQ = `main.${PARENT_TABLE}`;
const CHILD_TABLE = `${PREFIX}:CHILD TABLE`;
const CHILD_TABLEQ = `main.${CHILD_TABLE}`;

@table({ name: PARENT_TABLEQ })
class ParentTable {
  @id({ name: 'ID1', dbtype: 'INTEGER NOT NULL' })
  id1!: number;

  @id({ name: 'ID2', dbtype: 'INTEGER NOT NULL' })
  id2!: number;
}

@table({ name: CHILD_TABLEQ, autoIncrement: true })
class ChildTable {
  @field({ name: 'PID2', dbtype: 'INTEGER' })
  @fk('PARENT1', PARENT_TABLE, 'ID2')
  @index('PIDX1')
  pid2?: number;

  @field({ name: 'PID1', dbtype: 'INTEGER' })
  @fk('PARENT1', PARENT_TABLE, 'ID1')
  @index('PIDX1')
  pid1?: number;

  @id({ name: 'ID', dbtype: 'INTEGER NOT NULL' })
  id!: number;

  @field({ name: 'PID3', dbtype: 'INTEGER' })
  @fk('PARENT2', PARENT_TABLE, 'ID1')
  @index('PIDX2')
  pid3?: number;

  @field({ name: 'PID4', dbtype: 'INTEGER' })
  @fk('PARENT2', PARENT_TABLE, 'ID2')
  @index('PIDX2', false, true)
  pid4?: number;
}

@table({ name: CHILD_TABLEQ })
class ChildTableSubset {
  @field({ name: 'PID3', dbtype: 'INTEGER' })
  @fk('PARENT2', PARENT_TABLE, 'ID1')
  @index('PIDX2')
  pid3?: number;

  @field({ name: 'PID4', dbtype: 'INTEGER' })
  @fk('PARENT2', PARENT_TABLE, 'ID2')
  @index('PIDX2', false, true)
  pid4?: number;
}

// ---------------------------------------------

describe('test DbTableInfo.discover', () => {
  let sqldb: SqlDatabase;
  let parentDao: BaseDAO<ParentTable>;
  let childDao: BaseDAO<ChildTable>;
  let dbCatDao: DbCatalogDAO;

  // ---------------------------------------------
  beforeEach(async () => {
    try {
      sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE);

      parentDao = new BaseDAO(ParentTable, sqldb);
      childDao = new BaseDAO(ChildTable, sqldb);
      dbCatDao = new DbCatalogDAO(sqldb);

      await parentDao.createTable();
      await childDao.createTable();
      await childDao.createIndex('PIDX1');
      await childDao.createIndex('PIDX2');
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  afterEach(async () => {
    try {
      await childDao.dropTable();
      await parentDao.dropTable();
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('expect discovered schema info to match ', async () => {
    try {
      const schemas = await dbCatDao.readSchemas();
      expect(schemas).toBeDefined();
      expect(schemas[0]).toBe('main');

      let tables = await dbCatDao.readTables('main');

      expect(tables).toBeDefined();
      tables = tables.filter((t) => t.indexOf(PREFIX) === 0).sort((a, b) => a.localeCompare(b));
      expect(tables.length).toBe(2);
      expect(tables[0]).toBe(CHILD_TABLE);
      expect(tables[1]).toBe(PARENT_TABLE);

      const invalidInfo = await dbCatDao.readTableInfo('NOT EXISTING TABLE');
      expect(invalidInfo).toBeUndefined();
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('expect discovered table info to match ', async () => {
    try {
      const parentInfo = await dbCatDao.readTableInfo(PARENT_TABLEQ);
      const childInfo = await dbCatDao.readTableInfo(CHILD_TABLEQ);
      expect(parentInfo).toBeDefined();
      expect(parentInfo!.name).toBe(PARENT_TABLEQ);

      expect(Object.keys(parentInfo!.columns).length).toBe(2);
      expect(parentInfo!.autoIncrement).toBeFalsy();

      expect(parentInfo!.columns.ID1).toBeDefined();
      expect(parentInfo!.columns.ID1.type).toBe('INTEGER');
      expect(parentInfo!.columns.ID1.notNull).toBe(true);
      expect(parentInfo!.columns.ID1.defaultValue).toBe(null);

      expect(parentInfo!.columns.ID2).toBeDefined();
      expect(parentInfo!.columns.ID2).toBeDefined();
      expect(parentInfo!.columns.ID2.type).toBe('INTEGER');
      expect(parentInfo!.columns.ID2.notNull).toBe(true);
      expect(parentInfo!.columns.ID2.defaultValue).toBe(null);

      expect(parentInfo!.primaryKey.length).toBe(2);
      expect(parentInfo!.primaryKey[0]).toBe('ID1');
      expect(parentInfo!.primaryKey[1]).toBe('ID2');

      expect(Object.keys(parentInfo!.indexes).length).toBe(0);
      expect(Object.keys(parentInfo!.foreignKeys).length).toBe(0);

      expect(childInfo).toBeDefined();
      expect(childInfo!.name).toBe(CHILD_TABLEQ);
      expect(childInfo!.autoIncrement).toBeTruthy();

      expect(Object.keys(childInfo!.columns).length).toBe(5);

      expect(childInfo!.columns.ID).toBeDefined();
      expect(childInfo!.columns.ID.type).toBe('INTEGER');
      expect(childInfo!.columns.ID.notNull).toBe(true);
      expect(childInfo!.columns.ID.defaultValue).toBe(null);

      expect(childInfo!.columns.PID1).toBeDefined();
      expect(childInfo!.columns.PID1.type).toBe('INTEGER');
      expect(childInfo!.columns.PID1.notNull).toBe(false);
      expect(childInfo!.columns.PID1.defaultValue).toBe(null);

      expect(childInfo!.columns.PID2).toBeDefined();
      expect(childInfo!.columns.PID2.type).toBe('INTEGER');
      expect(childInfo!.columns.PID2.notNull).toBe(false);
      expect(childInfo!.columns.PID2.defaultValue).toBe(null);

      expect(childInfo!.columns.PID3).toBeDefined();
      expect(childInfo!.columns.PID3.type).toBe('INTEGER');
      expect(childInfo!.columns.PID3.notNull).toBe(false);
      expect(childInfo!.columns.PID3.defaultValue).toBe(null);

      expect(childInfo!.columns.PID4).toBeDefined();
      expect(childInfo!.columns.PID4.type).toBe('INTEGER');
      expect(childInfo!.columns.PID4.notNull).toBe(false);
      expect(childInfo!.columns.PID4.defaultValue).toBe(null);

      expect(childInfo!.primaryKey.length).toBe(1);
      expect(childInfo!.primaryKey[0]).toBe('ID');

      expect(Object.keys(childInfo!.indexes).length).toBe(2);
      expect(childInfo!.indexes.PIDX1).toBeDefined();
      expect(childInfo!.indexes.PIDX1.name).toBe('PIDX1');
      expect(childInfo!.indexes.PIDX1.unique).toBe(false);
      expect(childInfo!.indexes.PIDX1.partial).toBe(false);
      expect(childInfo!.indexes.PIDX1.columns).toBeDefined();
      expect(childInfo!.indexes.PIDX1.columns.length).toBe(2);

      expect(childInfo!.indexes.PIDX1.columns[0].name).toBe('PID2');
      expect(childInfo!.indexes.PIDX1.columns[0].desc).toBe(false);
      expect(childInfo!.indexes.PIDX1.columns[1].name).toBe('PID1');
      expect(childInfo!.indexes.PIDX1.columns[1].desc).toBe(false);

      expect(Object.keys(childInfo!.foreignKeys).length).toBe(2);

      const fkName1 = FKDefinition.genericForeignKeyId(['PID2', 'PID1'], PARENT_TABLE, [
        'ID2',
        'ID1',
      ]);
      expect(childInfo!.foreignKeys[fkName1]).toBeDefined();
      expect(childInfo!.foreignKeys[fkName1].refTable).toBe(PARENT_TABLE);

      expect(childInfo!.foreignKeys[fkName1].columns.length).toBe(2);
      expect(childInfo!.foreignKeys[fkName1].columns[0]).toBe('PID2');
      expect(childInfo!.foreignKeys[fkName1].columns[1]).toBe('PID1');

      expect(childInfo!.foreignKeys[fkName1].refColumns.length).toBe(2);
      expect(childInfo!.foreignKeys[fkName1].refColumns[0]).toBe('ID2');
      expect(childInfo!.foreignKeys[fkName1].refColumns[1]).toBe('ID1');

      const fkName2 = FKDefinition.genericForeignKeyId(['PID3', 'PID4'], PARENT_TABLE, [
        'ID1',
        'ID2',
      ]);
      expect(childInfo!.foreignKeys[fkName2]).toBeDefined();
      expect(childInfo!.foreignKeys[fkName2].refTable).toBe(PARENT_TABLE);

      expect(childInfo!.foreignKeys[fkName2].columns.length).toBe(2);
      expect(childInfo!.foreignKeys[fkName2].columns[0]).toBe('PID3');
      expect(childInfo!.foreignKeys[fkName2].columns[1]).toBe('PID4');

      expect(childInfo!.foreignKeys[fkName2].refColumns.length).toBe(2);
      expect(childInfo!.foreignKeys[fkName2].refColumns[0]).toBe('ID1');
      expect(childInfo!.foreignKeys[fkName2].refColumns[1]).toBe('ID2');
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it("expect type affinity for 'BLOB' to be 'BLOB'", () => {
    expect(DbCatalogDAO.getTypeAffinity('BLOB')).toBe('BLOB');
  });

  // ---------------------------------------------
  it("expect type affinity for 'FOO' to be 'NUMERIC' (default)", () => {
    expect(DbCatalogDAO.getTypeAffinity('FOO')).toBe('NUMERIC');
  });
});
