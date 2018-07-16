// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class
import {SQL_MEMORY_DB_PRIVATE, table, id, field, index, fk, SqlDatabase, schema, qualifiyIdentifier} from '..';
import {BaseDAO} from '../BaseDAO';

const PREFIX = 'FK:';

const PARENT_TABLE_NAME = `${PREFIX} P T`;
const PARENT_TABLE_NAMEQ = qualifiyIdentifier(PARENT_TABLE_NAME);

const PARENT_COL_ID1 = 'parent id';
const PARENT_COL_ID2 = 'parent id2';
const PARENT_COL_REF = 'ref';

const CHILD_TABLE_NAME = `${PREFIX} CT`;
const CHILD_TABLE_NAMEQ = qualifiyIdentifier(CHILD_TABLE_NAME);

const CHILD_IDX_NAME = `${PREFIX} CI`;
const CHILD_IDX_NAMEQ = qualifiyIdentifier(CHILD_IDX_NAME);

const CHILD_FK_ID_NAME = 'FK PARENT ID';
const CHILD_FK_REF_NAME = 'FK PARENT REF';

@table({name: PARENT_TABLE_NAMEQ})
class Parent {
  @id({name: PARENT_COL_ID1, dbtype: 'INTEGER NOT NULL'})
  id1: number;

  @id({name: PARENT_COL_ID2, dbtype: 'INTEGER NOT NULL'})
  id2: number;

  @field({name: PARENT_COL_REF, dbtype: 'TEXT'})
  ref?: string;

  @field({name: 'parent info', dbtype: 'TEXT'})
  parentInfo?: string;

  constructor() {
    this.id1 = 0;
    this.id2 = 0;
  }
}

@table({name: CHILD_TABLE_NAMEQ, withoutRowId: true})
class Child {
  @id({name: 'child id', dbtype: 'INTEGER NOT NULL'})
  id: number;

  @field({name: 'child info', dbtype: 'TEXT'})
  childInfo?: string;

  @fk(CHILD_FK_ID_NAME, PARENT_TABLE_NAME, PARENT_COL_ID1)
  @field({name: 'child parent id1', dbtype: 'INTEGER'})
  @index(CHILD_IDX_NAMEQ)
  parentId1?: number;

  @fk(CHILD_FK_ID_NAME, PARENT_TABLE_NAME, PARENT_COL_ID2)
  @field({name: 'child parent id2', dbtype: 'INTEGER'})
  @index(CHILD_IDX_NAMEQ)
  parentId2?: number;

  @fk(CHILD_FK_REF_NAME, PARENT_TABLE_NAME, PARENT_COL_REF) @field({name: 'child parent ref', dbtype: 'TEXT'})
  ref?: string;

  constructor() {
    this.id = 0;
  }
}

// NOTES: it seems sqlite3 does not support schema names for the referenced tabled in foreign key definitions
//  e.g try to change 'PARENT_TABLE_NAME2' to 'PARENT_TABLE_NAME' in the @fk decorators above


async function createSchema(sqldb: SqlDatabase): Promise<void> {
  // create all the tables if they do not exist:
  await schema().createTable(sqldb, PARENT_TABLE_NAME);
  await schema().createTable(sqldb, CHILD_TABLE_NAME);
  await schema().createIndex(sqldb, CHILD_TABLE_NAME, CHILD_IDX_NAME);
}

async function dropSchema(sqldb: SqlDatabase): Promise<void> {
  // create all the tables if they do not exist:
  await schema().dropTable(sqldb, CHILD_TABLE_NAME);
  await schema().dropTable(sqldb, PARENT_TABLE_NAME);
}


// ---------------------------------------------

describe('test Foreign Keys', () => {
  let sqldb: SqlDatabase;
  let parentDAO: BaseDAO<Parent>;
  let childDAO: BaseDAO<Child>;

  // ---------------------------------------------
  beforeEach(async (done) => {
    try {
      sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE);

      await createSchema(sqldb);

      parentDAO = new BaseDAO(Parent, sqldb);
      childDAO = new BaseDAO(Child, sqldb);

    } catch (err) {
      fail(err);
    }
    done();
  });

  afterEach(async (done) => {
    try {
      await dropSchema(sqldb);
      parentDAO = undefined as any;
      childDAO = undefined as any;
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('expect selectAllOf for foreign key having multiple colums to work', async (done) => {
    let parent = new Parent();
    let child = new Child();
    try {
      parent.id1 = 1;
      parent.id2 = 1;
      parent.parentInfo = '1.1';
      await parentDAO.insert(parent);

      parent.id1 = 2;
      parent.id2 = 1;
      parent.parentInfo = '2.1';
      await parentDAO.insert(parent);

      parent.id1 = 2;
      parent.id2 = 2;
      parent.parentInfo = '2.2';
      await parentDAO.insert(parent);

      parent.id1 = 3;
      parent.id2 = 1;
      parent.parentInfo = '3.1';
      await parentDAO.insert(parent);

      child.id = 1;
      child.childInfo = '1 => null';
      await childDAO.insert(child);

      child.id = 2;
      child.parentId1 = 2;
      child.parentId2 = 1;
      child.childInfo = '2 => 2.1';
      await childDAO.insert(child);

      child.id = 3;
      child.parentId1 = 2;
      child.parentId2 = 2;
      child.childInfo = '3 => 2.2';
      await childDAO.insert(child);

      child.id = 4;
      child.parentId1 = 2;
      child.parentId2 = 1;
      child.childInfo = '4 => 2.1';
      await childDAO.insert(child);

      parent.id1 = 2;
      parent.id2 = 1;
      parent = await parentDAO.selectById(parent);

      let childs = await childDAO.selectAllOf(CHILD_FK_ID_NAME, Parent, parent);
      childs = childs.sort((a, b) => a.id - b.id);
      expect(childs.length).toBe(2);
      expect(childs[0].id).toBe(2);
      expect(childs[1].id).toBe(4);
    } catch (err) {
      fail(err);
    }
    done();
  });


});
