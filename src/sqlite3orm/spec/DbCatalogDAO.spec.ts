// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class  no-non-null-assertion
// tslint:disable no-null-keyword
import {SqlDatabase, BaseDAO, SQL_MEMORY_DB_PRIVATE, field, fk, id, table, DbCatalogDAO, index, FKDefinition} from '..';

const PREFIX = 'DC';

const PARENT_TABLE = `${PREFIX}:PARENT TABLE`;
const PARENT_TABLEQ = `main.${PARENT_TABLE}`;
const CHILD_TABLE = `${PREFIX}:CHILD TABLE`;
const CHILD_TABLEQ = `main.${CHILD_TABLE}`;

@table({name: PARENT_TABLEQ})
class ParentTable {
  @id({name: 'ID1', dbtype: 'INTEGER NOT NULL'})
  id1: number;

  @id({name: 'ID2', dbtype: 'INTEGER NOT NULL'})
  id2: number;

  constructor() {
    this.id1 = this.id2 = 0;
  }
}

@table({name: CHILD_TABLEQ, autoIncrement: true})
class ChildTable {
  @field({name: 'PID2', dbtype: 'INTEGER'}) @fk('PARENT1', PARENT_TABLE, 'ID2') @index('PIDX1')
  pid2?: number;

  @field({name: 'PID1', dbtype: 'INTEGER'}) @fk('PARENT1', PARENT_TABLE, 'ID1') @index('PIDX1')
  pid1?: number;

  @id({name: 'ID', dbtype: 'INTEGER NOT NULL'})
  id: number;

  @field({name: 'PID3', dbtype: 'INTEGER'}) @fk('PARENT2', PARENT_TABLE, 'ID1') @index('PIDX2')
  pid3?: number;

  @field({name: 'PID4', dbtype: 'INTEGER'}) @fk('PARENT2', PARENT_TABLE, 'ID2') @index('PIDX2', false, true)
  pid4?: number;



  constructor() {
    this.id = 0;
  }
}

@table({name: CHILD_TABLEQ})
class ChildTableSubset {
  @field({name: 'PID3', dbtype: 'INTEGER'}) @fk('PARENT2', PARENT_TABLE, 'ID1') @index('PIDX2')
  pid3?: number;

  @field({name: 'PID4', dbtype: 'INTEGER'}) @fk('PARENT2', PARENT_TABLE, 'ID2') @index('PIDX2', false, true)
  pid4?: number;

  constructor() {}
}


// ---------------------------------------------

