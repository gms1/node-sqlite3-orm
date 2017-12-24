import {BaseDAO} from '../BaseDAO';
import {field, fk, id, table} from '../decorators';
import {SQL_MEMORY_DB_PRIVATE, SqlDatabase} from '../SqlDatabase';


const USERS_TABLE = 'USERSTABLE';
const CONTACTS_TABLE = 'CONTACTSTABLE';

@table({name: USERS_TABLE})
class User {
  @id({name: 'user_id', dbtype: 'INTEGER NOT NULL'})
  userId: number;

  @field({name: 'user_loginname', dbtype: 'TEXT NOT NULL'})
  userLoginName: string;
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
}

// ---------------------------------------------

describe('test BaseDAO', () => {
  let sqldb: SqlDatabase;

  // ---------------------------------------------
  beforeAll(async(done) => {
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
  it('expect basic functionality (insert/update/delete/select/selectAll) to work', async(done) => {
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
  it('expect foreign key select to work', async(done) => {
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


});
