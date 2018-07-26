// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class deprecation
// tslint:disable no-non-null-assertion
import {
  BaseDAO,
  Field,
  SqlDatabase,
  Schema,
  SQL_MEMORY_DB_PRIVATE,
  schema,
  field,
  fk,
  id,
  index,
  table,
  qualifiyIdentifier,
  getModelMetadata,
  MetaModel
} from '..';
import {unqualifyIdentifier} from '../utils';
import {FKFieldDefinition} from '../FKFieldDefinition';
import {MetaProperty} from '../MetaProperty';
// sqlite3 catalog table



const TABLE_PARENT_TABLE_NAME = 'S:PARENTTABLE';
const TABLE_PARENT_TABLE_NAMEQ = qualifiyIdentifier(TABLE_PARENT_TABLE_NAME);
const TABLE_PARENT_FIELD_ID_NAME = 'ID';
const TABLE_PARENT_FIELD_NAME_NAME = 'NAME';

const TABLE_CHILD_TABLE_NAME = 'S:CHILD TABLE';
const TABLE_CHILD_TABLE_NAMEQ = qualifiyIdentifier(TABLE_CHILD_TABLE_NAME);
const TABLE_CHILD_FIELD_ID_NAME = 'ID';
const TABLE_CHILD_FIELD_NAME_NAME = 'NAME';
const TABLE_CHILD_FIELD_FK_NAME = 'PARENT_ID';
const TABLE_CHILD_FK_CONSTRAINT_NAME = 'PARENT_CHILDS';
const TABLE_CHILD_IDX_NAME = 'S:CHILD PARENT IDX';
const TABLE_CHILD_IDX_NAMEQ = qualifiyIdentifier(TABLE_CHILD_IDX_NAME);

const TABLE_TESTTABLE_NAME = 'S:TESTTABLE';

const TABLE_TESTIDX_NAME = 'S:TESTIDX';
const TABLE_TESTIDX_IDX_NAME_U = 'S:TEST_IDU';
const TABLE_TESTIDX_IDX_NAME_N = 'S:TEST_IDN';


@table({name: 'sqlite_master'})
class CatalogTable {
  @id({name: 'type', dbtype: 'TEXT'})
  objType?: string;

  @id({name: 'name', dbtype: 'TEXT'})
  objName?: string;

  @field({name: 'tbl_name', dbtype: 'TEXT'})
  tblName?: string;

  @field({name: 'rootpage', dbtype: 'INTEGER'})
  rootPage?: number;

  @field({name: 'sql', dbtype: 'TEXT'})
  sql?: string;

  public constructor() {
    this.objType = undefined;
    this.objName = undefined;
    this.tblName = undefined;
    this.rootPage = undefined;
    this.sql = undefined;
  }
}


@table({name: TABLE_PARENT_TABLE_NAME})
class ParentTable {
  @id({name: TABLE_PARENT_FIELD_ID_NAME, dbtype: 'INTEGER NOT NULL'}) public id?: number;

  @field({name: TABLE_PARENT_FIELD_NAME_NAME, dbtype: 'TEXT'}) public name?: string;

  dyndef2: number;

  public constructor() {
    this.id = undefined;
    this.name = undefined;
    this.dyndef2 = 42;
  }
}


@table({name: TABLE_CHILD_TABLE_NAMEQ, autoIncrement: true})
class ChildTable {
  @id({name: TABLE_CHILD_FIELD_ID_NAME, dbtype: 'INTEGER NOT NULL'}) public id?: number;

  @field({name: TABLE_CHILD_FIELD_NAME_NAME, dbtype: 'TEXT'}) public name?: string;

  @field({name: TABLE_CHILD_FIELD_FK_NAME, dbtype: 'INTEGER NOT NULL'})
  @fk(TABLE_CHILD_FK_CONSTRAINT_NAME, TABLE_PARENT_TABLE_NAME, TABLE_PARENT_FIELD_ID_NAME)
  @index(TABLE_CHILD_IDX_NAMEQ)
  public parentId?: number;

  public constructor() {
    this.id = undefined;
    this.name = undefined;
    this.parentId = undefined;
  }
}


@table({name: TABLE_TESTTABLE_NAME, withoutRowId: true})
class TestTable {
  @id({name: 'ID', dbtype: 'INTEGER NOT NULL'}) public id?: number;

  @field({name: 'NAME', dbtype: 'TEXT'}) public name?: string;

  @field({name: 'NAME2', dbtype: 'TEXT'}) public name2?: string;

  public constructor() {}
}


@table({name: TABLE_TESTIDX_NAME})
class TestIdx {
  @id({name: 'ID', dbtype: 'INTEGER NOT NULL'}) public id!: number;