describe('test DbTableInfo.discover', () => {
  let sqldb: SqlDatabase;
  let parentDao: BaseDAO<ParentTable>;
  let childDao: BaseDAO<ChildTable>;
  let dbCatDao: DbCatalogDAO;


  // ---------------------------------------------
  beforeEach(async (done) => {
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
    done();
  });

  // ---------------------------------------------
  afterEach(async (done) => {
    try {
      await childDao.dropTable();
      await parentDao.dropTable();
    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('expect discovered schema info to match ', async (done) => {
    try {
      const schemas = await dbCatDao.readSchemas();
      expect(schemas).toBeDefined('schemas');
      expect(schemas[0]).toBe('main', 'schemas');

      let tables = await dbCatDao.readTables('main');

      expect(tables).toBeDefined('tables');
      tables = tables.filter((t) => t.indexOf(PREFIX) === 0).sort((a, b) => a.localeCompare(b));
      expect(tables.length).toBe(2, 'tables');
      expect(tables[0]).toBe(CHILD_TABLE, 'tables');
      expect(tables[1]).toBe(PARENT_TABLE, 'tables');

      const invalidInfo = await dbCatDao.readTableInfo('NOT EXISTING TABLE');
      expect(invalidInfo).toBeUndefined(`not existing table info`);

    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('expect discovered table info to match ', async (done) => {
    try {
      const parentInfo = await dbCatDao.readTableInfo(PARENT_TABLEQ);
      const childInfo = await dbCatDao.readTableInfo(CHILD_TABLEQ);
      expect(parentInfo).toBeDefined('parent info');
      expect(parentInfo!.name).toBe(PARENT_TABLEQ, 'parent info');

      expect(Object.keys(parentInfo!.columns).length).toBe(2, 'parent info: columns');

      expect(parentInfo!.columns.ID1).toBeDefined('parent info: column ID1');
      expect(parentInfo!.columns.ID1.type).toBe('INTEGER', 'parent info: column ID1');
      expect(parentInfo!.columns.ID1.notNull).toBe(true, 'parent info: column ID1');
      expect(parentInfo!.columns.ID1.defaultValue).toBe(null, 'parent info: column ID1');

      expect(parentInfo!.columns.ID2).toBeDefined('parent info: column ID2');
      expect(parentInfo!.columns.ID2).toBeDefined('parent info: column ID2');
      expect(parentInfo!.columns.ID2.type).toBe('INTEGER', 'parent info: column ID2');
      expect(parentInfo!.columns.ID2.notNull).toBe(true, 'parent info: column ID2');
      expect(parentInfo!.columns.ID2.defaultValue).toBe(null, 'parent info: column ID2');

      expect(parentInfo!.primaryKey.length).toBe(2, 'parent info: primary key');
      expect(parentInfo!.primaryKey[0]).toBe('ID1', 'parent info: primary key');
      expect(parentInfo!.primaryKey[1]).toBe('ID2', 'parent info: primary key');

      expect(Object.keys(parentInfo!.indexes).length).toBe(0, 'parent info: indexes');
      expect(Object.keys(parentInfo!.foreignKeys).length).toBe(0, 'parent info: foreign keys');

      expect(childInfo).toBeDefined('child info');
      expect(childInfo!.name).toBe(CHILD_TABLEQ, 'child info');

      expect(Object.keys(childInfo!.columns).length).toBe(5, 'child info: columns');

      expect(childInfo!.columns.ID).toBeDefined('childinfo: column ID');
      expect(childInfo!.columns.ID.type).toBe('INTEGER', 'childinfo: column ID');
      expect(childInfo!.columns.ID.notNull).toBe(true, 'childinfo: column ID');
      expect(childInfo!.columns.ID.defaultValue).toBe(null, 'childinfo: column ID');

      expect(childInfo!.columns.PID1).toBeDefined('childinfo: column PID1');
      expect(childInfo!.columns.PID1.type).toBe('INTEGER');
      expect(childInfo!.columns.PID1.notNull).toBe(false);
      expect(childInfo!.columns.PID1.defaultValue).toBe(null);

      expect(childInfo!.columns.PID2).toBeDefined('childinfo: column PID2');
      expect(childInfo!.columns.PID2.type).toBe('INTEGER', 'childinfo: column PID2');
      expect(childInfo!.columns.PID2.notNull).toBe(false, 'childinfo: column PID2');
      expect(childInfo!.columns.PID2.defaultValue).toBe(null, 'childinfo: column PID2');

      expect(childInfo!.columns.PID3).toBeDefined('childinfo: column PID3');
      expect(childInfo!.columns.PID3.type).toBe('INTEGER');
      expect(childInfo!.columns.PID3.notNull).toBe(false);
      expect(childInfo!.columns.PID3.defaultValue).toBe(null);

      expect(childInfo!.columns.PID4).toBeDefined('childinfo: column PID4');
      expect(childInfo!.columns.PID4.type).toBe('INTEGER', 'childinfo: column PID4');
      expect(childInfo!.columns.PID4.notNull).toBe(false, 'childinfo: column PID4');
      expect(childInfo!.columns.PID4.defaultValue).toBe(null, 'childinfo: column PID4');

      expect(childInfo!.primaryKey.length).toBe(1, 'childinfo: primary key');
      expect(childInfo!.primaryKey[0]).toBe('ID', 'childinfo: primary key');

      expect(Object.keys(childInfo!.indexes).length).toBe(2, 'childinfo: indexes');
      expect(childInfo!.indexes.PIDX1).toBeDefined('childinfo: index PIDX1');
      expect(childInfo!.indexes.PIDX1.name).toBe('PIDX1', 'childinfo: index PIDX1');
      expect(childInfo!.indexes.PIDX1.unique).toBe(false, 'childinfo: index PIDX1');
      expect(childInfo!.indexes.PIDX1.partial).toBe(false, 'childinfo: index PIDX1');
      expect(childInfo!.indexes.PIDX1.columns).toBeDefined('childinfo: index PIDX1');
      expect(childInfo!.indexes.PIDX1.columns.length).toBe(2, 'childinfo: index PIDX1');

      expect(childInfo!.indexes.PIDX1.columns[0].name).toBe('PID2', 'childinfo: index PIDX1');
      expect(childInfo!.indexes.PIDX1.columns[0].desc).toBe(false, 'childinfo: index PIDX1');
      expect(childInfo!.indexes.PIDX1.columns[1].name).toBe('PID1', 'childinfo: index PIDX1');
      expect(childInfo!.indexes.PIDX1.columns[1].desc).toBe(false, 'childinfo: index PIDX1');

      expect(Object.keys(childInfo!.foreignKeys).length).toBe(2, 'childinfo: fk');

      const fkName1 = FKDefinition.genericForeignKeyId(['PID2', 'PID1'], PARENT_TABLE, ['ID2', 'ID1']);
      expect(childInfo!.foreignKeys[fkName1]).toBeDefined(`childinfo: fk ${fkName1}`);
      expect(childInfo!.foreignKeys[fkName1].refTable).toBe(PARENT_TABLE, `childinfo: fk ${fkName1}`);

      expect(childInfo!.foreignKeys[fkName1].columns.length).toBe(2, `childinfo: fk ${fkName1} columns`);
      expect(childInfo!.foreignKeys[fkName1].columns[0]).toBe('PID2', `childinfo: fk ${fkName1} columns`);
      expect(childInfo!.foreignKeys[fkName1].columns[1]).toBe('PID1', `childinfo: fk ${fkName1} columns`);

      expect(childInfo!.foreignKeys[fkName1].refColumns.length).toBe(2, `childinfo: fk ${fkName1} refColumns`);
      expect(childInfo!.foreignKeys[fkName1].refColumns[0]).toBe('ID2', `childinfo: fk ${fkName1} refColumns`);
      expect(childInfo!.foreignKeys[fkName1].refColumns[1]).toBe('ID1', `childinfo: fk ${fkName1} refColumns`);

      const fkName2 = FKDefinition.genericForeignKeyId(['PID3', 'PID4'], PARENT_TABLE, ['ID1', 'ID2']);
      expect(childInfo!.foreignKeys[fkName2]).toBeDefined(`childinfo: fk ${fkName2}`);
      expect(childInfo!.foreignKeys[fkName2].refTable).toBe(PARENT_TABLE, `childinfo: fk ${fkName2}`);

      expect(childInfo!.foreignKeys[fkName2].columns.length).toBe(2, `childinfo: fk ${fkName2} columns`);
      expect(childInfo!.foreignKeys[fkName2].columns[0]).toBe('PID3', `childinfo: fk ${fkName2} columns`);
      expect(childInfo!.foreignKeys[fkName2].columns[1]).toBe('PID4', `childinfo: fk ${fkName2} columns`);

      expect(childInfo!.foreignKeys[fkName2].refColumns.length).toBe(2, `childinfo: fk ${fkName2} refColumns`);
      expect(childInfo!.foreignKeys[fkName2].refColumns[0]).toBe('ID1', `childinfo: fk ${fkName2} refColumns`);
      expect(childInfo!.foreignKeys[fkName2].refColumns[1]).toBe('ID2', `childinfo: fk ${fkName2} refColumns`);

    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('expect type affinity for \'BLOB\' to be \'BLOB\'', () => {

    expect(DbCatalogDAO.getTypeAffinity('BLOB')).toBe('BLOB');
  });

  // ---------------------------------------------
  it('expect type affinity for \'FOO\' to be \'NUMERIC\' (default)', () => {

    expect(DbCatalogDAO.getTypeAffinity('FOO')).toBe('NUMERIC');
  });

});
