// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class deprecation
// tslint:disable no-non-null-assertion
import {
  BaseDAO,
  DbCatalogDAO,
  DbTableInfo,
  Field,
  field,
  fk,
  getModelMetadata,
  id,
  index,
  MetaModel,
  MetaProperty,
  qualifiySchemaIdentifier,
  Schema,
  schema,
  SQL_MEMORY_DB_PRIVATE,
  SqlDatabase,
  table,
} from '../..';

const TABLE_PARENT_TABLE_NAME = 'S:PARENTTABLE';
const TABLE_PARENT_TABLE_NAMEQ = qualifiySchemaIdentifier(TABLE_PARENT_TABLE_NAME, 'main');
const TABLE_PARENT_FIELD_ID_NAME = 'ID';
const TABLE_PARENT_FIELD_NAME_NAME = 'NAME';

const TABLE_CHILD_TABLE_NAME = 'S:CHILD TABLE';
const TABLE_CHILD_TABLE_NAMEQ = qualifiySchemaIdentifier(TABLE_CHILD_TABLE_NAME, 'main');
const TABLE_CHILD_FIELD_ID_NAME = 'ID';
const TABLE_CHILD_FIELD_NAME_NAME = 'NAME';
const TABLE_CHILD_FIELD_FK_NAME = 'PARENT_ID';
const TABLE_CHILD_FK_CONSTRAINT_NAME = 'PARENT_CHILDS';
const TABLE_CHILD_IDX_NAME = 'S:CHILD PARENT IDX';
const TABLE_CHILD_IDX_NAMEQ = qualifiySchemaIdentifier(TABLE_CHILD_IDX_NAME, 'main');

const TABLE_TESTTABLE_NAME = 'S:TESTTABLE';

const TABLE_TESTIDX_NAME = 'S:TESTIDX';
const TABLE_TESTIDX_IDX_NAME_U = 'S:TEST_IDU';
const TABLE_TESTIDX_IDX_NAME_N = 'S:TEST_IDN';

@table({ name: TABLE_PARENT_TABLE_NAME })
class ParentTable {
  @id({ name: TABLE_PARENT_FIELD_ID_NAME, dbtype: 'INTEGER NOT NULL' }) public id?: number;

  @field({ name: TABLE_PARENT_FIELD_NAME_NAME, dbtype: 'TEXT' }) public name?: string;

  dyndef2: number;

  public constructor() {
    this.id = undefined;
    this.name = undefined;
    this.dyndef2 = 42;
  }
}

@table({ name: TABLE_CHILD_TABLE_NAMEQ, autoIncrement: true })
class ChildTable {
  @id({ name: TABLE_CHILD_FIELD_ID_NAME, dbtype: 'INTEGER NOT NULL' }) public id?: number;

  @field({ name: TABLE_CHILD_FIELD_NAME_NAME, dbtype: 'TEXT' }) public name?: string;

  @field({ name: TABLE_CHILD_FIELD_FK_NAME, dbtype: 'INTEGER NOT NULL' })
  @fk(TABLE_CHILD_FK_CONSTRAINT_NAME, TABLE_PARENT_TABLE_NAME, TABLE_PARENT_FIELD_ID_NAME)
  @index(TABLE_CHILD_IDX_NAMEQ)
  public parentId?: number;

  public constructor() {
    this.id = undefined;
    this.name = undefined;
    this.parentId = undefined;
  }
}

@table({ name: TABLE_TESTTABLE_NAME, withoutRowId: true })
class TestTable {
  @id({ name: 'ID', dbtype: 'INTEGER NOT NULL' }) public id?: number;

  @field({ name: 'NAME', dbtype: 'TEXT' }) public name?: string;

  @field({ name: 'NAME2', dbtype: 'TEXT' }) public name2?: string;

  public constructor() {}
}

@table({ name: TABLE_TESTIDX_NAME })
class TestIdx {
  @id({ name: 'ID', dbtype: 'INTEGER NOT NULL' }) public id!: number;

  @field({ name: 'COL1', dbtype: 'TEXT' })
  @index(TABLE_TESTIDX_IDX_NAME_U, true, true)
  public col1?: string;

  @field({ name: 'COL2', dbtype: 'TEXT' }) @index(TABLE_TESTIDX_IDX_NAME_N) public col2?: string;
}
@table()
class TestEmptyTableOpts {
  @id({ name: 'ID', dbtype: 'INTEGER NOT NULL' }) public id!: number;
}

// ---------------------------------------------

