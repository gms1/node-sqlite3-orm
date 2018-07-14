// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class deprecation
import {BaseDAO, Field, SqlDatabase, Schema, SQL_MEMORY_DB_PRIVATE, schema, field, fk, id, index, table} from '..';
import {unqualifiedIdentifierName} from '../utils';
// sqlite3 catalog table

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



const TABLE_PARENT_TABLE_NAME = 'PARENTTABLE';
const TABLE_PARENT_FIELD_ID_NAME = 'ID';
const TABLE_PARENT_FIELD_NAME_NAME = 'NAME';

const TABLE_CHILD_TABLE_NAME = 'main.CHILD TABLE';
const TABLE_CHILD_FIELD_ID_NAME = 'ID';
const TABLE_CHILD_FIELD_NAME_NAME = 'NAME';
const TABLE_CHILD_FIELD_FK_NAME = 'PARENT_ID';
const TABLE_CHILD_FK_CONSTRAINT_NAME = 'PARENT_CHILDS';
const TABLE_CHILD_IDX_NAME = 'main.CHILD PARENT IDX';


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


@table({name: TABLE_CHILD_TABLE_NAME, autoIncrement: true})
class ChildTable {
  @id({name: TABLE_CHILD_FIELD_ID_NAME, dbtype: 'INTEGER NOT NULL'}) public id?: number;

  @field({name: TABLE_CHILD_FIELD_NAME_NAME, dbtype: 'TEXT'}) public name?: string;

  @field({name: TABLE_CHILD_FIELD_FK_NAME, dbtype: 'INTEGER NOT NULL'})
  @fk(TABLE_CHILD_FK_CONSTRAINT_NAME, TABLE_PARENT_TABLE_NAME, TABLE_PARENT_FIELD_ID_NAME)
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

      let childTable = schema().getTable(TABLE_CHILD_TABLE_NAME);
      expect(childTable).toBeDefined();
      expect(childTable.name).toBe(TABLE_CHILD_TABLE_NAME);
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
      let childFKFieldRef = childFKField.getForeignKeyField(TABLE_CHILD_FK_CONSTRAINT_NAME);
      expect(childFKFieldRef.tableRef.tableName).toBe(TABLE_PARENT_TABLE_NAME);
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
      catalogItem.objName = unqualifiedIdentifierName(TABLE_PARENT_TABLE_NAME);
      try {
        await catalogDAO.select(catalogItem);
      } catch (e) {
        expect(e).toBeDefined();
      }

      catalogItem.objType = 'table';
      catalogItem.objName = unqualifiedIdentifierName(TABLE_CHILD_TABLE_NAME);
      try {
        await catalogDAO.select(catalogItem);
      } catch (e) {
        expect(e).toBeDefined();
      }

      catalogItem.objType = 'index';
      catalogItem.objName = unqualifiedIdentifierName(TABLE_CHILD_IDX_NAME);
      try {
        await catalogDAO.select(catalogItem);
      } catch (e) {
        expect(e).toBeDefined();
      }

      // create tables

      await schema().createTable(sqldb, TABLE_PARENT_TABLE_NAME);
      await schema().createTable(sqldb, TABLE_CHILD_TABLE_NAME);
      await schema().createIndex(sqldb, TABLE_CHILD_TABLE_NAME, TABLE_CHILD_IDX_NAME);

      // now the database objects should exist in the database catalog:
      catalogItem.objType = 'table';
      catalogItem.objName = unqualifiedIdentifierName(TABLE_PARENT_TABLE_NAME);
      catalogItem = await catalogDAO.select(catalogItem);

      catalogItem.objType = 'table';
      catalogItem.objName = unqualifiedIdentifierName(TABLE_CHILD_TABLE_NAME);
      catalogItem = await catalogDAO.select(catalogItem);

      catalogItem.objType = 'index';
      catalogItem.objName = unqualifiedIdentifierName(TABLE_CHILD_IDX_NAME);
      catalogItem = await catalogDAO.select(catalogItem);
      expect(catalogItem.tblName === unqualifiedIdentifierName(TABLE_CHILD_TABLE_NAME));

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

      // TODO: we do not have defined the property type
      expect(parentTable.getTableField(newField.name).propertyType).toBeUndefined();

