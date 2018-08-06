// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class
import {SqlDatabase, BaseDAO, SQL_MEMORY_DB_PRIVATE, field, fk, id, table, index} from '..';


const USERS_TABLE = 'BD:USERS TABLE';
const CONTACTS_TABLE = 'main.BD:CONTACTS TABLE';
const TEST_SET_PROP_TABLE = 'BD:TEST_SET_PROP_TABLE';
const TEST_INDEX_TABLE1 = 'main.BD:INDEX_TABLE';
const TEST_INDEX_TABLE2 = 'temp.BD:INDEX_TABLE';
const TEST_DB_DEFAULTS = 'BD:TEST_DB_DEFAULTS_TABLE';

@table({name: USERS_TABLE})
class User {
  @id({name: 'user_id', dbtype: 'INTEGER NOT NULL'})
  userId: number;

  @field({name: 'user_loginname', dbtype: 'TEXT NOT NULL'})
  userLoginName: string;

  constructor() {
    this.userId = 0;
    this.userLoginName = 'noname';
  }
}

@table({name: CONTACTS_TABLE, autoIncrement: true})
class Contact {
  static userConstraint: string = 'user';

  @id({name: 'contact_id', dbtype: 'INTEGER NOT NULL'})
  contactId: number;

  @field({name: 'contact_email', dbtype: 'TEXT'})
  emailAddress: string;

  @field({name: 'contact_mobile', dbtype: 'TEXT'})
  mobile: string;

  @fk(Contact.userConstraint, USERS_TABLE, 'user_id') @field({name: 'user_id', dbtype: 'INTEGER NOT NULL'})
  userId: number;

  constructor() {
    this.contactId = 0;
    this.emailAddress = 'noemail';
    this.mobile = 'nomobile';
    this.userId = 0;
  }
}

// ---------------------------------------------

