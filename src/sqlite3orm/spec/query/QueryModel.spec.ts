// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class

import {BaseDAO, field, Filter, fk, id, QueryModel, SQL_MEMORY_DB_PRIVATE, SqlDatabase, table} from '../..';

const USERS_TABLE = 'QB:USERS TABLE';
const CONTACTS_TABLE = 'main.QB:CONTACTS TABLE';

@table({name: USERS_TABLE})
class User {
  @id({name: 'user_id', dbtype: 'INTEGER NOT NULL'}) userId: number;

  @field({name: 'user_loginname', dbtype: 'TEXT NOT NULL'}) userLoginName: string;

  @field({name: 'user_followers', dbtype: 'NUMBER NOT NULL'}) userFollowers: number;

  @field({name: 'user_likes1', dbtype: 'NUMBER'}) userLikes1?: number;

  @field({name: 'user_likes2', dbtype: 'NUMBER'}) userLikes2?: number;

  @field({name: 'user_flag1', dbtype: 'INTEGER'}) userFlag1?: boolean;

  @field({name: 'user_flag2', dbtype: 'TEXT'}) userFlag2?: boolean;

  @field({name: 'user_created', dbtype: 'INTEGER NOT NULL'}) userCreated: Date;

  @field({name: 'user_updated', dbtype: 'TEXT NOT NULL'}) userUpdated: Date;

  notMapped?: string;

  constructor() {
    this.userId = 0;
    this.userLoginName = 'noname';
    this.userFollowers = 0;
    this.userCreated = new Date();
    this.userUpdated = new Date();
  }
}

/*
@table({ name: CONTACTS_TABLE, autoIncrement: true })
class Contact {
  static userConstraint: string = 'user';

  @id({ name: 'contact_id', dbtype: 'INTEGER NOT NULL' })
  contactId: number;

  @field({ name: 'contact_email', dbtype: 'TEXT' })
  emailAddress: string;

  @field({ name: 'contact_mobile', dbtype: 'TEXT' })
  mobile: string;

  @fk(Contact.userConstraint, USERS_TABLE, 'user_id') @field({ name: 'user_id', dbtype: 'INTEGER NOT NULL' })
  userId: number;

  notMapped?: string;

  constructor() {
    this.contactId = 0;
    this.emailAddress = 'noemail';
    this.mobile = 'nomobile';
    this.userId = 0;
  }
}
*/


