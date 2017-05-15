import { field, fk, id, table, index } from '../decorators';
import { Field } from '../Field';
import { schema } from '../Schema';
import { SQL_MEMORY_DB_PRIVATE, SqlDatabase } from '../SqlDatabase';
import { BaseDAO } from '../BaseDAO';


// sqlite3 catalog table

@table({ name: 'sqlite_master' })
class CatalogTable {

  @id({ name: 'type', dbtype: 'TEXT' })
  objType?: string;

  @id({ name: 'name', dbtype: 'TEXT' })
  objName?: string;

  @field({ name: 'tbl_name', dbtype: 'TEXT' })
  tblName?: string;

  @field({ name: 'rootpage', dbtype: 'INTEGER' })
  rootPage?: number;

  @field({ name: 'sql', dbtype: 'TEXT' })
  sql?: string;

  public constructor() {
    this.objType = undefined;
    this.objName = undefined;
    this.tblName = undefined;
    this.rootPage = undefined;
    this.sql = undefined;
  }
}




const TABLE_PARENT_TABLE_NAME = 'PARENTTABLE';
const TABLE_PARENT_FIELD_ID_NAME = 'ID';
const TABLE_PARENT_FIELD_NAME_NAME = 'NAME';

const TABLE_CHILD_TABLE_NAME = 'CHILDTABLE';
const TABLE_CHILD_FIELD_ID_NAME = 'ID';
const TABLE_CHILD_FIELD_NAME_NAME = 'NAME';
const TABLE_CHILD_FIELD_FK_NAME = 'PARENT_ID';
const TABLE_CHILD_FK_CONSTRAINT_NAME = 'PARENT_CHILDS';
const TABLE_CHILD_IDX_NAME = 'CHILD_PARENT_IDX';


@table({ name: TABLE_PARENT_TABLE_NAME })
class ParentTable {
  @id({ name: TABLE_PARENT_FIELD_ID_NAME, dbtype: 'INTEGER NOT NULL' })
  public id?: number;

  @field({ name: TABLE_PARENT_FIELD_NAME_NAME, dbtype: 'TEXT' })
  public name?: string;

  public constructor() {
    this.id = undefined;
    this.name = undefined;
  }
}


@table({ name: TABLE_CHILD_TABLE_NAME, autoIncrement: true })
class ChildTable {
  @id({ name: TABLE_CHILD_FIELD_ID_NAME, dbtype: 'INTEGER NOT NULL' })
  public id?: number;

  @field({ name: TABLE_CHILD_FIELD_NAME_NAME, dbtype: 'TEXT' })
  public name?: string;

  @field({ name: TABLE_CHILD_FIELD_FK_NAME, dbtype: 'INTEGER NOT NULL' })
  @fk(TABLE_CHILD_FK_CONSTRAINT_NAME, TABLE_PARENT_TABLE_NAME,
    TABLE_PARENT_FIELD_ID_NAME)
  @index(TABLE_CHILD_IDX_NAME)
  public parentId?: number;

  public constructor() {
    this.id = undefined;
    this.name = undefined;
    this.parentId = undefined;
  }
}



// ---------------------------------------------

