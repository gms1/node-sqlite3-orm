// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class
// tslint:disable no-non-null-assertion no-string-literal no-null-keyword
import {
  AutoUpgrader,
  BaseDAO,
  DbCatalogDAO,
  field,
  id,
  schema,
  SQL_MEMORY_DB_PRIVATE,
  SqlDatabase,
  Table,
  table,
  UpgradeInfo
} from '..';
import {index, fk} from '../metadata/decorators';

const TEST_TABLE = 'AU:TABLE';
const TEST_PARENT_TABLE = 'AU:PARENT_TABLE';

function debug(formatter: any, ...args: any[]): void {
  AutoUpgrader.debug(formatter, ...args);
}

// public methods for easier testing
class SpecAutoUpgrader extends AutoUpgrader {
  async createTable(tab: Table): Promise<void> {
    return super.createTable(tab);
  }
  async alterTable(tab: Table, upgradeInfo: UpgradeInfo): Promise<void> {
    return super.alterTable(tab, upgradeInfo);
  }
  async recreateTable(tab: Table, upgradeInfo: UpgradeInfo): Promise<void> {
    return super.recreateTable(tab, upgradeInfo);
  }
}

// ---------------------------------------------

describe('test autoupgrade', () => {

  let sqldb: SqlDatabase;
  let autoUpgrader: SpecAutoUpgrader;
  let catalogDao: DbCatalogDAO;

  // ---------------------------------------------
  beforeEach(async (done) => {
    try {
      sqldb = new SqlDatabase();
      autoUpgrader = new SpecAutoUpgrader(sqldb);
      catalogDao = new DbCatalogDAO(sqldb);

      await sqldb.open(SQL_MEMORY_DB_PRIVATE);
      await autoUpgrader.foreignKeyEnable(true);
      schema().deleteTable(TEST_TABLE);
      schema().deleteTable(TEST_PARENT_TABLE);
      debug('start');
    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  afterEach(async (done) => {
    try {
      debug('end');
      schema().deleteTable(TEST_TABLE);
      schema().deleteTable(TEST_PARENT_TABLE);
    } catch (err) {
      fail(err);
    }
    done();
  });


  // ---------------------------------------------
  it('should work for newly defined table (CREATE)', async (done) => {
    try {
      @table({name: TEST_TABLE, autoIncrement: true})
      class Model1 {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'})
        id: number;

        @field({name: 'CONTENT', dbtype: 'TEXT'})
        content?: string;

        constructor() {
          this.id = 0;
        }
      }
      await autoUpgrader.foreignKeyEnable(false);

      const model1Dao = new BaseDAO<Model1>(Model1, sqldb);

      let actual: boolean;
      actual = await autoUpgrader.isActual(model1Dao.table);
      expect(actual).toBeFalsy('1st time');

      await autoUpgrader.upgradeTables([model1Dao.table]);

      actual = await autoUpgrader.isActual([model1Dao.table]);
      expect(actual).toBeTruthy('2nd time');

      const tableDef = schema().getTable(TEST_TABLE);

      const spyRecreate = spyOn(autoUpgrader, 'recreateTable').and.callThrough();
      await autoUpgrader.upgradeTables(tableDef, {forceRecreate: true});
      expect(spyRecreate.calls.count()).toBe(1);

      const fkEnabled = await autoUpgrader.foreignKeyEnabled();
      expect(fkEnabled).toBeFalsy();

    } catch (err) {
      fail(err);
    }
    done();
  });


  // ---------------------------------------------
  it('should work for added nullable column (ALTER)', async (done) => {
    try {
      @table({name: TEST_TABLE, autoIncrement: true})
      class Model1 {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'})
        id: number;

        @field({name: 'CONTENT', dbtype: 'TEXT'})
        content?: string;

        constructor() {
          this.id = 0;
        }
      }
      const model1Dao = new BaseDAO<Model1>(Model1, sqldb);

      let actual: boolean;
      actual = await autoUpgrader.isActual(model1Dao.table);
      expect(actual).toBeFalsy('1st time');

      await autoUpgrader.upgradeTables([model1Dao.table]);

      actual = await autoUpgrader.isActual(model1Dao.table);
      expect(actual).toBeTruthy('2nd time');

      const table1Info1 = await catalogDao.readTableInfo(TEST_TABLE);
      expect(table1Info1).toBeDefined();
      expect(table1Info1!.columns['CONTENT2']).toBeUndefined('column \'CONTENT2\' exist');

      schema().deleteTable(TEST_TABLE);
      // --------------------------------------------
      // upgrade
      debug('redefine');

      @table({name: TEST_TABLE, autoIncrement: true})
      class Model2 {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'})
        id: number;

        @field({name: 'CONTENT', dbtype: 'TEXT'})
        content?: string;

        @field({name: 'CONTENT2', dbtype: 'TEXT'})
        content2?: string;

        constructor() {
          this.id = 0;
        }
      }
      const model2Dao = new BaseDAO<Model2>(Model2, sqldb);

      actual = await autoUpgrader.isActual(model2Dao.table);
      expect(actual).toBeFalsy('3rd time');

      const spyAlter = spyOn(autoUpgrader, 'alterTable').and.callThrough();
      await autoUpgrader.upgradeTables([model2Dao.table]);
      expect(spyAlter.calls.count()).toBe(1);

      actual = await autoUpgrader.isActual(model2Dao.table);
      expect(actual).toBeTruthy('4th time');

      const table1Info2 = await catalogDao.readTableInfo(TEST_TABLE);
      expect(table1Info2).toBeDefined();
      expect(table1Info2!.columns['CONTENT2']).toBeDefined('column \'CONTENT2\' does not exist');

    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('should fail for added not-nullable column without default (ALTER)', async (done) => {
    try {
      @table({name: TEST_TABLE, autoIncrement: true})
      class Model1 {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'})
        id: number;

        @field({name: 'CONTENT', dbtype: 'TEXT'})
        content?: string;

        constructor() {
          this.id = 0;
        }
      }
      const model1Dao = new BaseDAO<Model1>(Model1, sqldb);

      let actual: boolean;
      actual = await autoUpgrader.isActual(model1Dao.table);
      expect(actual).toBeFalsy('1st time');

      await autoUpgrader.upgradeTables([model1Dao.table]);

      actual = await autoUpgrader.isActual(model1Dao.table);
      expect(actual).toBeTruthy('2nd time');

      const table1Info1 = await catalogDao.readTableInfo(TEST_TABLE);
      expect(table1Info1).toBeDefined();
      expect(table1Info1!.columns['CONTENT2']).toBeUndefined('column \'CONTENT2\' exist');

      schema().deleteTable(TEST_TABLE);
      // --------------------------------------------
      // upgrade
      debug('redefine');

      @table({name: TEST_TABLE, autoIncrement: true})
      class Model2 {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'})
        id: number;

        @field({name: 'CONTENT', dbtype: 'TEXT'})
        content?: string;

        @field({name: 'CONTENT2', dbtype: 'TEXT NOT NULL'})
        content2?: string;

        constructor() {
          this.id = 0;
        }
      }
      const model2Dao = new BaseDAO<Model2>(Model2, sqldb);

      actual = await autoUpgrader.isActual(model2Dao.table);
      expect(actual).toBeFalsy('3rd time');

      await autoUpgrader.upgradeTables([model2Dao.table]);
      fail(`should have failed: Cannot add a NOT NULL column with default value NULL`);

    } catch (err) {
    }

    done();
  });



  // ---------------------------------------------
  it('should work for deleted column (NOOP, KEEP)', async (done) => {
    try {
      @table({name: TEST_TABLE, autoIncrement: true})
      class Model1 {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'})
        id: number;

        @field({name: 'CONTENT', dbtype: 'TEXT'}) @index('IDX_CONTENT')
        content?: string;

        @field({name: 'CONTENT2', dbtype: 'TEXT'})
        content2?: string;

        constructor() {
          this.id = 0;
        }
      }
      const model1Dao = new BaseDAO<Model1>(Model1, sqldb);

      let actual: boolean;
      actual = await autoUpgrader.isActual(model1Dao.table);
      expect(actual).toBeFalsy('1st time');

      await autoUpgrader.upgradeTables([model1Dao.table]);

      actual = await autoUpgrader.isActual(model1Dao.table);
      expect(actual).toBeTruthy('2nd time');

      const table1Info1 = await catalogDao.readTableInfo(TEST_TABLE);
      expect(table1Info1).toBeDefined();
      expect(table1Info1!.columns['CONTENT2']).toBeDefined('column \'CONTENT2\' does not exist');
      expect(table1Info1!.indexes['IDX_CONTENT']).toBeDefined('index \'IDX_CONTENT\' does not exist');

      schema().deleteTable(TEST_TABLE);
      // --------------------------------------------
      // upgrade
      debug('redefine');

      @table({name: TEST_TABLE, autoIncrement: true})
      class Model2 {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'})
        id: number;

        @field({name: 'CONTENT', dbtype: 'TEXT'}) @index('IDX_CONTENT')
        content?: string;

        constructor() {
          this.id = 0;
        }
      }
      const model2Dao = new BaseDAO<Model2>(Model2, sqldb);

      actual = await autoUpgrader.isActual(model2Dao.table, {keepOldColumns: true});
      expect(actual).toBeTruthy('3rd time');

      const spyCreate = spyOn(autoUpgrader, 'createTable').and.callThrough();
      const spyAlter = spyOn(autoUpgrader, 'alterTable').and.callThrough();
      const spyRecreate = spyOn(autoUpgrader, 'recreateTable').and.callThrough();
      await autoUpgrader.upgradeTables([model2Dao.table], {keepOldColumns: true});
      expect(spyCreate.calls.count()).toBe(0);
      expect(spyAlter.calls.count()).toBe(0);
      expect(spyRecreate.calls.count()).toBe(0);

      actual = await autoUpgrader.isActual(model2Dao.table, {keepOldColumns: true});
      expect(actual).toBeTruthy('4th time');

      const table1Info2 = await catalogDao.readTableInfo(TEST_TABLE);
      expect(table1Info2).toBeDefined();
      expect(table1Info2!.columns['CONTENT2']).toBeDefined('column \'CONTENT2\' does not exist');
      expect(table1Info2!.indexes['IDX_CONTENT']).toBeDefined('index \'IDX_CONTENT\' does not exist');

    } catch (err) {
      fail(err);
    }
    done();
  });


  // ---------------------------------------------
  it('should work for added and deleted columns (ALTER, KEEP)', async (done) => {
    try {
      @table({name: TEST_TABLE, autoIncrement: true})
      class Model1 {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'})
        id: number;

        @field({name: 'CONTENT', dbtype: 'TEXT'}) @index('IDX_CONTENT')
        content?: string;

        @field({name: 'CONTENT2', dbtype: 'TEXT'})
        content2?: string;

        constructor() {
          this.id = 0;
        }
      }

      const model1Dao = new BaseDAO<Model1>(Model1, sqldb);

      let actual: boolean;
      actual = await autoUpgrader.isActual(model1Dao.table);
      expect(actual).toBeFalsy('1st time');

      await autoUpgrader.upgradeTables([model1Dao.table]);

      actual = await autoUpgrader.isActual(model1Dao.table);
      expect(actual).toBeTruthy('2nd time');

      const table1Info1 = await catalogDao.readTableInfo(TEST_TABLE);
      expect(table1Info1).toBeDefined();
      expect(table1Info1!.columns['CONTENT2']).toBeDefined('column \'CONTENT2\' does not exist');
      expect(table1Info1!.indexes['IDX_CONTENT']).toBeDefined('index \'IDX_CONTENT\' does not exist');

      schema().deleteTable(TEST_TABLE);
      // --------------------------------------------
      // upgrade
      debug('redefine');

      @table({name: TEST_TABLE, autoIncrement: true})
      class Model2 {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'})
        id: number;

        @field({name: 'CONTENT', dbtype: 'TEXT'}) @index('IDX_CONTENT')
        content?: string;

        @field({name: 'CONTENT3', dbtype: 'TEXT'})
        content3?: string;

        constructor() {
          this.id = 0;
        }
      }
      const model2Dao = new BaseDAO<Model2>(Model2, sqldb);

      actual = await autoUpgrader.isActual(model2Dao.table, {keepOldColumns: true});
      expect(actual).toBeFalsy('3rd time');

      const spyAlter = spyOn(autoUpgrader, 'alterTable').and.callThrough();
      await autoUpgrader.upgradeTables([model2Dao.table], {keepOldColumns: true});
      expect(spyAlter.calls.count()).toBe(1);

      actual = await autoUpgrader.isActual(model2Dao.table, {keepOldColumns: true});
      expect(actual).toBeTruthy('4th time');

      const table1Info2 = await catalogDao.readTableInfo(TEST_TABLE);
      expect(table1Info2).toBeDefined();
      expect(table1Info2!.columns['CONTENT2']).toBeDefined('column \'CONTENT2\' does not exist');
      expect(table1Info2!.indexes['IDX_CONTENT']).toBeDefined('index \'IDX_CONTENT\' does not exist');
      expect(table1Info2!.columns['CONTENT3']).toBeDefined('column \'CONTENT3\' does not exist');

    } catch (err) {
      fail(err);
    }
    done();
  });


  // ---------------------------------------------
  it('should work for add/remove/change indexes (ALTER)', async (done) => {
    try {
      @table({name: TEST_TABLE, autoIncrement: true})
      class Model1 {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'}) @index('IDX_KEEP')
        id: number;

        @field({name: 'CONTENT', dbtype: 'TEXT'}) @index('IDX_DROP')
        content?: string;

        @field({name: 'CONTENT2', dbtype: 'TEXT'}) @index('IDX_CHANGE')
        content2?: string;

        constructor() {
          this.id = 0;
        }
      }
      const model1Dao = new BaseDAO<Model1>(Model1, sqldb);

      let actual: boolean;
      actual = await autoUpgrader.isActual(model1Dao.table);
      expect(actual).toBeFalsy('1st time');

      await autoUpgrader.upgradeTables([model1Dao.table]);

      actual = await autoUpgrader.isActual(model1Dao.table);
      expect(actual).toBeTruthy('2nd time');

      const table1Info1 = await catalogDao.readTableInfo(TEST_TABLE);
      expect(table1Info1).toBeDefined();
      expect(table1Info1!.columns['CONTENT2']).toBeDefined('column \'CONTENT2\' does not exist');
      expect(table1Info1!.indexes['IDX_KEEP']).toBeDefined('index \'IDX_KEEP\' does not exist');
      expect(table1Info1!.indexes['IDX_DROP']).toBeDefined('index \'IDX_DROP\' does not exist');
      expect(table1Info1!.indexes['IDX_CHANGE']).toBeDefined('index \'IDX_CHANGE\' does not exist');
      expect(table1Info1!.indexes['IDX_CHANGE'].columns[0].name)
          .toBe('CONTENT2', 'index \'IDX_CHANGE\' using wrong column');

      schema().deleteTable(TEST_TABLE);
      // --------------------------------------------
      // upgrade
      debug('redefine');

      @table({name: TEST_TABLE, autoIncrement: true})
      class Model2 {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'}) @index('IDX_KEEP')
        id: number;

        @field({name: 'CONTENT', dbtype: 'TEXT'}) @index('IDX_CHANGE')
        content?: string;

        @field({name: 'CONTENT2', dbtype: 'TEXT'}) @index('IDX_ADD')
        content2?: string;

        constructor() {
          this.id = 0;
        }
      }
      const model2Dao = new BaseDAO<Model2>(Model2, sqldb);

      actual = await autoUpgrader.isActual(model2Dao.table, {keepOldColumns: true});
      expect(actual).toBeFalsy('3rd time');

      const spyAlter = spyOn(autoUpgrader, 'alterTable').and.callThrough();
      await autoUpgrader.upgradeTables([model2Dao.table], {keepOldColumns: true});
      expect(spyAlter.calls.count()).toBe(1);

      actual = await autoUpgrader.isActual(model2Dao.table, {keepOldColumns: true});
      expect(actual).toBeTruthy('4th time');

      const table1Info2 = await catalogDao.readTableInfo(TEST_TABLE);
      expect(table1Info2).toBeDefined();
      expect(table1Info2!.indexes['IDX_DROP']).toBeUndefined('index \'IDX_DROP\' does exist');
      expect(table1Info1!.indexes['IDX_KEEP']).toBeDefined('index \'IDX_KEEP\' does not exist');
      expect(table1Info2!.indexes['IDX_ADD']).toBeDefined('index \'IDX_ADD\' does not exist');
      expect(table1Info2!.indexes['IDX_CHANGE']).toBeDefined('index \'IDX_CHANGE\' does not exist');
      expect(table1Info2!.indexes['IDX_CHANGE'].columns[0].name)
          .toBe('CONTENT', 'index \'IDX_CHANGE\' using wrong column');

    } catch (err) {
      fail(err);
    }
    done();
  });



  // ---------------------------------------------
  it('should work for deleted column (RECREATE, NOKEEP)', async (done) => {
    try {
      @table({name: TEST_TABLE, autoIncrement: true})
      class Model1 {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'})
        id: number;

        @field({name: 'CONTENT', dbtype: 'TEXT'}) @index('IDX_CONTENT')
        content?: string;

        @field({name: 'CONTENT2', dbtype: 'TEXT'})
        content2?: string;

        constructor() {
          this.id = 0;
        }
      }
      const model1Dao = new BaseDAO<Model1>(Model1, sqldb);

      let actual: boolean;
      actual = await autoUpgrader.isActual(model1Dao.table);
      expect(actual).toBeFalsy('1st time');

      await autoUpgrader.upgradeTables([model1Dao.table]);

      actual = await autoUpgrader.isActual(model1Dao.table);
      expect(actual).toBeTruthy('2nd time');

      const table1Info1 = await catalogDao.readTableInfo(TEST_TABLE);
      expect(table1Info1).toBeDefined();
      expect(table1Info1!.columns['CONTENT2']).toBeDefined('column \'CONTENT2\' does not exist');
      expect(table1Info1!.indexes['IDX_CONTENT']).toBeDefined('index \'IDX_CONTENT\' does not exist');

      const model1 = new Model1();
      await model1Dao.insert(model1);
      const id1 = model1.id;
      model1.content = 'foo';
      model1.content2 = 'bar';
      await model1Dao.insert(model1);
      const id2 = model1.id;

      schema().deleteTable(TEST_TABLE);
      // --------------------------------------------
      // upgrade
      debug('redefine');

      @table({name: TEST_TABLE, autoIncrement: true})
      class Model2 {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'})
        id: number;

        @field({name: 'CONTENT', dbtype: 'TEXT'}) @index('IDX_CONTENT')
        content?: string;

        constructor() {
          this.id = 0;
        }
      }
      const model2Dao = new BaseDAO<Model2>(Model2, sqldb);

      actual = await autoUpgrader.isActual(model2Dao.table);
      expect(actual).toBeFalsy('3rd time');

      const spyRecreate = spyOn(autoUpgrader, 'recreateTable').and.callThrough();
      await autoUpgrader.upgradeTables([model2Dao.table]);
      expect(spyRecreate.calls.count()).toBe(1);

      actual = await autoUpgrader.isActual(model2Dao.table);
      expect(actual).toBeTruthy('4th time');

      const table1Info2 = await catalogDao.readTableInfo(TEST_TABLE);
      expect(table1Info2).toBeDefined();
      expect(table1Info2!.columns['CONTENT2']).toBeUndefined('column \'CONTENT2\' exist');
      expect(table1Info2!.indexes['IDX_CONTENT']).toBeDefined('index \'IDX_CONTENT\' does not exist');

      let model2 = await model2Dao.selectById({id: id1});
      expect(model2.content).toBeUndefined();

      model2 = await model2Dao.selectById({id: id2});
      expect(model2.content).toBe('foo');

    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('should work for added and deleted columns (RECREATE, KEEP)', async (done) => {
    // using a dropped foreign key to force recreate
    try {
      @table({name: TEST_PARENT_TABLE, autoIncrement: true})
      class ParentModel {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'})
        id: number;

        constructor() {
          this.id = 0;
        }
      }

      @table({name: TEST_TABLE, autoIncrement: true})
      class Model1 {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'})
        id: number;

        @field({name: 'CONTENT', dbtype: 'TEXT'}) @index('IDX_CONTENT')
        content?: string;

        @field({name: 'CONTENT2', dbtype: 'TEXT'})
        content2?: string;

        @field({name: 'CONTENT3', dbtype: 'TEXT NOT NULL DEFAULT \'foo\''})
        content3?: string;

        @field({name: 'PARENT_ID', dbtype: 'INTEGER'}) @fk('PARENT', TEST_PARENT_TABLE, 'ID')
        parentId?: number;

        constructor() {
          this.id = 0;
        }
      }

      const parentModelDao = new BaseDAO<ParentModel>(ParentModel, sqldb);
      await parentModelDao.createTable();

      const model1Dao = new BaseDAO<Model1>(Model1, sqldb);

      let actual: boolean;
      actual = await autoUpgrader.isActual([model1Dao.table, parentModelDao.table]);
      expect(actual).toBeFalsy('1st time');

      await autoUpgrader.upgradeTables([model1Dao.table]);

      actual = await autoUpgrader.isActual([model1Dao.table, parentModelDao.table]);
      expect(actual).toBeTruthy('2nd time');

      const table1Info1 = await catalogDao.readTableInfo(TEST_TABLE);
      expect(table1Info1).toBeDefined();
      expect(table1Info1!.columns['CONTENT2']).toBeDefined('column \'CONTENT2\' does not exist');
      expect(table1Info1!.columns['CONTENT3']).toBeDefined('column \'CONTENT3\' does not exist');
      expect(table1Info1!.indexes['IDX_CONTENT']).toBeDefined('index \'IDX_CONTENT\' does not exist');

      const parentModel = new ParentModel();
      await parentModelDao.insert(parentModel);
      const pId = parentModel.id;

      const model1 = new Model1();
      model1.parentId = undefined;
      model1.content3 = 'blub';
      model1.parentId = pId;
      await model1Dao.insert(model1);
      const id1 = model1.id;
      model1.parentId = undefined;
      model1.content = 'foo';
      model1.content2 = 'bar';
      model1.content3 = 'baz';
      await model1Dao.insert(model1);
      const id2 = model1.id;

      schema().deleteTable(TEST_TABLE);
      // --------------------------------------------
      // upgrade
      debug('redefine');

      @table({name: TEST_TABLE, autoIncrement: true})
      class Model2 {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'})
        id: number;

        @field({name: 'CONTENT', dbtype: 'TEXT'}) @index('IDX_CONTENT')
        content?: string;

        @field({name: 'CONTENT4', dbtype: 'TEXT'})
        content4?: string;

        @field({name: 'PARENT_ID', dbtype: 'INTEGER'})
        parentId?: number;

        constructor() {
          this.id = 0;
        }
      }
      const model2Dao = new BaseDAO<Model2>(Model2, sqldb);

      actual = await autoUpgrader.isActual(model2Dao.table, {keepOldColumns: true});
      expect(actual).toBeFalsy('3rd time');

      const spyRecreate = spyOn(autoUpgrader, 'recreateTable').and.callThrough();
      await autoUpgrader.upgradeTables([model2Dao.table], {keepOldColumns: true});
      expect(spyRecreate.calls.count()).toBe(1);

      actual = await autoUpgrader.isActual(model2Dao.table, {keepOldColumns: true});
      expect(actual).toBeTruthy('4th time');

      const table1Info2 = await catalogDao.readTableInfo(TEST_TABLE);
      expect(table1Info2).toBeDefined();
      expect(table1Info2!.columns['CONTENT2']).toBeDefined('column \'CONTENT2\' does not exist');
      expect(table1Info2!.columns['CONTENT3']).toBeDefined('column \'CONTENT3\' does not exist');
      expect(table1Info2!.indexes['IDX_CONTENT']).toBeDefined('index \'IDX_CONTENT\' does not exist');
      expect(table1Info2!.columns['CONTENT4']).toBeDefined('column \'CONTENT4\' does not exist');

      let model2 = await model2Dao.selectById({id: id1});
      expect(model2.content).toBeUndefined();
      expect(model2.content4).toBeUndefined();
      expect(model2.parentId).toBe(pId);

      model2 = await model2Dao.selectById({id: id2});
      expect(model2.content).toBe('foo');
      expect(model2.content4).toBeUndefined();
      expect(model2.parentId).toBeUndefined();

    } catch (err) {
      fail(err);
    }
    done();
  });

});