  @field({name: 'COL1', dbtype: 'TEXT'}) @index(TABLE_TESTIDX_IDX_NAME_U, true) public col1?: string;

  @field({name: 'COL2', dbtype: 'TEXT'}) @index(TABLE_TESTIDX_IDX_NAME_N) public col2?: string;
}



// ---------------------------------------------

describe('test schema', () => {
  let sqldb: SqlDatabase;

  // ---------------------------------------------
  beforeEach(async (done) => {
    try {
      sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE);
      done();
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
      expect(parentNameField.isIdentity).toBeFalsy();


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
      expect(childNameField.isIdentity).toBeFalsy();
      let childFKField = childTable.getTableField(TABLE_CHILD_FIELD_FK_NAME);
      expect(childFKField).toBeDefined();
      expect(childFKField.name).toBe(TABLE_CHILD_FIELD_FK_NAME);
      expect(childFKField.quotedName).toBeDefined();
      expect(childFKField.isIdentity).toBeFalsy();
      let childFKFieldDef = childFKField.foreignKeys.get(TABLE_CHILD_FK_CONSTRAINT_NAME);
      expect(childFKFieldDef!.foreignTableName).toBe(TABLE_PARENT_TABLE_NAME);
      expect(childFKFieldDef!.foreignColumName).toBe(TABLE_PARENT_FIELD_ID_NAME);
      const childFKDef = childTable.getFKDefinition(TABLE_CHILD_FK_CONSTRAINT_NAME);
      expect(() => childTable.getFKDefinition('not existing fk constraint')).toThrow();
      expect(childFKDef.foreignTableName).toBe(TABLE_PARENT_TABLE_NAME);

      expect(childFKField.isIndexField(TABLE_CHILD_IDX_NAMEQ)).toBeTruthy();
      const childIDXDef = childTable.getIDXDefinition(TABLE_CHILD_IDX_NAMEQ);
      expect(() => childTable.getIDXDefinition('not existing index')).toThrow();


    } catch (err) {
      fail(err);
    }
  });


  // ---------------------------------------------
  it('expect create (unique) index to work', async (done) => {
    let catalogDAO = new BaseDAO<CatalogTable>(CatalogTable, sqldb);
    let catalogItem = new CatalogTable();
    try {
      await schema().createTable(sqldb, TABLE_TESTIDX_NAME);
      await schema().createIndex(sqldb, TABLE_TESTIDX_NAME, TABLE_TESTIDX_IDX_NAME_U);
      await schema().createIndex(sqldb, TABLE_TESTIDX_NAME, TABLE_TESTIDX_IDX_NAME_N);
    } catch (e) {
      fail(`creating table '${TABLE_TESTIDX_NAME}' and indexes failed: ${e.message}`);
    }

    catalogItem.objType = 'index';
    catalogItem.objName = unqualifyIdentifier(TABLE_TESTIDX_IDX_NAME_U);
    catalogItem = await catalogDAO.select(catalogItem);
    expect(catalogItem.tblName === unqualifyIdentifier(TABLE_TESTIDX_NAME));
    expect(catalogItem.sql).toBeDefined();
    expect(catalogItem.sql!.indexOf('CREATE UNIQUE'))
        .not.toBe(-1, `for '${TABLE_TESTIDX_IDX_NAME_U}: ${catalogItem.sql}`);

    catalogItem.objType = 'index';
    catalogItem.objName = unqualifyIdentifier(TABLE_TESTIDX_IDX_NAME_N);
    catalogItem = await catalogDAO.select(catalogItem);
    expect(catalogItem.tblName === unqualifyIdentifier(TABLE_TESTIDX_NAME));
    expect(catalogItem.sql).toBeDefined();
    expect(catalogItem.sql!.indexOf('CREATE UNIQUE')).toBe(-1, `for '${TABLE_TESTIDX_IDX_NAME_N}`);

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
    catalogItem.objType = 'index';
    catalogItem.objName = unqualifyIdentifier(TABLE_TESTIDX_IDX_NAME_U);
    catalogItem = await catalogDAO.select(catalogItem);
    expect(catalogItem.tblName === unqualifyIdentifier(TABLE_TESTIDX_NAME));
    expect(catalogItem.sql).toBeDefined();
    expect(catalogItem.sql!.indexOf('CREATE UNIQUE')).toBe(-1, `for '${TABLE_TESTIDX_IDX_NAME_U}: ${catalogItem.sql}`);

    catalogItem.objType = 'index';
    catalogItem.objName = unqualifyIdentifier(TABLE_TESTIDX_IDX_NAME_N);
    catalogItem = await catalogDAO.select(catalogItem);
    expect(catalogItem.tblName === unqualifyIdentifier(TABLE_TESTIDX_NAME));
    expect(catalogItem.sql).toBeDefined();
    expect(catalogItem.sql!.indexOf('CREATE UNIQUE')).not.toBe(-1, `for '${TABLE_TESTIDX_IDX_NAME_N}`);

    done();
  });

  // ---------------------------------------------
  it('expect create/drop/alter-table to work (using Schema)', async (done) => {
    try {
      let catalogDAO = new BaseDAO<CatalogTable>(CatalogTable, sqldb);
      let catalogItem = new CatalogTable();

      // the database objects should not exist in the database catalog:
      catalogItem.objType = 'table';
      catalogItem.objName = unqualifyIdentifier(TABLE_PARENT_TABLE_NAME);
      try {
        await catalogDAO.select(catalogItem);
      } catch (e) {
        expect(e).toBeDefined();
      }

      catalogItem.objType = 'table';
      catalogItem.objName = unqualifyIdentifier(TABLE_CHILD_TABLE_NAMEQ);
      try {
        await catalogDAO.select(catalogItem);
      } catch (e) {
        expect(e).toBeDefined();
      }

      catalogItem.objType = 'index';
      catalogItem.objName = unqualifyIdentifier(TABLE_CHILD_IDX_NAMEQ);
      try {
        await catalogDAO.select(catalogItem);
      } catch (e) {
        expect(e).toBeDefined();
      }

      // create tables

      await schema().createTable(sqldb, TABLE_PARENT_TABLE_NAME);
      await schema().createTable(sqldb, TABLE_CHILD_TABLE_NAMEQ);
      await schema().createIndex(sqldb, TABLE_CHILD_TABLE_NAMEQ, TABLE_CHILD_IDX_NAMEQ);

      // now the database objects should exist in the database catalog:
      catalogItem.objType = 'table';
      catalogItem.objName = unqualifyIdentifier(TABLE_PARENT_TABLE_NAME);
      catalogItem = await catalogDAO.select(catalogItem);

      catalogItem.objType = 'table';
      catalogItem.objName = unqualifyIdentifier(TABLE_CHILD_TABLE_NAMEQ);
      catalogItem = await catalogDAO.select(catalogItem);

      catalogItem.objType = 'index';
      catalogItem.objName = unqualifyIdentifier(TABLE_CHILD_IDX_NAMEQ);
      catalogItem = await catalogDAO.select(catalogItem);
      expect(catalogItem.tblName === unqualifyIdentifier(TABLE_CHILD_TABLE_NAMEQ));

      // alter table add a new column

      let parentTable = schema().getTable(TABLE_PARENT_TABLE_NAME);
      expect(parentTable).toBeDefined();

      let newProperty = Symbol('dyndef1');
      let newField = new Field('TESTADDCOL1');
      newField.dbtype = 'INTEGER';
      parentTable.addTableField(newField);
      expect(parentTable.hasTableField(newField.name)).toBeTruthy();

      // TODO: validate if new column exist afterwards
      await schema().alterTableAddColumn(sqldb, TABLE_PARENT_TABLE_NAME, newField.name);

      await schema().dropIndex(sqldb, TABLE_CHILD_TABLE_NAMEQ, TABLE_CHILD_IDX_NAMEQ);
      catalogItem.objType = 'index';
      catalogItem.objName = unqualifyIdentifier(TABLE_CHILD_IDX_NAMEQ);
      try {
        await catalogDAO.select(catalogItem);
        fail(`index should not exist`);
      } catch (e) {
        expect(e).toBeDefined();
      }

      await schema().dropTable(sqldb, TABLE_CHILD_TABLE_NAMEQ);
      await schema().dropTable(sqldb, TABLE_PARENT_TABLE_NAME);

      // now database objects should not exist in the database catalog:

      catalogItem.objType = 'table';
      catalogItem.objName = unqualifyIdentifier(TABLE_PARENT_TABLE_NAME);
      try {
        await catalogDAO.select(catalogItem);
        fail(`table ${TABLE_CHILD_TABLE_NAMEQ} should not exist`);
      } catch (e) {
        expect(e).toBeDefined();
      }

      catalogItem.objType = 'table';
      catalogItem.objName = unqualifyIdentifier(TABLE_CHILD_TABLE_NAMEQ);
      try {
        await catalogDAO.select(catalogItem);
        fail(`table ${TABLE_CHILD_TABLE_NAMEQ} should not exist`);
      } catch (e) {
        expect(e).toBeDefined();
      }

    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('expect create/drop/alter-table to work (using BaseDAO)', async (done) => {
    try {
      let catalogDAO = new BaseDAO<CatalogTable>(CatalogTable, sqldb);
      let catalogItem = new CatalogTable();

      // the database objects should not exist in the database catalog:
      catalogItem.objType = 'table';
      catalogItem.objName = unqualifyIdentifier(TABLE_PARENT_TABLE_NAME);
      try {
        await catalogDAO.select(catalogItem);
      } catch (e) {
        expect(e).toBeDefined();
      }

      catalogItem.objType = 'table';
      catalogItem.objName = unqualifyIdentifier(TABLE_CHILD_TABLE_NAMEQ);
      try {
        await catalogDAO.select(catalogItem);
      } catch (e) {
        expect(e).toBeDefined();
      }

      catalogItem.objType = 'index';
      catalogItem.objName = unqualifyIdentifier(TABLE_CHILD_IDX_NAMEQ);
      try {
        await catalogDAO.select(catalogItem);
      } catch (e) {
        expect(e).toBeDefined();
      }

      // create tables

      let parentDAO = new BaseDAO<ParentTable>(ParentTable, sqldb);
      let childDAO = new BaseDAO<ChildTable>(ChildTable, sqldb);

      await parentDAO.createTable();
      await childDAO.createTable();
      await childDAO.createIndex(TABLE_CHILD_IDX_NAMEQ);

      // now the database objects should exist in the database catalog:
      catalogItem.objType = 'table';
      catalogItem.objName = unqualifyIdentifier(TABLE_PARENT_TABLE_NAME);
      catalogItem = await catalogDAO.select(catalogItem);

      catalogItem.objType = 'table';
      catalogItem.objName = unqualifyIdentifier(TABLE_CHILD_TABLE_NAMEQ);
      catalogItem = await catalogDAO.select(catalogItem);

      catalogItem.objType = 'index';
      catalogItem.objName = unqualifyIdentifier(TABLE_CHILD_IDX_NAMEQ);
      catalogItem = await catalogDAO.select(catalogItem);
      expect(catalogItem.tblName === unqualifyIdentifier(TABLE_CHILD_TABLE_NAMEQ));

      // alter table add a new column

      let parentTable = schema().getTable(TABLE_PARENT_TABLE_NAME);
      expect(parentTable).toBeDefined();

      let newProperty = 'dyndef2';
      let newField = new Field('TESTADDCOL2');
      newField.dbtype = 'INTEGER';
      parentTable.addTableField(newField);

      expect(parentTable.hasTableField(newField.name)).toBeTruthy();

      // TODO: validate if new column exist afterwards
      await parentDAO.alterTableAddColumn(newField.name);

      await childDAO.dropIndex(TABLE_CHILD_IDX_NAMEQ);
      catalogItem.objType = 'index';
      catalogItem.objName = unqualifyIdentifier(TABLE_CHILD_IDX_NAMEQ);
      try {
        await catalogDAO.select(catalogItem);
        fail('index should not exist');
      } catch (e) {
        expect(e).toBeDefined();
      }

      await childDAO.dropTable();
      await parentDAO.dropTable();

      // now database objects should not exist in the database catalog:
      catalogItem.objType = 'table';
      catalogItem.objName = unqualifyIdentifier(TABLE_PARENT_TABLE_NAME);
      try {
        await catalogDAO.select(catalogItem);
        fail(`table ${TABLE_PARENT_TABLE_NAME} should not exist`);
      } catch (e) {
        expect(e).toBeDefined();
      }

      catalogItem.objType = 'table';
      catalogItem.objName = unqualifyIdentifier(TABLE_CHILD_TABLE_NAMEQ);
      try {
        await catalogDAO.select(catalogItem);
        fail(`table ${TABLE_CHILD_TABLE_NAMEQ} should not exist`);
      } catch (e) {
        expect(e).toBeDefined();
      }

    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('getTable for undefined table should throw', async (done) => {
    try {
      schema().getTable('NOTABLE');
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });

  // ---------------------------------------------
  it('addTable for registered table should throw', async (done) => {
    try {
      let parentTable = schema().getTable(TABLE_PARENT_TABLE_NAME);
      schema().addTable(parentTable);
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });


  // ---------------------------------------------
  it('get not defined field should throw', async (done) => {
    let testTable = schema().getTable(TABLE_TESTTABLE_NAME);
    try {
      let nameField = testTable.getTableField('undef');
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });

  // ---------------------------------------------
  it('get create index statement for undefined index should throw', async (done) => {
    let testTable = schema().getTable(TABLE_TESTTABLE_NAME);
    try {
      let nameField = testTable.getCreateIndexStatement('undef');
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });

  // ---------------------------------------------
  it('get drop index statement for undefined index should throw', async (done) => {
    let testTable = schema().getTable(TABLE_TESTTABLE_NAME);
    try {
      let nameField = testTable.getDropIndexStatement('undef');
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });

  // ---------------------------------------------
  it('schema should be a singleton', async (done) => {
    try {
      let currSchema = schema();
      expect(new Schema()).toBe(currSchema);
    } catch (err) {
      fail(err);
    }
    done();
  });


});