describe('test schema', () => {
  let sqldb: SqlDatabase;

  // ---------------------------------------------
  beforeAll(async (done) => {
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
      let parentIdField = parentTable.getTableField(TABLE_PARENT_FIELD_ID_NAME);
      expect(parentIdField).toBeDefined();
      expect(parentIdField.name).toBe(TABLE_PARENT_FIELD_ID_NAME);
      expect(parentIdField.isIdentity).toBeTruthy();
      let parentNameField =
        parentTable.getTableField(TABLE_PARENT_FIELD_NAME_NAME);
      expect(parentNameField).toBeDefined();
      expect(parentNameField.name).toBe(TABLE_PARENT_FIELD_NAME_NAME);
      expect(parentNameField.isIdentity).toBeFalsy();

      let childTable = schema().getTable(TABLE_CHILD_TABLE_NAME);
      expect(childTable).toBeDefined();
      expect(childTable.name).toBe(TABLE_CHILD_TABLE_NAME);
      let childIdField = childTable.getTableField(TABLE_CHILD_FIELD_ID_NAME);
      expect(childIdField).toBeDefined();
      expect(childIdField.name).toBe(TABLE_CHILD_FIELD_ID_NAME);
      expect(childIdField.isIdentity).toBeTruthy();
      let childNameField =
        childTable.getTableField(TABLE_CHILD_FIELD_NAME_NAME);
      expect(childNameField).toBeDefined();
      expect(childNameField.name).toBe(TABLE_CHILD_FIELD_NAME_NAME);
      expect(childNameField.isIdentity).toBeFalsy();
      let childFKField = childTable.getTableField(TABLE_CHILD_FIELD_FK_NAME);
      expect(childFKField).toBeDefined();
      expect(childFKField.name).toBe(TABLE_CHILD_FIELD_FK_NAME);
      expect(childFKField.isIdentity).toBeFalsy();
      let childFKFieldRef =
        childFKField.getForeignKeyField(TABLE_CHILD_FK_CONSTRAINT_NAME);
      expect(childFKFieldRef.tableName).toBe(TABLE_PARENT_TABLE_NAME);
      expect(childFKFieldRef.colName).toBe(TABLE_PARENT_FIELD_ID_NAME);

      expect(childFKField.isIndexField(TABLE_CHILD_IDX_NAME)).toBeTruthy();

    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('expect create/drop/alter-table to work (using Schema)', async (done) => {
    try {
      let catalogDAO = new BaseDAO<CatalogTable>(CatalogTable, sqldb);
      let catalogItem = new CatalogTable();

      // the database objects should not exist in the database catalog:
      catalogItem.objType = 'table';
      catalogItem.objName = TABLE_PARENT_TABLE_NAME;
      try { await catalogDAO.select(catalogItem); } catch (e) { expect(e).toBeDefined(); }

      catalogItem.objType = 'table';
      catalogItem.objName = TABLE_CHILD_TABLE_NAME;
      try { await catalogDAO.select(catalogItem); } catch (e) { expect(e).toBeDefined(); }

      catalogItem.objType = 'index';
      catalogItem.objName = TABLE_CHILD_IDX_NAME;
      try { await catalogDAO.select(catalogItem); } catch (e) { expect(e).toBeDefined(); }

      // create tables

      await schema().createTable(sqldb, TABLE_PARENT_TABLE_NAME);
      await schema().createTable(sqldb, TABLE_CHILD_TABLE_NAME);
      await schema().createIndex(sqldb, TABLE_CHILD_TABLE_NAME, TABLE_CHILD_IDX_NAME);

      // now the database objects should exist in the database catalog:
      catalogItem.objType = 'table';
      catalogItem.objName = TABLE_PARENT_TABLE_NAME;
      catalogItem = await catalogDAO.select(catalogItem);

      catalogItem.objType = 'table';
      catalogItem.objName = TABLE_CHILD_TABLE_NAME;
      catalogItem = await catalogDAO.select(catalogItem);

      catalogItem.objType = 'index';
      catalogItem.objName = TABLE_CHILD_IDX_NAME;
      catalogItem = await catalogDAO.select(catalogItem);
      expect(catalogItem.tblName === TABLE_CHILD_TABLE_NAME);

      // alter table add a new column

      let parentTable = schema().getTable(TABLE_PARENT_TABLE_NAME);
      expect(parentTable).toBeDefined();

      let newProperty = Symbol('dyndef1');
      let newField = new Field(newProperty);
      newField.name = 'TESTADDCOL1';
      newField.dbtype = 'INTEGER';
      parentTable.addPropertyField(newField);
      parentTable.addTableField(newField);
      expect(parentTable.hasPropertyField(newProperty)).toBeTruthy();
      expect(parentTable.hasTableField(newField.name)).toBeTruthy();

      await schema().alterTableAddColumn(
        sqldb, TABLE_PARENT_TABLE_NAME, newField.name);

      await schema().dropTable(sqldb, TABLE_CHILD_TABLE_NAME);
      await schema().dropTable(sqldb, TABLE_PARENT_TABLE_NAME);

      // now database objects should not exist in the database catalog:
      catalogItem.objType = 'table';
      catalogItem.objName = TABLE_PARENT_TABLE_NAME;
      try { await catalogDAO.select(catalogItem); } catch (e) { expect(e).toBeDefined(); }

      catalogItem.objType = 'table';
      catalogItem.objName = TABLE_CHILD_TABLE_NAME;
      try { await catalogDAO.select(catalogItem); } catch (e) { expect(e).toBeDefined(); }

      catalogItem.objType = 'index';
      catalogItem.objName = TABLE_CHILD_IDX_NAME;
      try { await catalogDAO.select(catalogItem); } catch (e) { expect(e).toBeDefined(); }

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
      catalogItem.objName = TABLE_PARENT_TABLE_NAME;
      try { await catalogDAO.select(catalogItem); } catch (e) { expect(e).toBeDefined(); }

      catalogItem.objType = 'table';
      catalogItem.objName = TABLE_CHILD_TABLE_NAME;
      try { await catalogDAO.select(catalogItem); } catch (e) { expect(e).toBeDefined(); }

      catalogItem.objType = 'index';
      catalogItem.objName = TABLE_CHILD_IDX_NAME;
      try { await catalogDAO.select(catalogItem); } catch (e) { expect(e).toBeDefined(); }

      // create tables

      let parentDAO = new BaseDAO<ParentTable>(ParentTable, sqldb);
      let childDAO = new BaseDAO<ChildTable>(ChildTable, sqldb);

      await parentDAO.createTable();
      await childDAO.createTable();
      await childDAO.createIndex(TABLE_CHILD_IDX_NAME);

      // now the database objects should exist in the database catalog:
      catalogItem.objType = 'table';
      catalogItem.objName = TABLE_PARENT_TABLE_NAME;
      catalogItem = await catalogDAO.select(catalogItem);

      catalogItem.objType = 'table';
      catalogItem.objName = TABLE_CHILD_TABLE_NAME;
      catalogItem = await catalogDAO.select(catalogItem);

      catalogItem.objType = 'index';
      catalogItem.objName = TABLE_CHILD_IDX_NAME;
      catalogItem = await catalogDAO.select(catalogItem);
      expect(catalogItem.tblName === TABLE_CHILD_TABLE_NAME);

      // alter table add a new column

      let parentTable = schema().getTable(TABLE_PARENT_TABLE_NAME);
      expect(parentTable).toBeDefined();

      let newProperty = Symbol('dyndef2');
      let newField = new Field(newProperty);
      newField.name = 'TESTADDCOL2';
      newField.dbtype = 'INTEGER';
      parentTable.addPropertyField(newField);
      parentTable.addTableField(newField);
      expect(parentTable.hasPropertyField(newProperty)).toBeTruthy();
      expect(parentTable.hasTableField(newField.name)).toBeTruthy();

      await schema().alterTableAddColumn(
        sqldb, TABLE_PARENT_TABLE_NAME, newField.name);

      await childDAO.dropTable();
      await parentDAO.dropTable();

      // now database objects should not exist in the database catalog:
      catalogItem.objType = 'table';
      catalogItem.objName = TABLE_PARENT_TABLE_NAME;
      try { await catalogDAO.select(catalogItem); } catch (e) { expect(e).toBeDefined(); }

      catalogItem.objType = 'table';
      catalogItem.objName = TABLE_CHILD_TABLE_NAME;
      try { await catalogDAO.select(catalogItem); } catch (e) { expect(e).toBeDefined(); }

      catalogItem.objType = 'index';
      catalogItem.objName = TABLE_CHILD_IDX_NAME;
      try { await catalogDAO.select(catalogItem); } catch (e) { expect(e).toBeDefined(); }

    } catch (err) {
      fail(err);
    }
    done();
  });


});