describe('test BaseDAO', () => {
  let sqldb: SqlDatabase;

  // ---------------------------------------------
  beforeEach(async (done) => {
    try {
      sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE);

      let userDao: BaseDAO<User> = new BaseDAO(User, sqldb);
      let contactDao: BaseDAO<Contact> = new BaseDAO(Contact, sqldb);
      await userDao.createTable();
      await contactDao.createTable();
    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('expect basic functionality (insert/update/delete/select/selectAll) to work', async (done) => {
    try {
      let user1: User = new User();
      let user2: User = new User();
      let userDao: BaseDAO<User> = new BaseDAO(User, sqldb);
      user1.userId = 1;
      user1.userLoginName = 'login1/1';
      await userDao.insert(user1);
      user2.userId = user1.userId;
      user2.userLoginName = 'login1/2';
      await userDao.update(user2);

      await userDao.select(user1);
      expect(user1.userId).toBe(user2.userId, 'userId does not match after first update');
      expect(user1.userLoginName).toBe(user2.userLoginName, 'userLoginName does not match after first update');

      user1 = await userDao.selectById({userId: 1});
      expect(user1.userId).toBe(user2.userId, 'userId does not match using selectById');
      expect(user1.userLoginName).toBe(user2.userLoginName, 'userLoginName does not match using selectById');

      let allUsers1 = await userDao.selectAll();
      expect(allUsers1.length).toBe(1);
      user2 = allUsers1[0];
      expect(user1.userId).toBe(user2.userId, 'userId does not match after select all');
      expect(user1.userLoginName).toBe(user2.userLoginName, 'userLoginName does not match after select all');

      await userDao.delete(user1);
      let allUsers2 = await userDao.selectAll();
      expect(allUsers1.length).toBe(allUsers2.length + 1);
    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('expect foreign key select to work', async (done) => {
    try {
      let user: User = new User();
      let contact: Contact = new Contact();
      let userDao: BaseDAO<User> = new BaseDAO(User, sqldb);
      let contactDao: BaseDAO<Contact> = new BaseDAO(Contact, sqldb);

      user.userId = 1;
      user.userLoginName = 'login1';
      await userDao.insert(user);

      user.userId = 2;
      user.userLoginName = 'login2';
      await userDao.insert(user);

      user.userId = 3;
      user.userLoginName = 'login3';
      await userDao.insert(user);

      contact.userId = 1;
      contact.emailAddress = 'user1@test1.net';
      contact = await contactDao.insert(contact);
      expect(contact.contactId).toBe(1, 'autoIncrement id not updated');

      contact.userId = 1;
      contact.emailAddress = 'user1@test2.net';
      contact = await contactDao.insert(contact);
      expect(contact.contactId).toBe(2, 'autoIncrement id not updated');

      contact.userId = 2;
      contact.emailAddress = 'user2@test.net';
      contact = await contactDao.insert(contact);
      expect(contact.contactId).toBe(3, 'autoIncrement id not updated');

      user.userId = 1;
      let contactsUser1 = await contactDao.selectAllOf(Contact.userConstraint, User, user);
      expect(contactsUser1.length).toBe(2);

      user.userId = 2;
      let contactsUser2 = await contactDao.selectAllOf(Contact.userConstraint, User, user);
      expect(contactsUser2.length).toBe(1);

      user.userId = 3;
      let contactsUser3 = await contactDao.selectAllOf(Contact.userConstraint, User, user);
      expect(contactsUser3.length).toBe(0);

      user.userId = 1;
      let contactsUser1$1 = await contactDao.selectAllOf(
          Contact.userConstraint, User, user, ' AND contact_email=:contact_email',
          {':contact_email': 'user1@test2.net'});
      expect(contactsUser1$1.length).toBe(1);

    } catch (err) {
      fail(err);
    }
    done();

  });

  // ---------------------------------------------
  class NoTable {
    id: number;
    constructor() {
      this.id = 0;
    }
  }

  it('expect class without table-definition to throw', async (done) => {
    try {
      let noTableDao: BaseDAO<NoTable> = new BaseDAO(NoTable, sqldb);
      fail('instantiation BaseDAO for class without table-definition should have thrown');
    } catch (err) {
    }
    done();

  });

  // ---------------------------------------------
  it('expect inserting duplicate id to throw', async (done) => {
    let user1: User = new User();
    let userDao: BaseDAO<User> = new BaseDAO(User, sqldb);
    try {
      user1.userId = 1;
      user1.userLoginName = 'login1/1';
      await userDao.insert(user1);
    } catch (err) {
      fail(err);
    }
    try {
      user1.userId = 1;
      user1.userLoginName = 'login1/2';
      await userDao.insert(user1);
      fail('inserting duplicate id should have thrown');
    } catch (err) {
    }
    done();

  });

  // ---------------------------------------------
  it('expect updating using wrong id to throw', async (done) => {
    let user1: User = new User();
    let userDao: BaseDAO<User> = new BaseDAO(User, sqldb);
    try {
      user1.userId = undefined as any as number;
      user1.userLoginName = 'login1/2';
      await userDao.update(user1);
      fail('updating using wrong id should have thrown');
    } catch (err) {
    }
    done();

  });

  // ---------------------------------------------
  it('expect updating not null column with null to throw', async (done) => {
    let user1: User = new User();
    let userDao: BaseDAO<User> = new BaseDAO(User, sqldb);
    try {
      user1.userId = 1;
      user1.userLoginName = 'login1/1';
      await userDao.insert(user1);
    } catch (err) {
      fail(err);
    }
    try {
      user1.userId = 1;
      user1.userLoginName = undefined as any as string;
      await userDao.update(user1);
      fail('updating not null column with null should have thrown');
    } catch (err) {
    }
    done();

  });

  // ---------------------------------------------
  it('expect deleting using wrong id to throw', async (done) => {
    let user1: User = new User();
    let userDao: BaseDAO<User> = new BaseDAO(User, sqldb);
    try {
      user1.userId = undefined as any as number;
      user1.userLoginName = 'login1/2';
      await userDao.delete(user1);
      fail('deleting using wrong id should have thrown');
    } catch (err) {
    }
    done();

  });

  // ---------------------------------------------
  it('expect deleting by id using wrong id to throw', async (done) => {
    let user1: User = new User();
    let userDao: BaseDAO<User> = new BaseDAO(User, sqldb);
    try {
      user1.userId = undefined as any as number;
      user1.userLoginName = 'login1/2';
      await userDao.deleteById(user1);
      fail('deleting using wrong id should have thrown');
    } catch (err) {
    }
    done();

  });

  // ---------------------------------------------
  it('expect deleting by id to succeed', async (done) => {
    let user1: User = new User();
    let userDao: BaseDAO<User> = new BaseDAO(User, sqldb);
    try {
      user1.userId = 1;
      user1.userLoginName = 'login1/1';
      await userDao.insert(user1);
      await userDao.selectById({userId: 1});
      expect(user1.userId).toBe(1, 'userId does not match after insert');
      user1.userId = 1;
      await userDao.deleteById({userId: 1});
    } catch (err) {
      fail(err);
    }
    try {
      await userDao.selectById({userId: 1});
      fail('row should have been deleted');
    } catch (err) {
    }
    try {
      await userDao.selectAll('WHERE noColumn=9');
      fail('a condition using not existing column should have thrown');
    } catch (err) {
    }
    done();

  });

  // ---------------------------------------------
  it('expect selectAll to throw on failure', async (done) => {
    let user1: User = new User();
    let userDao: BaseDAO<User> = new BaseDAO(User, sqldb);
    try {
      await userDao.selectAll('WHERE noColumn=9');
      fail('a condition using not existing column should have thrown');
    } catch (err) {
    }
    done();

  });
  // ---------------------------------------------
  it('expect selectEach to throw on failure', async (done) => {
    let user1: User = new User();
    let userDao: BaseDAO<User> = new BaseDAO(User, sqldb);
    try {
      user1.userId = 1;
      await userDao.selectEach(() => {}, 'WHERE noColumn=9');
      fail('a condition using not existing column should have thrown');
    } catch (err) {
    }
    done();

  });

  // ---------------------------------------------
  it('expect selectEach to succeed', async (done) => {
    let user1: User = new User();
    let userDao: BaseDAO<User> = new BaseDAO(User, sqldb);
    try {
      user1.userId = 1;
      user1.userLoginName = 'login1/1';
      await userDao.insert(user1);
    } catch (err) {
      fail(err);
    }
    try {
      let user2: User = new User();
      await userDao.selectEach((err, usr) => user2 = usr, 'WHERE user_id=1');
      expect(user1.userId).toBe(user2.userId, 'userId does not match');
      expect(user1.userLoginName).toBe(user2.userLoginName, 'userLoginName does not match');
      await userDao.selectEach((err, usr) => user2 = usr);
    } catch (err) {
      fail(err);
    }
    done();

  });

  // ---------------------------------------------
  it('expect selectAllOf for undefined constraint to fail', async (done) => {
    let userDao: BaseDAO<User> = new BaseDAO(User, sqldb);
    let contact: Contact = new Contact();
    try {
      let usersContact1 = await userDao.selectAllOf('undefConstraint', Contact, contact);
      fail('selectAllOf for undefined constraint should have failed');
    } catch (err) {
    }
    done();

  });

  // ---------------------------------------------

  @table({name: TEST_SET_PROP_TABLE})
  class TestSetProperty {
    @id({name: 'id', dbtype: 'INTEGER NOT NULL'})
    id: number;

    @field({name: 'my_bool_text', dbtype: 'TEXT'})
    myBool2Text?: boolean;

    @field({name: 'my_number_text', dbtype: 'TEXT'})
    myNumber2Text?: number;

    @field({name: 'my_string_int', dbtype: 'INTEGER'})
    myString2Number?: string;

    @field({name: 'my_date_real', dbtype: 'REAL'})
    myDate2Number?: Date;

    constructor() {
      this.id = 0;
    }
  }



  // ---------------------------------------------
  it('expect setProperty to work if conversion is required', async (done) => {
    let testDao: BaseDAO<TestSetProperty> = new BaseDAO(TestSetProperty, sqldb);
    let testRow: TestSetProperty = new TestSetProperty();
    try {
      await testDao.createTable();
      await sqldb.exec(`
        INSERT INTO "${TEST_SET_PROP_TABLE}" (
          id,
          my_bool_text,
          my_number_text,
          my_string_int,
          my_date_real
        ) values (
          1,
          \"abc\",
          \"42\",
          24,
          3.14
        )
      `);
      testRow = await testDao.selectById({id: 1});
      expect(testRow.myBool2Text).toBeUndefined();
      expect(testRow.myNumber2Text).toBe(42);
      expect(testRow.myString2Number).toBe('24');
      expect(testRow.myDate2Number).toBeNaN();
    } catch (err) {
      fail(err);
    }
    done();

  });

  @table({name: TEST_INDEX_TABLE1, autoIncrement: true})
  class TestIndexTable1 {
    @id({name: 'id', dbtype: 'INTEGER NOT NULL'})
    id: number;

    @field({name: 'info', dbtype: 'TEXT'}) @index('index_table_idx')
    info?: string;

    @field({name: 'otherId', dbtype: 'INTEGER'})
    otherId?: number;

    constructor() {
      this.id = 0;
    }
  }

  @table({name: TEST_INDEX_TABLE2, autoIncrement: true})
  class TestIndexTable2 {
    @id({name: 'id', dbtype: 'INTEGER NOT NULL'})
    id: number;

    @field({name: 'info', dbtype: 'TEXT'}) @index('index_table_idx')
    info?: string;

    @field({name: 'otherId', dbtype: 'INTEGER'})
    otherId?: number;

    constructor() {
      this.id = 0;
    }
  }


  // ---------------------------------------------
  it('expect create tables/indexes to work for tables/indexes having same name but different schema ', async (done) => {
    const table1DAO: BaseDAO<TestIndexTable1> = new BaseDAO(TestIndexTable1, sqldb);
    const table2DAO: BaseDAO<TestIndexTable2> = new BaseDAO(TestIndexTable2, sqldb);
    try {
      await table1DAO.createTable();
      await table2DAO.createTable();

      await table1DAO.createIndex('index_table_idx');
      await table2DAO.createIndex('index_table_idx');

      await table1DAO.dropTable();
      await table2DAO.dropTable();
    } catch (err) {
      fail(err);
    }
    done();
  });


  @table({name: TEST_DB_DEFAULTS, autoIncrement: true})
  class TestDbDefaultsFull {
    @id({name: 'id', dbtype: 'INTEGER NOT NULL'})
    id: number;

    @field({name: 'my_bool', dbtype: 'TEXT DEFAULT 1'})
    myBool?: boolean;

    @field({name: 'my_integer', dbtype: 'INTEGER DEFAULT 42'})
    myInt?: number;

    @field({name: 'my_string', dbtype: 'TEXT DEFAULT \'sqlite3orm\''})
    myString?: string;

    @field({name: 'my_real', dbtype: 'REAL DEFAULT 3.1415692'})
    myReal?: number;

    constructor() {
      this.id = 0;
    }
  }

  @table({name: TEST_DB_DEFAULTS})
  class TestDbDefaultsMin {
    @id({name: 'id', dbtype: 'INTEGER NOT NULL'})
    id: number;

    constructor() {
      this.id = 0;
    }
  }

  // ---------------------------------------------
  it('expect default-clause to work: using additional model', async (done) => {
    const fullDao: BaseDAO<TestDbDefaultsFull> = new BaseDAO(TestDbDefaultsFull, sqldb);
    const minDao: BaseDAO<TestDbDefaultsMin> = new BaseDAO(TestDbDefaultsMin, sqldb);
    const writeRow: TestDbDefaultsMin = new TestDbDefaultsMin();
    try {
      await fullDao.createTable();

      const writtenRow = await minDao.insert(writeRow);
      let readRow = await fullDao.selectById({id: writtenRow.id});
      expect(readRow.myBool).toBeTruthy();
      expect(readRow.myInt).toBe(42);
      expect(readRow.myString).toBe('sqlite3orm');
      expect(readRow.myReal).toBe(3.1415692);

    } catch (err) {
      fail(err);
    }
    try {
      await fullDao.dropTable();
    } catch (err) {
      fail(err);
    }
    done();

  });

  // ---------------------------------------------
  it('expect update/delete-all to work', async (done) => {
    const fullDao: BaseDAO<TestDbDefaultsFull> = new BaseDAO(TestDbDefaultsFull, sqldb);
    const minDao: BaseDAO<TestDbDefaultsMin> = new BaseDAO(TestDbDefaultsMin, sqldb);
    const writeRow: TestDbDefaultsMin = new TestDbDefaultsMin();
    try {
      await fullDao.createTable();

      const writtenRow = await minDao.insert(writeRow);
      let readRow = await fullDao.selectById({id: writtenRow.id});
      expect(readRow.myBool).toBeTruthy();
      expect(readRow.myInt).toBe(42);

      const updateMyBool = fullDao.metaModel.getUpdateAllStatement(['myBool']);
      await sqldb.run(updateMyBool, {':myBool': false});

      readRow = await fullDao.selectById({id: writtenRow.id});
      expect(readRow.myBool).toBeFalsy();
      expect(readRow.myInt).toBe(42);

      const updateMyBoolAndMyInt = fullDao.metaModel.getUpdateAllStatement(['myBool', 'myInt', 'myBool']);
      await sqldb.run(updateMyBoolAndMyInt, {':myBool': true, ':myInt': 99});

      readRow = await fullDao.selectById({id: writtenRow.id});
      expect(readRow.myBool).toBeTruthy();
      expect(readRow.myInt).toBe(99);

      const writtenRow2 = await minDao.insert(readRow);

      readRow = await fullDao.selectById({id: writtenRow2.id});
      expect(readRow.myBool).toBeTruthy();
      expect(readRow.myInt).toBe(42);

      const deleteAll = fullDao.metaModel.getDeleteAllStatement();
      await sqldb.run(deleteAll + ' where my_integer=:myInt', {':myInt': 99});

      readRow = await fullDao.selectById({id: writtenRow2.id});
      expect(readRow.myBool).toBeTruthy();
      expect(readRow.myInt).toBe(42);

      try {
        readRow = await fullDao.selectById({id: writtenRow.id});
        fail(`record should not exist`);
      } catch (e) {
      }

    } catch (err) {
      fail(err);
    }
    try {
      await fullDao.dropTable();
    } catch (err) {
      fail(err);
    }
    done();

  });


  // ---------------------------------------------
  it('expect get update-all-statement for not existing property to fail', async (done) => {
    const fullDao: BaseDAO<TestDbDefaultsFull> = new BaseDAO(TestDbDefaultsFull, sqldb);
    try {
      const updateMyBool = fullDao.metaModel.getUpdateAllStatement(['myNotExistingProp']);
      fail(`should have failed`);
    } catch (err) {
    }
    done();
  });


});