describe('test schema', () => {
  let sqldb: SqlDatabase;
  let dbCatDao: DbCatalogDAO;
  // ---------------------------------------------
  beforeEach(async () => {
    try {
      expect(schema().dateInMilliSeconds).toBeFalsy();
      sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE);
      dbCatDao = new DbCatalogDAO(sqldb);
    } catch (e) {
      fail(e);
    }
  });

  // ---------------------------------------------
  it('expect meta-data to be defined', () => {
    try {
      let parentTable = schema().getTable(TABLE_PARENT_TABLE_NAME);
      expect(parentTable).toBeDefined();
      expect(parentTable.name).toBe(TABLE_PARENT_TABLE_NAME);
      expect(parentTable.quotedName).toBeDefined();
      let parentIdField = parentTable.getTableField(TABLE_PARENT_FIELD_ID_NAME);
      expect(parentIdField).toBeDefined();
      expect(parentIdField.name).toBe(TABLE_PARENT_FIELD_ID_NAME);
      expect(parentIdField.quotedName).toBeDefined();
      expect(parentIdField.isIdentity).toBeTruthy();
      let parentNameField = parentTable.getTableField(TABLE_PARENT_FIELD_NAME_NAME);
      expect(parentNameField).toBeDefined();
      expect(parentNameField.name).toBe(TABLE_PARENT_FIELD_NAME_NAME);
      expect(parentNameField.quotedName).toBeDefined();
      expect(parentNameField.isIdentity).toBeFalsy('isIdentity is true');

      const parentMetaModel: MetaModel = getModelMetadata(ParentTable);

      expect(parentMetaModel).toBeDefined();
      const parentIdFieldProp = parentMetaModel.mapColNameToProp.get(parentIdField.name);
      expect(parentIdFieldProp).toBeDefined();
      expect(parentMetaModel.hasProperty(parentIdFieldProp!.key)).toBe(parentIdFieldProp);
      const parentIdFieldProp2 = parentMetaModel.getProperty(parentIdFieldProp!.key);
      expect(parentIdFieldProp2).toBe(parentIdFieldProp as MetaProperty);

      const parentNameFieldProp = parentMetaModel.mapColNameToProp.get(parentNameField.name);
      expect(parentNameFieldProp).toBeDefined();
      expect(parentMetaModel.hasProperty(parentNameFieldProp!.key)).toBe(parentNameFieldProp);
      const parentNameFieldProp2 = parentMetaModel.getProperty(parentNameFieldProp!.key);
      expect(parentNameFieldProp2).toBe(parentNameFieldProp as MetaProperty);

      expect(() => parentMetaModel.getProperty('this is not a property key')).toThrow();

      let childTable = schema().getTable(TABLE_CHILD_TABLE_NAMEQ);
      expect(childTable).toBeDefined();
      expect(childTable.name).toBe(TABLE_CHILD_TABLE_NAMEQ);
      expect(childTable.quotedName).toBeDefined();
      let childIdField = childTable.getTableField(TABLE_CHILD_FIELD_ID_NAME);
      expect(childIdField).toBeDefined();
      expect(childIdField.name).toBe(TABLE_CHILD_FIELD_ID_NAME);
      expect(childIdField.quotedName).toBeDefined();
      expect(childIdField.isIdentity).toBeTruthy();
      let childNameField = childTable.getTableField(TABLE_CHILD_FIELD_NAME_NAME);
      expect(childNameField).toBeDefined();
      expect(childNameField.name).toBe(TABLE_CHILD_FIELD_NAME_NAME);
      expect(childNameField.quotedName).toBeDefined();
      expect(childNameField.isIdentity).toBeFalsy('isIdentity is true');

      expect(childTable.hasFKDefinition('foo')).toBeFalsy('fk is defined');

      expect(childTable.hasFKDefinition(TABLE_CHILD_FK_CONSTRAINT_NAME)).toBeTruthy();
      const childParentFkDef = childTable.getFKDefinition(TABLE_CHILD_FK_CONSTRAINT_NAME);
      expect(childParentFkDef.foreignTableName).toBe(TABLE_PARENT_TABLE_NAME);
      expect(childParentFkDef.fields.length).toBe(1);
      expect(childParentFkDef.fields.length).toBe(1);
      expect(childParentFkDef.fields[0].name).toBe(TABLE_CHILD_FIELD_FK_NAME);
      expect(childParentFkDef.fields[0].foreignColumnName).toBe(TABLE_PARENT_FIELD_ID_NAME);

      const childIdxDef = childTable.getIDXDefinition(TABLE_CHILD_IDX_NAMEQ);
      expect(childIdxDef.fields.length).toBe(1);
      expect(childIdxDef.fields[0].name).toBe(TABLE_CHILD_FIELD_FK_NAME);
      expect(childIdxDef.isUnique).toBeUndefined('isUnique is defined');

      expect(() => childTable.getFKDefinition('not existing fk constraint')).toThrow();
      expect(() => childTable.getIDXDefinition('not existing index')).toThrow();
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('expect create (unique) index to work', async () => {
    let catalogDAO = new DbCatalogDAO(sqldb);
    try {
      await schema().createTable(sqldb, TABLE_TESTIDX_NAME);
      await schema().createIndex(sqldb, TABLE_TESTIDX_NAME, TABLE_TESTIDX_IDX_NAME_U);
      await schema().createIndex(sqldb, TABLE_TESTIDX_NAME, TABLE_TESTIDX_IDX_NAME_N);
    } catch (e) {
      fail(`creating table '${TABLE_TESTIDX_NAME}' and indexes failed: ${e.message}`);
    }

    try {
      const tableInfo = await catalogDAO.readTableInfo(TABLE_TESTIDX_NAME);
      expect(tableInfo).toBeDefined('table not created');
      expect(tableInfo!.indexes[TABLE_TESTIDX_IDX_NAME_U]).toBeDefined(
        `index '${TABLE_TESTIDX_IDX_NAME_U}' not created`,
      );
      expect(tableInfo!.indexes[TABLE_TESTIDX_IDX_NAME_U].unique).toBeTruthy(
        `index '${TABLE_TESTIDX_IDX_NAME_U}' is not unique`,
      );
      expect(tableInfo!.indexes[TABLE_TESTIDX_IDX_NAME_U].columns[0].desc).toBe(
        true,
        `index '${TABLE_TESTIDX_IDX_NAME_U}' is not descending`,
      );

      expect(tableInfo!.indexes[TABLE_TESTIDX_IDX_NAME_N]).toBeDefined(
        `index '${TABLE_TESTIDX_IDX_NAME_N}' not created`,
      );
      expect(tableInfo!.indexes[TABLE_TESTIDX_IDX_NAME_N].unique).toBeFalsy(
        `index '${TABLE_TESTIDX_IDX_NAME_N}' is unique`,
      );
      expect(tableInfo!.indexes[TABLE_TESTIDX_IDX_NAME_N].columns[0].desc).toBe(
        false,
        `index '${TABLE_TESTIDX_IDX_NAME_N}' is not descending`,
      );
    } catch (e) {
      fail(`reading catalog table info for '${TABLE_TESTIDX_NAME}' failed: ${e.message}`);
    }

    try {
      await schema().dropIndex(sqldb, TABLE_TESTIDX_NAME, TABLE_TESTIDX_IDX_NAME_U);
      await schema().dropIndex(sqldb, TABLE_TESTIDX_NAME, TABLE_TESTIDX_IDX_NAME_N);
    } catch (e) {
      fail(`dropping indexes on table '${TABLE_TESTIDX_NAME} failed: ${e.message}`);
    }

    try {
      // explictly setting isUnique takes precedence
      await schema().createIndex(sqldb, TABLE_TESTIDX_NAME, TABLE_TESTIDX_IDX_NAME_U, false);
      await schema().createIndex(sqldb, TABLE_TESTIDX_NAME, TABLE_TESTIDX_IDX_NAME_N, true);
    } catch (e) {
      fail(`creating indexes on '${TABLE_TESTIDX_NAME}' failed: ${e.message}`);
    }

    try {
      const tableInfo = await catalogDAO.readTableInfo(TABLE_TESTIDX_NAME);
      expect(tableInfo).toBeDefined('table not created');

      expect(tableInfo!.indexes[TABLE_TESTIDX_IDX_NAME_U]).toBeDefined(
        `index '${TABLE_TESTIDX_IDX_NAME_U}' not created`,
      );
      expect(tableInfo!.indexes[TABLE_TESTIDX_IDX_NAME_U].unique).toBeFalsy(
        `index '${TABLE_TESTIDX_IDX_NAME_U}' is unique`,
      );
      expect(tableInfo!.indexes[TABLE_TESTIDX_IDX_NAME_U].columns[0].desc).toBe(
        true,
        `index '${TABLE_TESTIDX_IDX_NAME_U}' is not descending`,
      );

      expect(tableInfo!.indexes[TABLE_TESTIDX_IDX_NAME_N]).toBeDefined(
        `index '${TABLE_TESTIDX_IDX_NAME_N}' not created`,
      );
      expect(tableInfo!.indexes[TABLE_TESTIDX_IDX_NAME_N].unique).toBeTruthy(
        `index '${TABLE_TESTIDX_IDX_NAME_N}' is not unique`,
      );
      expect(tableInfo!.indexes[TABLE_TESTIDX_IDX_NAME_N].columns[0].desc).toBe(
        false,
        `index '${TABLE_TESTIDX_IDX_NAME_N}' is not descending`,
      );
    } catch (e) {
      fail(`reading second catalog table info for '${TABLE_TESTIDX_NAME}' failed: ${e.message}`);
    }

    try {
      await schema().dropTable(sqldb, TABLE_TESTIDX_NAME);
    } catch (e) {
      fail(e);
    }
  });

  // ---------------------------------------------
  it('expect create/drop/alter-table to work (using Schema)', async () => {
    try {
      let catalogDAO = new DbCatalogDAO(sqldb);
      let tableInfo;

      // the database objects should not exist in the database catalog:
      tableInfo = await catalogDAO.readTableInfo(TABLE_PARENT_TABLE_NAME);
      expect(tableInfo).toBeUndefined(`table '${TABLE_PARENT_TABLE_NAME}' found`);

      tableInfo = await catalogDAO.readTableInfo(TABLE_CHILD_TABLE_NAMEQ);
      expect(tableInfo).toBeUndefined(`table '${TABLE_CHILD_TABLE_NAMEQ}' found`);

      // create tables

      await schema().createTable(sqldb, TABLE_PARENT_TABLE_NAME);
      await schema().createTable(sqldb, TABLE_CHILD_TABLE_NAMEQ);
      await schema().createIndex(sqldb, TABLE_CHILD_TABLE_NAMEQ, TABLE_CHILD_IDX_NAMEQ);

      // now the database objects should exist in the database catalog:
      tableInfo = await catalogDAO.readTableInfo(TABLE_PARENT_TABLE_NAME);
      expect(tableInfo).toBeDefined(`table '${TABLE_PARENT_TABLE_NAME}' not found`);

      tableInfo = await catalogDAO.readTableInfo(TABLE_CHILD_TABLE_NAMEQ);
      expect(tableInfo).toBeDefined(`table '${TABLE_CHILD_TABLE_NAMEQ}' not found`);
      expect(tableInfo!.indexes[TABLE_CHILD_IDX_NAME]).toBeDefined(
        `index '${TABLE_CHILD_IDX_NAME}' not found`,
      );

      // alter table add a new column

      let parentTable = schema().getTable(TABLE_PARENT_TABLE_NAME);
      expect(parentTable).toBeDefined();

      const newField = parentTable.getOrAddTableField('TESTADDCOL1', false, { dbtype: 'INTEGER' });
      expect(newField.name).toBe('TESTADDCOL1');
      expect(parentTable.hasTableField(newField.name)).toBeTruthy();

      await schema().alterTableAddColumn(sqldb, TABLE_PARENT_TABLE_NAME, newField.name);
      let parentTableInfo = await dbCatDao.readTableInfo(TABLE_PARENT_TABLE_NAME);
      expect(parentTableInfo!.columns[newField.name]).toBeDefined();

      await schema().dropIndex(sqldb, TABLE_CHILD_TABLE_NAMEQ, TABLE_CHILD_IDX_NAMEQ);

      tableInfo = await catalogDAO.readTableInfo(TABLE_CHILD_TABLE_NAMEQ);
      expect(tableInfo).toBeDefined(`table '${TABLE_CHILD_TABLE_NAMEQ}' not found`);
      expect(tableInfo!.indexes[TABLE_CHILD_IDX_NAME]).toBeUndefined(
        `index '${TABLE_CHILD_IDX_NAME}' found`,
      );

      await schema().dropTable(sqldb, TABLE_CHILD_TABLE_NAMEQ);
      await schema().dropTable(sqldb, TABLE_PARENT_TABLE_NAME);

      // now database objects should not exist in the database catalog:
      tableInfo = await catalogDAO.readTableInfo(TABLE_PARENT_TABLE_NAME);
      expect(tableInfo).toBeUndefined(`table '${TABLE_PARENT_TABLE_NAME}' found`);

      tableInfo = await catalogDAO.readTableInfo(TABLE_CHILD_TABLE_NAMEQ);
      expect(tableInfo).toBeUndefined(`table '${TABLE_CHILD_TABLE_NAMEQ}' found`);
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('expect create/drop/alter-table to work (using BaseDAO)', async () => {
    try {
      let catalogDAO = new DbCatalogDAO(sqldb);
      let tableInfo;

      // the database objects should not exist in the database catalog:
      tableInfo = await catalogDAO.readTableInfo(TABLE_PARENT_TABLE_NAME);
      expect(tableInfo).toBeUndefined(`table '${TABLE_PARENT_TABLE_NAME}' found`);

      tableInfo = await catalogDAO.readTableInfo(TABLE_CHILD_TABLE_NAMEQ);
      expect(tableInfo).toBeUndefined(`table '${TABLE_CHILD_TABLE_NAMEQ}' found`);

      // create tables

      let parentDAO = new BaseDAO<ParentTable>(ParentTable, sqldb);
      let childDAO = new BaseDAO<ChildTable>(ChildTable, sqldb);

      await parentDAO.createTable();
      await childDAO.createTable();
      await childDAO.createIndex(TABLE_CHILD_IDX_NAMEQ);

      // now the database objects should exist in the database catalog:
      tableInfo = await catalogDAO.readTableInfo(TABLE_PARENT_TABLE_NAME);
      expect(tableInfo).toBeDefined(`table '${TABLE_PARENT_TABLE_NAME}' not found`);

      tableInfo = await catalogDAO.readTableInfo(TABLE_CHILD_TABLE_NAMEQ);
      expect(tableInfo).toBeDefined(`table '${TABLE_CHILD_TABLE_NAMEQ}' not found`);
      expect(tableInfo!.indexes[TABLE_CHILD_IDX_NAME]).toBeDefined(
        `index '${TABLE_CHILD_IDX_NAME}' not found`,
      );

      // alter table add a new column

      let parentTable = schema().getTable(TABLE_PARENT_TABLE_NAME);
      expect(parentTable).toBeDefined();

      const newField = parentTable.getOrAddTableField('TESTADDCOL2', false, { dbtype: 'INTEGER' });
      expect(newField.name).toBe('TESTADDCOL2');
      expect(parentTable.hasTableField(newField.name)).toBeTruthy();

      await parentDAO.alterTableAddColumn(newField.name);
      let parentTableInfo = await dbCatDao.readTableInfo(TABLE_PARENT_TABLE_NAME);
      expect(parentTableInfo!.columns[newField.name]).toBeDefined();

      await childDAO.dropIndex(TABLE_CHILD_IDX_NAMEQ);

      tableInfo = await catalogDAO.readTableInfo(TABLE_CHILD_TABLE_NAMEQ);
      expect(tableInfo).toBeDefined(`table '${TABLE_CHILD_TABLE_NAMEQ}' not found`);
      expect(tableInfo!.indexes[TABLE_CHILD_IDX_NAME]).toBeUndefined(
        `index '${TABLE_CHILD_IDX_NAME}' found`,
      );

      await childDAO.dropTable();
      await parentDAO.dropTable();

      // now database objects should not exist in the database catalog:
      tableInfo = await catalogDAO.readTableInfo(TABLE_PARENT_TABLE_NAME);
      expect(tableInfo).toBeUndefined(`table '${TABLE_PARENT_TABLE_NAME}' found`);

      tableInfo = await catalogDAO.readTableInfo(TABLE_CHILD_TABLE_NAMEQ);
      expect(tableInfo).toBeUndefined(`table '${TABLE_CHILD_TABLE_NAMEQ}' found`);
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('getTable for undefined table should throw', async () => {
    try {
      schema().getTable('NOTABLE');
      fail('should have thrown');
    } catch (err) {}
  });

  // ---------------------------------------------
  it('get not defined field should throw', async () => {
    let testTable = schema().getTable(TABLE_TESTTABLE_NAME);
    try {
      let nameField = testTable.getTableField('undef');
      fail('should have thrown');
    } catch (err) {}
  });

  // ---------------------------------------------
  it('get create index statement for undefined index should throw', async () => {
    let testTable = schema().getTable(TABLE_TESTTABLE_NAME);
    try {
      let nameField = testTable.getCreateIndexStatement('undef');
      fail('should have thrown');
    } catch (err) {}
  });

  // ---------------------------------------------
  it('get drop index statement for undefined index should throw', async () => {
    let testTable = schema().getTable(TABLE_TESTTABLE_NAME);
    try {
      let nameField = testTable.getDropIndexStatement('undef');
      fail('should have thrown');
    } catch (err) {}
  });

  // ---------------------------------------------
  it('schema should be a singleton', async () => {
    try {
      let currSchema = schema();
      expect(new Schema()).toBe(currSchema);
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('getAllTables should not throw', () => {
    schema().getAllTables();
  });
});
