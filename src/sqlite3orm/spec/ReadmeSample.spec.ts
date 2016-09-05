import {BaseDAO} from '../BaseDAO';
import {field, FieldOpts, fk, id, table, TableOpts} from '../decorators';
import {schema} from '../Schema';
import {SqlDatabase} from '../SqlDatabase';


@table({name: 'USERS'})
class User {
  @id({name: 'user_id', dbtype: 'INTEGER NOT NULL'})
  userId: number;

  @field({name: 'user_loginname', dbtype: 'TEXT NOT NULL'})
  userLoginName: string;
}

@table({name: 'CONTACTS', autoIncrement: true})
class Contact {
  @id({name: 'contact_id', dbtype: 'INTEGER NOT NULL'})
  contactId: number;

  @field({name: 'contact_email', dbtype: 'TEXT'})
  emailAddress: string;

  @field({name: 'contact_mobile', dbtype: 'TEXT'})
  mobile: string;

  @fk('contact_user', 'USERS', 'user_id')
  @field({name: 'user_id', dbtype: 'INTEGER NOT NULL'})
  userId: number;
}


async function runSample():
    Promise<void> {
      let sqldb = new SqlDatabase();
      await sqldb.open(':memory:');


      // Schema Creation
      await

          (async() => {
            // get the user_version from the database:
            let userVersion = await sqldb.getUserVersion();

            // create all the tables if they do not exist:
            await schema().createTable(sqldb, 'USERS');
            await schema().createTable(sqldb, 'CONTACTS');

            if (userVersion >= 1 && userVersion < 10) {
              // the 'CONTACTS' table has been introduced in user_version 1
              // a column 'contact_mobile' has been added to the 'CONTACTS'
              // table in user_version 10
              await schema().alterTableAddColumn(
                  sqldb, 'CONTACTS', 'contact_mobile');
            }
            await sqldb.setUserVersion(10);

          })();

      // Read/Insert/Update/Delete using DAOs
      await

          (async() => {

            let userDAO = new BaseDAO(User, sqldb);
            let contactDAO = new BaseDAO(Contact, sqldb);

            // insert a user:
            let user = new User();
            user.userId = 1;
            user.userLoginName = 'donald';
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
            let contactsDonald =
                await contactDAO.selectAllOf('contact_user', User, userDonald);

            // read all users:
            let allUsers = await userDAO.selectAll();

            // read all users having a contact:
            let allUsersHavingContacts = await userDAO.selectAll(
                'WHERE EXISTS(select 1 from CONTACTS C where C.user_id = T.user_id)');

            // read all contacts from 'duck.com':
            let allContactsFromDuckDotCom = await contactDAO.selectAll(
                'WHERE contact_email like :contact_email',
                {':contact_email': '%@duck.com'});

            expect(userDonald.userId)
                .toBe(user.userId, 'wrong userDonald.userId');
            expect(userDonald.userLoginName)
                .toBe(user.userLoginName, 'wrong userDonald.userLoginName');

            expect(contactsDonald.length)
                .toBe(1, 'wrong contactsDonald.length');
            expect(contactsDonald[0].userId)
                .toBe(contact.userId, 'wrong contactsDonald[0].userId');
            expect(contactsDonald[0].emailAddress)
                .toBe(
                    contact.emailAddress,
                    'wrong contactsDonald[0].emailAddress');
            expect(contactsDonald[0].mobile)
                .toBe(contact.mobile, 'wrong contactsDonald[0].mobile');

            expect(allUsersHavingContacts.length)
                .toBe(1, 'wrong allUsersHavingContacts.length');
            expect(allContactsFromDuckDotCom.length)
                .toBe(1, 'wrong allContactsFromDuckDotCom.length');

          })();

    }



describe('test README sample', () => {
  // ---------------------------------------------
  it('expect README sample to succeed', (done) => {
    new Promise<void>(async(resolve, reject) => {
             try {
               await runSample();
               resolve();
             } catch (e) {
               reject(new Error('FAILED: ' + e.message));
             }
           })
        .then((res) => done())
        .catch((e) => {
          expect(e).toBeNull();
          done();
        });
  });
});