      // TODO: validate if new column exist afterwards
      await schema().alterTableAddColumn(sqldb, TABLE_PARENT_TABLE_NAME, newField.name);

      await schema().dropIndex(sqldb, TABLE_CHILD_TABLE_NAME, TABLE_CHILD_IDX_NAME);
      catalogItem.objType = 'index';
      catalogItem.objName = unqualifiedIdentifierName(TABLE_CHILD_IDX_NAME);
      try {
        await catalogDAO.select(catalogItem);
        fail(`index should not exist`);
      } catch (e) {
        expect(e).toBeDefined();
      }

      await schema().dropTable(sqldb, TABLE_CHILD_TABLE_NAME);
      await schema().dropTable(sqldb, TABLE_PARENT_TABLE_NAME);

      // now database objects should not exist in the database catalog:

      catalogItem.objType = 'table';
      catalogItem.objName = unqualifiedIdentifierName(TABLE_PARENT_TABLE_NAME);
      try {
        await catalogDAO.select(catalogItem);
        fail(`table ${TABLE_CHILD_TABLE_NAME} should not exist`);
      } catch (e) {
        expect(e).toBeDefined();
      }

      catalogItem.objType = 'table';
      catalogItem.objName = unqualifiedIdentifierName(TABLE_CHILD_TABLE_NAME);
      try {
        await catalogDAO.select(catalogItem);
        fail(`table ${TABLE_CHILD_TABLE_NAME} should not exist`);
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
      catalogItem.objName = unqualifiedIdentifierName(TABLE_PARENT_TABLE_NAME);
      try {
        await catalogDAO.select(catalogItem);
      } catch (e) {
        expect(e).toBeDefined();
      }

      catalogItem.objType = 'table';
      catalogItem.objName = unqualifiedIdentifierName(TABLE_CHILD_TABLE_NAME);
      try {
        await catalogDAO.select(catalogItem);
      } catch (e) {
        expect(e).toBeDefined();
      }

      catalogItem.objType = 'index';
      catalogItem.objName = unqualifiedIdentifierName(TABLE_CHILD_IDX_NAME);
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
      await childDAO.createIndex(TABLE_CHILD_IDX_NAME);

      // now the database objects should exist in the database catalog:
      catalogItem.objType = 'table';
      catalogItem.objName = unqualifiedIdentifierName(TABLE_PARENT_TABLE_NAME);
      catalogItem = await catalogDAO.select(catalogItem);

      catalogItem.objType = 'table';
      catalogItem.objName = unqualifiedIdentifierName(TABLE_CHILD_TABLE_NAME);
      catalogItem = await catalogDAO.select(catalogItem);

      catalogItem.objType = 'index';
      catalogItem.objName = unqualifiedIdentifierName(TABLE_CHILD_IDX_NAME);
      catalogItem = await catalogDAO.select(catalogItem);
      expect(catalogItem.tblName === unqualifiedIdentifierName(TABLE_CHILD_TABLE_NAME));

      // alter table add a new column

      let parentTable = schema().getTable(TABLE_PARENT_TABLE_NAME);
      expect(parentTable).toBeDefined();

      let newProperty = 'dyndef2';
      let newField = new Field(newProperty);
      newField.name = 'TESTADDCOL2';
      newField.dbtype = 'INTEGER';
      parentTable.addPropertyField(newField);
      parentTable.addTableField(newField);

      expect(parentTable.hasPropertyField(newProperty)).toBeTruthy();
      expect(parentTable.hasTableField(newField.name)).toBeTruthy();

      // TODO: validate if new column exist afterwards
      await parentDAO.alterTableAddColumn(newField.name);

      await childDAO.dropIndex(TABLE_CHILD_IDX_NAME);
      catalogItem.objType = 'index';
      catalogItem.objName = unqualifiedIdentifierName(TABLE_CHILD_IDX_NAME);
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
      catalogItem.objName = unqualifiedIdentifierName(TABLE_PARENT_TABLE_NAME);
      try {
        await catalogDAO.select(catalogItem);
        fail(`table ${TABLE_PARENT_TABLE_NAME} should not exist`);
      } catch (e) {
        expect(e).toBeDefined();
      }

      catalogItem.objType = 'table';
      catalogItem.objName = unqualifiedIdentifierName(TABLE_CHILD_TABLE_NAME);
      try {
        await catalogDAO.select(catalogItem);
        fail(`table ${TABLE_CHILD_TABLE_NAME} should not exist`);
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
  it('get undefined property should throw', async (done) => {
    try {
      let parentTable = schema().getTable(TABLE_PARENT_TABLE_NAME);
      parentTable.getPropertyField('UNDEFFIELD');
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });

  // ---------------------------------------------

  @table({name: 'TESTTABLE'})
  class TestTable {
    @id({name: 'ID', dbtype: 'INTEGER NOT NULL'}) public id?: number;

    @field({name: 'NAME', dbtype: 'TEXT'}) public name?: string;

    @field({name: 'NAME2', dbtype: 'TEXT'}) public name2?: string;

    public constructor() {}
  }

  @table({name: 'TESTTABLE2'})
  class TestTable2 {
    @id({name: 'ID', dbtype: 'INTEGER NOT NULL'}) public id?: number;

    @field({name: 'NAME', dbtype: 'TEXT'}) public name?: string;

    @field({name: 'NAME2', dbtype: 'TEXT'}) public name2?: string;

    public constructor() {}
  }


  // ---------------------------------------------
  it('add property to multiple names should throw', async (done) => {
    let testTable = schema().getTable('TESTTABLE');
    let idField = testTable.getPropertyField('id');
    let nameField = testTable.getPropertyField('name');
    try {
      idField.propertyKey = nameField.propertyKey;
      testTable.addPropertyField(idField);
      fail('should have thrown');
    } catch (err) {
    }
    let idField2 = testTable.getPropertyField('id');
    let nameField2 = testTable.getPropertyField('name');
    expect(idField2).toBe(idField);
    expect(nameField2).toBe(nameField);
    done();
  });

  // ---------------------------------------------
  it('add property to same name should succeed', async (done) => {
    let testTable = schema().getTable('TESTTABLE');
    let nameField = testTable.getPropertyField('name');
    try {
      testTable.addPropertyField(nameField);
    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('get not defined field should throw', async (done) => {
    let testTable = schema().getTable('TESTTABLE');
    try {
      let nameField = testTable.getTableField('undef');
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });


  // ---------------------------------------------
  it('adding field without a name should throw', async (done) => {
    let testTable = schema().getTable('TESTTABLE');
    let nameField = testTable.getPropertyField('name');
    try {
      nameField.name = undefined as any as string;
      testTable.addTableField(nameField);
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });

  // ---------------------------------------------
  it('adding field to multiple properties should throw', async (done) => {
    let testTable = schema().getTable('TESTTABLE');
    let name2Field = testTable.getPropertyField('name2');
    try {
      name2Field.name = 'NAME';
      name2Field.propertyKey = 'nameX';
      testTable.addTableField(name2Field);
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });


  // ---------------------------------------------
  it('get create index statement for undefined index should throw', async (done) => {
    let testTable = schema().getTable('TESTTABLE');
    try {
      let nameField = testTable.getCreateIndexStatement('undef');
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });

  // ---------------------------------------------
  it('get drop index statement for undefined index should throw', async (done) => {
    let testTable = schema().getTable('TESTTABLE');
    try {
      let nameField = testTable.getDropIndexStatement('undef');
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });

  // ---------------------------------------------
  it('get dml statements for known table should succeed', async (done) => {
    let testTable = schema().getTable('TESTTABLE2');
    try {
      testTable.getUpdateSetStatement();
      testTable.getUpdateByIdStatement();
      testTable.getDeleteFromStatement();
      testTable.getDeleteByIdStatement();
      testTable.getSelectOneStatement();
      testTable.getSelectByIdStatement();
    } catch (err) {
      fail(err);
    }
    done();
  });


  // ---------------------------------------------
  @table({name: 'NOFIELDSTABLE'})
  class NoFieldsTable {
    id: number;
    name: string;
    public constructor() {
      this.id = 0;
      this.name = '';
    }
  }

  // ---------------------------------------------
  it('get dml statements for table without fields should throw', async (done) => {
    let noFieldsTable = schema().getTable('NOFIELDSTABLE');
    try {
      noFieldsTable.getUpdateSetStatement();
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