describe('test QueryModel', () => {
  let sqldb: SqlDatabase;

  beforeAll(async (done) => {
    sqldb = new SqlDatabase();
    await sqldb.open(SQL_MEMORY_DB_PRIVATE);

    let userDao: BaseDAO<User> = new BaseDAO(User, sqldb);
    // let contactDao: BaseDAO<Contact> = new BaseDAO(Contact, sqldb);
    await userDao.createTable();
    // await contactDao.createTable();
    const user = new User();

    user.userId = 1;
    user.userLoginName = 'Alfa';
    user.userFollowers = 6;
    user.userCreated = new Date('2018-01-01');
    user.userUpdated = new Date('2018-01-06');
    user.userLikes1 = 6;
    user.userLikes2 = undefined;
    user.userFlag1 = true;
    user.userFlag2 = false;
    await userDao.insert(user);

    user.userId = 2;
    user.userLoginName = 'Bravo';
    user.userFollowers = 5;
    user.userCreated = new Date('2018-01-02');
    user.userUpdated = new Date('2018-01-05');
    user.userLikes1 = 5;
    user.userLikes2 = undefined;
    user.userFlag1 = false;
    user.userFlag2 = true;
    await userDao.insert(user);

    user.userId = 3;
    user.userLoginName = 'Charlie';
    user.userFollowers = 4;
    user.userCreated = new Date('2018-01-03');
    user.userUpdated = new Date('2018-01-04');
    user.userLikes1 = 4;
    user.userLikes2 = undefined;
    user.userFlag1 = undefined;
    user.userFlag2 = undefined;
    await userDao.insert(user);

    user.userId = 4;
    user.userLoginName = 'Delta';
    user.userFollowers = 3;
    user.userCreated = new Date('2018-01-04');
    user.userUpdated = new Date('2018-01-03');
    user.userLikes1 = undefined;
    user.userLikes2 = 9;
    user.userFlag1 = undefined;
    user.userFlag2 = undefined;
    await userDao.insert(user);

    user.userId = 5;
    user.userLoginName = 'Echo';
    user.userFollowers = 2;
    user.userCreated = new Date('2018-01-05');
    user.userUpdated = new Date('2018-01-02');
    user.userLikes1 = 2;
    user.userLikes2 = undefined;
    user.userFlag1 = undefined;
    user.userFlag2 = undefined;
    await userDao.insert(user);

    user.userId = 6;
    user.userLoginName = 'Foxtrot';
    user.userFollowers = 1;
    user.userCreated = new Date('2018-01-06');
    user.userUpdated = new Date('2018-01-01');
    user.userLikes1 = 1;
    user.userLikes2 = undefined;
    user.userFlag1 = undefined;
    user.userFlag2 = undefined;
    await userDao.insert(user);

    done();
  });

  // ---------------------------------------------
  afterAll(async (done) => {
    try {
      let userDao: BaseDAO<User> = new BaseDAO(User, sqldb);
      // let contactDao: BaseDAO<Contact> = new BaseDAO(Contact, sqldb);
      // await contactDao.dropTable();
      await userDao.dropTable();
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('instantiate query-model for class having metadata', () => {
    try {
      const qbUser = new QueryModel(User);
      // const qbContact = new QueryModel(Contact);
    } catch (err) {
      fail(err);
    }
  });

  it('fail to intantiate query-model for class not having metadata', () => {
    try {
      class NoTable {}

      const qbNoTable = new QueryModel(NoTable);
      fail('should have thrown');
    } catch (err) {
    }
  });

  it('`eq` predicate to fail for property not mapped', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({notMapped: 'Charlie'});
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });

  it('`eq` string predicate (shorthand form)', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLoginName: 'Charlie'});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(3);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`eq` string predicate (normal form)', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLoginName: {eq: 'Bravo'}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(2);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`ne` string predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLoginName: {neq: 'Bravo'}});
      expect(res.length).toBe(5);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`gt` string predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLoginName: {gt: 'Echo'}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(6);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`gte` string predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLoginName: {gte: 'Foxtrot'}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(6);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`lt` string predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLoginName: {lt: 'Bravo'}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(1);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`lte` string predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLoginName: {lte: 'Alfa'}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(1);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`isBetween` string predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLoginName: {isBetween: ['Alfa', 'Bravo']}});
      expect(res.length).toBe(2);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`isNotBetween` string predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLoginName: {isNotBetween: ['Charlie', 'Z']}});
      expect(res.length).toBe(2);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`isIn` string predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLoginName: {isIn: ['Alfa']}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(1);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`isNotIn` string predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLoginName: {isNotIn: ['Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot']}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(1);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`isLike` string predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLoginName: {isLike: '%lf%'}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(1);
    } catch (err) {
      fail(err);
    }
    done();
  });


  it('`isNotLike` string predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLoginName: {isNotLike: '%lf%'}});
      expect(res.length).toBe(5);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`eq` number predicate (shorthand form)', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userFollowers: 4});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(3);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`eq` number predicate (normal form)', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userFollowers: {eq: 5}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(2);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`ne` number predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userFollowers: {neq: 5}});
      expect(res.length).toBe(5);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`gt` number predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userFollowers: {gt: 5}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(1);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`gte` number predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userFollowers: {gte: 6}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(1);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`lt` number predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userFollowers: {lt: 2}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(6);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`lte` number predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userFollowers: {lte: 1}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(6);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`isIn` number predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userFollowers: {isIn: [6]}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(1);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`isNotIn` number predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userFollowers: {isNotIn: [5, 4, 3, 2, 1]}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(1);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`eq` Date (INT) predicate (shorthand form)', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userCreated: new Date('2018-01-03')});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(3);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`eq` Date (INT) predicate (normal form)', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userCreated: {eq: new Date('2018-01-04')}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(4);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`isBetween` Date (INT) predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userCreated: {isBetween: [new Date('2018-01-03'), new Date('2018-01-04')]}});
      expect(res.length).toBe(2);
      expect(res[0].userId >= 3 || res[0].userId <= 4).toBeTruthy();
      expect(res[1].userId >= 3 || res[1].userId <= 4).toBeTruthy();
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`isNotBetween` Date (INT) predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res =
          await userDao.selectAll({userCreated: {isNotBetween: [new Date('2018-01-03'), new Date('2018-01-04')]}});
      expect(res.length).toBe(4);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`eq` Date (TEXT) predicate (shorthand form)', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userUpdated: new Date('2018-01-03')});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(4);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`eq` Date (TEXT) predicate (normal form)', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userUpdated: {eq: new Date('2018-01-04')}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(3);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`isBetween` Date (TEXT) predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userUpdated: {isBetween: [new Date('2018-01-03'), new Date('2018-01-04')]}});
      expect(res.length).toBe(2);
      expect(res[0].userId >= 3 || res[0].userId <= 4).toBeTruthy();
      expect(res[1].userId >= 3 || res[1].userId <= 4).toBeTruthy();
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`isNotBetween` Date (TEXT) predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res =
          await userDao.selectAll({userUpdated: {isNotBetween: [new Date('2018-01-03'), new Date('2018-01-04')]}});
      expect(res.length).toBe(4);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`eq` boolean (INT) predicate (shorthand form)', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userFlag1: true});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(1);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`neq` boolean (INT) predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userFlag1: {neq: true}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(2);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`eq` boolean (TEXT) predicate (shorthand form)', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userFlag2: true});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(2);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`neq` boolean (TEXT) predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userFlag2: {neq: true}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(1);
    } catch (err) {
      fail(err);
    }
    done();
  });



  it('`isNull` true predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLikes1: {isNull: true}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(4);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`isNotNull` true predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLikes2: {isNotNull: true}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(4);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`isNull` false predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLikes2: {isNull: false}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(4);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`isNotNull` false predicate', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLikes1: {isNotNull: false}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(4);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('`isIn` throwing', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({userLoginName: {isIn: []}});
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });

  it('empty model predicates', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({});
      expect(res.length).toBe(6);
    } catch (err) {
    }
    done();
  });

  it('empty where-clause as string', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll('   ');
      expect(res.length).toBe(6);
    } catch (err) {
    }
    done();
  });

  it('empty where-clause without WHERE-keyword', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll(' 1=1 ');
      expect(res.length).toBe(6);
    } catch (err) {
    }
    done();
  });

  it('where: `not` (`sql`)', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({not: {sql: 'user_followers != 5'}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(2);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('where: `not` (`ne`)', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({not: {userFollowers: {neq: 5}}});
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(2);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('where:`eq`-`or`-`eq` + orderBy', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({
        where: {
          or: [
            {userFollowers: 4},
            {userFollowers: {eq: 5}},
          ]
        },
        order: {userFollowers: true, notMapped: true /*should be ignored*/, userId: false}
      });
      expect(res.length).toBe(2);
      expect(res[0].userId).toBe(3);
      expect(res[1].userId).toBe(2);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('where:`eq`-`and`-`eq` + orderBy', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({
        select: {userLoginName: true},  // should be ignored
        where: {
          and: [
            {userFollowers: 4},
            {userLoginName: 'Charlie'},
          ]
        },
        order: {userFollowers: true}
      });
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(3);
      expect(res[0].userFollowers).toBe(4);
      expect(res[0].userLoginName).toBe('Charlie');
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('where:`not` (`eq`-`and`-(`or`)-`and`-not(`eq`))', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({
        where: {
          not: {
            and: [
              {userFollowers: 4},
              {or: []},
              {not: {userLoginName: 'Charlie'}},
            ]
          }
        },
        order: {} /* empty order */
      });
      expect(res.length).toBe(6);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('where:`not` (`eq`-`and`-`eq`) + orderBy + limit 1 offset undefined', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({
        where: {
          not: {
            and: [
              {userFollowers: 4},
              {userLoginName: 'Charlie'},
            ]
          }
        },
        order: {userFollowers: true},
        limit: 1
      });
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(6);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('where:`not` (`eq`-`and`-`eq`) + orderBy + limit 1 offset 1 + tableAlias', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectAll({
        where: {
          not: {
            and: [
              {userFollowers: 4},
              {userLoginName: 'Charlie'},
            ]
          }
        },
        order: {userFollowers: true},
        limit: 1,
        offset: 1,
        tableAlias: 'MYTABLE'
      });
      expect(res.length).toBe(1);
      expect(res[0].userId).toBe(5);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('selectPartialAll', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectPartialAll({
        select: {userLoginName: true, userLikes2: false, notMapped: true},
        where: {
          not: {
            and: [
              {userFollowers: 4},
              {or: []},
              {not: {userLoginName: 'Charlie'}},
            ]
          }
        },
        order: {} /* empty order */
      });
      expect(res.length).toBe(6);
      expect(res[0].userId).toBeUndefined();
      expect(res[0].userLoginName).toBeDefined();
    } catch (err) {
      fail(err);
    }
    done();
  });


  it('selectPartialAll empty select-list', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectPartialAll({
        select: {notMapped: false},
        where: {
          not: {
            and: [
              {userFollowers: 4},
              {or: []},
              {not: {userLoginName: 'Charlie'}},
            ]
          }
        },
        order: {} /* empty order */
      });
      expect(res.length).toBe(6);
      expect(res[0].userId).toBeDefined();
      expect(res[0].userLoginName).toBeDefined();
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('selectPartialAll select-list containing column not mapped', async (done) => {
    try {
      const userDao = new BaseDAO(User, sqldb);
      const res = await userDao.selectPartialAll({
        select: {notMapped: true},
        where: {
          not: {
            and: [
              {userFollowers: 4},
              {or: []},
              {not: {userLoginName: 'Charlie'}},
            ]
          }
        },
        order: {} /* empty order */
      });
      expect(res.length).toBe(6);
      expect(res[0].userId).toBeDefined();
      expect(res[0].userLoginName).toBeDefined();
    } catch (err) {
      fail(err);
    }
    done();
  });
});
