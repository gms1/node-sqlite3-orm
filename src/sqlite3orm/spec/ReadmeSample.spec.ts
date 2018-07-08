// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class
import {BaseDAO, table, id, field, index, fk, SqlDatabase, schema} from '../index';

// definition-part:

@table({name: 'USERS'})
class User {
  @id({name: 'user_id', dbtype: 'INTEGER NOT NULL'})
  userId: number;

  @field({name: 'user_loginname', dbtype: 'TEXT NOT NULL'})
  userLoginName: string;

  @field({name: 'user_json', dbtype: 'TEXT', isJson: true})
  userJsonData: any;

  constructor() {
    this.userId = 0;
    this.userLoginName = 'noname';
  }
}

@table({name: 'CONTACTS', autoIncrement: true})
class Contact {
  @id({name: 'contact_id', dbtype: 'INTEGER NOT NULL'})
  contactId: number;

  @field({name: 'contact_email', dbtype: 'TEXT'})
  emailAddress: string;

  @field({name: 'contact_mobile', dbtype: 'TEXT'})
  mobile: string;

  @field({name: 'user_id', dbtype: 'INTEGER NOT NULL'})
  @fk('fk_user_contacts', 'USERS', 'user_id')
  @index('idx_contacts_user')
  userId: number;

  constructor() {
    this.contactId = 0;
    this.emailAddress = 'noemail';
    this.mobile = 'nomobile';
    this.userId = 0;
  }
}


async function runSample(): Promise<void> {
  let sqldb = new SqlDatabase();
  await sqldb.open(':memory:');


  // Schema Creation
  await

      (async () => {
        // get the user_version from the database:
        let userVersion = await sqldb.getUserVersion();

        // create all the tables if they do not exist:
        await schema().createTable(sqldb, 'USERS');
        await schema().createTable(sqldb, 'CONTACTS');
        await schema().createIndex(sqldb, 'CONTACTS', 'idx_contacts_user');

        if (userVersion >= 1 && userVersion < 10) {
          // the 'CONTACTS' table has been introduced in user_version 1
          // a column 'contact_mobile' has been added to the 'CONTACTS'
          // table in user_version 10
          await schema().alterTableAddColumn(sqldb, 'CONTACTS', 'contact_mobile');
        }
        await sqldb.setUserVersion(10);

      })();

  // Read/Insert/Update/Delete using DAOs
  await

      (async () => {

        let userDAO = new BaseDAO(User, sqldb);
        let contactDAO = new BaseDAO(Contact, sqldb);

        // insert a user:
        let user = new User();
        user.userId = 1;
        user.userLoginName = 'donald';
        user.userJsonData = {lastScores: [10, 42, 31]};
        user = await userDAO.insert(user);

        // insert a contact:
        let contact = new Contact();
        contact.userId = 1;
        contact.emailAddress = 'donald@duck.com';
        contact = await contactDAO.insert(contact);

        // update a contact:
        contact.mobile = '+49 123 456';
        contact = await contactDAO.update(contact);

        // read a user:
        let userDonald = await userDAO.select(user);

        // read all contacts from user 'donald':
        let contactsDonald = await contactDAO.selectAllOf('fk_user_contacts', User, userDonald);

        // read all users:
        let allUsers = await userDAO.selectAll();

        // read all users having a contact:
        let allUsersHavingContacts =
            await userDAO.selectAll('WHERE EXISTS(SELECT 1 FROM CONTACTS C WHERE C.user_id = T.user_id)');

        // read all contacts from 'duck.com':
        let allContactsFromDuckDotCom =
            await contactDAO.selectAll('WHERE contact_email like $contact_email', {$contact_email: '%@duck.com'});

        expect(userDonald.userId).toBe(user.userId, 'wrong userDonald.userId');
        expect(userDonald.userLoginName).toBe(user.userLoginName, 'wrong userDonald.userLoginName');

        expect(userDonald.userJsonData.lastScores.length)
            .toBe(user.userJsonData.lastScores.length, 'wrong userDonald.userJsonData.lastScores.length');

        expect(contactsDonald.length).toBe(1, 'wrong contactsDonald.length');
        expect(contactsDonald[0].userId).toBe(contact.userId, 'wrong contactsDonald[0].userId');
        expect(contactsDonald[0].emailAddress).toBe(contact.emailAddress, 'wrong contactsDonald[0].emailAddress');
        expect(contactsDonald[0].mobile).toBe(contact.mobile, 'wrong contactsDonald[0].mobile');

        expect(allUsersHavingContacts.length).toBe(1, 'wrong allUsersHavingContacts.length');
        expect(allContactsFromDuckDotCom.length).toBe(1, 'wrong allContactsFromDuckDotCom.length');

      })();
}



describe('test README sample', () => {
  // ---------------------------------------------
  it('expect README sample to succeed', async (done) => {
    try {
      await runSample();
    } catch (err) {
      fail(err);
    }
    done();
  });
});
