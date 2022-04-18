[![npm version](https://badge.fury.io/js/sqlite3orm.svg)](https://badge.fury.io/js/sqlite3orm)
[![Build Status](https://api.travis-ci.com/gms1/node-sqlite3-orm.svg?branch=master)](https://app.travis-ci.com/gms1/node-sqlite3-orm)
[![Coverage Status](https://codecov.io/gh/gms1/node-sqlite3-orm/branch/master/graph/badge.svg)](https://codecov.io/gh/gms1/node-sqlite3-orm)
[![DeepScan Grade](https://deepscan.io/api/projects/699/branches/1107/badge/grade.svg)](https://deepscan.io/dashboard/#view=project&pid=699&bid=1107)
[![Dependency Status](https://david-dm.org/gms1/node-sqlite3-orm.svg)](https://david-dm.org/gms1/node-sqlite3-orm)

![NPM](https://img.shields.io/npm/l/sqlite3orm)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

# node-sqlite3-orm

This module allows you to map your model, written in JavaScript or TypeScript, to a database schema using SQLite Version 3.
**node-sqlite3-orm** is designed to work with new JavaScript _Decorators_, _Promises_ and the _async/await_ feature.
It offers connection pool, automatic upgrades and online backups as well as typesafe database queries and refactoring, using a filter syntax designed to serialize safely without any SQL injection possibility

> NOTE: Your contribution is highly welcome! Feel free to pick-up a TODO-item or add yours.

If you are using **NestJs** please see [@HomeOfThings/nest-sqlite3](https://www.npmjs.com/package/@homeofthings/nestjs-sqlite3)

## Mapping Introduction

**node-sqlite3-orm** provides you with the ability to create the database schema for the mapped model and to store and retrieve the mapped data to and from the database,

```TypeScript
import {table, id, field, index, fk, FieldOpts, TableOpts} from 'sqlite3orm';

@table({name: 'USERS'})
class User {
  @id({name: 'user_id', dbtype: 'INTEGER NOT NULL'})
  userId!: number;

  @field({name: 'user_loginname', dbtype: 'TEXT NOT NULL'})
  userLoginName!: string;

  @field({name: 'user_json', dbtype: 'TEXT', isJson: true})
  userJsonData: any;

  @field({name: 'user_deleted'})
  deleted?: boolean;

}

@table({name: 'CONTACTS', autoIncrement: true})
class Contact {
  @id({name: 'contact_id', dbtype: 'INTEGER NOT NULL'})
  contactId!: number;

  @field({name: 'contact_email', dbtype: 'TEXT'})
  emailAddress?: string;

  @field({name: 'contact_mobile', dbtype: 'TEXT'})
  mobile?: string;

  @field({name: 'user_id', dbtype: 'INTEGER NOT NULL'})
  @fk('fk_user_contacts', 'USERS', 'user_id')
  @index('idx_contacts_user')
  userId!: number;
}
```

With **node-sqlite3-orm** you have full control over the names for tables, fields, indexes and foreign key constraints in the mapped database schema.

> NOTE: Properties without a _node-sqlite3-orm_ decorator will not be mapped to the database.

<!-- -->

> NOTE: you can use the 'temp' qualifier to create a temporary table. e.g `@table({name: 'temp.MYTEMPTABLE'`

<!-- -->

> NOTE: you can map the same table to different model classes, e.g for using a partial model class

## Database Connection

SqlDatabase is a thin promised-based wrapper around sqlite3.Database: [node-sqlite3](https://github.com/TryGhost/node-sqlite3)

```TypeScript
import {SqlDatabase} from 'sqlite3orm';

(async () => {
  let sqldb = new SqlDatabase();
  // await sqldb.open(':memory:'); // would open a memory database in private mode
  await sqldb.open('file:sqlite3orm?mode=memory&cache=shared') // opens a memory database in shared mode
})();
```

## Schema Creation

```TypeScript
import {schema} from 'sqlite3orm';

(async() => {
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
    await schema().alterTableAddColumn(
        sqldb, 'CONTACTS', 'contact_mobile');
  }
  await sqldb.setUserVersion(10);
})();
```

## Select/Insert/Update/Delete using DAOs

In order to read from or write to the database, you can use the `BaseDAO<Model>' class

```TypeScript

(async () => {

  let userDAO = new BaseDAO(User, sqldb);
  let contactDAO = new BaseDAO(Contact, sqldb);

  // insert a user:
  let user = new User();
  user.userId = 1;
  user.userLoginName = 'donald';
  user.userJsonData = { lastScores: [10, 42, 31]};
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

  // update a user partially:
  await userDAO.updatePartial({userId: userDonald.userId, deleted: true});

  // read all contacts (child) for a given user (parent):
  let contactsDonald1 = await contactDAO.selectAllOf('fk_user_contacts', User, userDonald);
  //   or
  let contactsDonald2 = await userDAO.selectAllChildsOf('fk_user_contacts', Contact, userDonald);

  // read all users:
  let allUsers = await userDAO.selectAll();

  // read all users having login-name starting with 'd':
  // (see section 'typesafe queries')
  let selectedUsers = await userDAO.selectAll({userLoginName: {isLike: 'd%'});

  // read all users having a contact:
  let allUsersHavingContacts = await userDAO.selectAll(
      'WHERE EXISTS(SELECT 1 FROM CONTACTS C WHERE C.user_id = T.user_id)');

  // read all contacts from 'duck.com':
  let allContactsFromDuckDotCom = await contactDAO.selectAll(
      'WHERE contact_email like $contact_email',
      {$contact_email: '%@duck.com'});

  // read user (parent) for a given contact (child)
  let userDonald1 = await userDAO.selectByChild('fk_user_contacts', Contact, contactsDonald1[0]);
  // or
  let userDonald2 = await contactDAO.selectParentOf('fk_user_contacts', User, contactsDonald2[0]);

})();

```

## Typesafe query syntax

### Filter

```TypeScript
interface Filter<ModelType> {
  select?: Columns<ModelType>;      // the columns which should be returned by the select
  where?: Where<ModelType>;         // the conditions for the WHERE-clause
  order?: OrderColumns<ModelType>;  // the columns to use for 'ORDER BY'-clause
  limit?: number;                   // the limit for the 'LIMIT'-clause
  offset?: number;                  // the offset for the 'LIMIT'-clause
  tableAlias?: string;              // a table alias to use for the query
}
```

#### select-object

Only columns mapped to properties that evaluate to true participate in the result set. Therefore, this select-object is only
useful for methods that return an array of partials and is otherwise ignored

```TypeScript
const filter = {
  select: {userId: true, userLoginName: true}
}
```

#### where-object

The where-object consists of predicates and may be grouped by (nested conditions: 'and', 'or', 'not')

A simple predicate is defined for a specific property of the model, the comparison operator and the value:

```TypeScript
{userLoginName: {eq: 'donald'}}   // transforms to: WHERE user_loginname = 'donald'
```

For the 'eq' operator a shorthand form exist:

```TypeScript
{userLoginName: 'donald'}         // transforms to: WHERE user_loginname = 'donald'
```

All the given values are not inserted directly into the SQL, but passed via parameters:
eg: 'WHERE user_loginname = :userLoginName'

We can define multiple predicates on one property as well as on multiple properties:

```TypeScript
{
  userLoginName: {gte: 'A', lt: 'B' },
  userJsonData: {isNotNull: true}
}   // transforms to: WHERE user_loginname >= 'A' AND user_loginname < 'B' AND user_json IS NOT NULL
```

All predicates are combined using logical 'AND' operator, so if we have the need for a logical 'OR' we would do something like that:

```TypeScript
{
  or: [{deleted: true}, {deleted: {isNull: true}}]
}   // transforms to: WHERE user_deleted = 1 OR user_deleted IS NULL
```

'and' and 'or' operators are expecing an array, the 'not' operator requires a single child-condition/predicates only

```TypeScript
{
  not: {
    or: [{deleted: true}, {deleted: {isNull: true}}]
  }
}   // transforms to: WHERE NOT ( user_deleted = 1 OR user_deleted IS NULL )
```

Furthermore, it is also possible to define parts of the query as sql expression, or replace the complete where-object with a sql where-clause:

```TypeScript
{
  and: [{deleted: true}, {sql: `
EXISTS (select 1 from CONTACTS C where C.user_id = T.user_id)
  `}]
}   // transforms to: WHERE NOT ( user_deleted = 1 OR user_deleted IS NULL )
```

> NOTE: If you want to use user input as part of the sql expression, it is highly recommendet to use host variables instead. The value for the host variables can be defined using an additional and optional 'params' object

#### additional filter properties and other things worth mentioning

`limit` and `offset` speak for themselves.
By defining the `tableAlias` property, the default alias 'T' for the main table (see above) can be overwritten

For all 'update*' and 'delete*' methods, only the where-object part is needed, not the complete filter definition:

```TypeScript
userDAO.deleteAll({deleted: true});
```

## Supported data types

All primitive JavaScript data types ('String', 'Number', 'Boolean') and properties of type 'Date' are supported.
Type safety is guaranteed, when reading properties of these types from the database (NULL values are treated as 'undefined').

**Date** properties can be mapped to either the 'TEXT' or to the 'INTEGER' storage class (defaults to 'INTEGER') and their values will be stored as UTC. Using 'INTEGER' converts to Unix-Time, so fractions of seconds are lost. This can be changed by using the field option 'dateInMilliSeconds' or by setting as default using `schema().dateInMilliSeconds = true`.

These are the corresponding defaults for a 'current timestamp':

default for 'TEXT':

```TypeScript
 dbtype: 'TEXT    DEFAULT(datetime(\'now\') || \'Z\')'
```

default for 'INTEGER' (in seconds):

```TypeScript
 dbtype: 'INTEGER DEFAULT(CAST(strftime(\'%s\',\'now\') as INT))' // unix epoch in seconds
```

**Boolean** properties can either be mapped to 'TEXT' or to 'INTEGER' (default). On storing a boolean value **false** will be converted to '0' and **true** will be converted to '1', on reading '0' or 'false' will be converted to **false** and '1' or 'true' will be converted to **true**. All other values will result in **undefined**

Other data types can be serialized to a database field of type TEXT in JSON format, by setting the option 'isJson' to **true** (see sample above).

additional you have the possibility to apply your own serialze/deserialize functions by setting the 'transform' option.

## Connection pool

> NOTE: For each database transaction, the involved database connection (SqlDatabase instance) should be used exclusively!

One possibility to achieve this could be to use a connection pool and to perform all database transactions with their own database connection.

> NOTE: instances of BaseDAO are lightweight objects and can be created on the fly and exclusively for one database transaction

```TypeScript

(async () => {
  let pool = new SqlConnectionPool();

  // open the database connection pool with 1 to 2 database connections:
  await pool.open('/path/to/mydata.db', SQL_OPEN_DEFAULT, 1, 2);

  let con1 = await pool.get();
  let con2 = await pool.get();
  await Promise.all([doSomeThing(con1), doAnotherThing(con2)]);

  // free all connections to the pool:
  con1.close();
  pool.release(con2);

})();

```

## Autoupgrade

automatically create or upgrade tables and indexes in the database based on your table definitions

```TypeScript
const autoUpgrader = new AutoUpgrader(sqldb);

// run autoupgrade for all registered tables:
autoUpgrader.upgradeAllTables();

// test if table definitions are up-to-date
autoUpgrader.isActual([userDAO.table, contactDAO.table]);

// run autoupgrade for specific table(s):
autoUpgrader.upgradeTables([userDAO.table]);
```

> NOTE: _autoupgrade_ should be carefully tested before running it on a production database! A backup should be self-evident!

<!-- -->

> NOTE: renaming of columns can not be detected! _autoupgrade_ would normally add a new column with the new name and the data in the old column would be lost, but there is an option 'keepOldColumns' for preventing old columns from beeing dropped. Recycling the old column name for other purpose is asking for trouble

<!-- -->

> NOTE: changing autoIncrement cannot be detected! You can use the optional parameter _force_ to force a recreation

<!-- -->

> NOTE: if you have changed the column type, the table definition will be updated accordingly, but the content of the column will be still the same. You need an additional action if you want to convert the content of the column

<!-- -->

> NOTE: please always add a DEFAULT-clause for newly added columns which are not nullable

## explicit AUTOINCREMENT vs implicit AUTOINCREMENT

[SQLite Autoincrement](https://www.sqlite.org/autoinc.html)

Whenever you create a table without specifying either WITHOUT ROWID or AUTOINCREMENT, you get an implicit autoincrement column called ROWID.

Whenever you create a table without specifying WITHOUT ROWID and having a PRIMARY KEY column of type INTEGER, this column is an alias of the ROWID column, which is always a 64-bit signed integer.

On an INSERT, if the ROWID or INTEGER PRIMARY KEY column is not explicitly given a value, then it will be filled automatically with an unused integer, usually one more than the largest ROWID currently in use. This is true regardless of whether or not the AUTOINCREMENT keyword is used.

The AUTOINCREMENT keyword imposes extra CPU, memory, disk space, and disk I/O overhead and should be avoided if not strictly needed. It is usually not needed.

If the AUTOINCREMENT keyword appears after INTEGER PRIMARY KEY, that changes the automatic ROWID assignment algorithm to prevent the reuse of ROWIDs over the lifetime of the database. In other words, the purpose of AUTOINCREMENT is to prevent the reuse of ROWIDs from previously deleted rows.

### BaseDAO support for explicit and implicit AUTOINCREMENT

for historical reasons, when explicit AUTOINCREMENT is in use, the insert methods of the BaseDAO class by default prevents the insertion of predefined primary key values, so that the primary key column is always filled automatically with a generated ROWID. This is not the case, when implicit AUTOINCREMENT is in use.

This behavior can be overwritten globally using the static `BaseDAO.options` or using an optional parameter for the insert method:

#### BaseDAO insert modes

- StrictSqlite: use the provided value if defined, otherwise sqlite generates the value automatically
- ForceAutoGeneration: prevents the insertion of predefined primary key values; always let sqlite generate a value automatically


## Online Backup

quick start:

```Typescript
import {SqlDatabase} from 'sqlite3orm';

(async () => {
  const sqldb = new SqlDatabase();
  await sqldb.open('file:sqlite3orm?mode=memory&cache=shared') 
  ... add your tables

  const backup = await sqldb.backup('backup.db');
  await backup.step(-1);
  backup.finish();
})();
```

## Tracing

**sqlite3orm** is using the 'debug' module to provide tracing functionality
You can turn on the logging by setting the 'DEBUG' environment to "sqlite3orm:*"

## Install

```bash
npm install sqlite3orm
```

When using TypeScript, the compiler options `experimentalDecorators` and `emitDecoratorMetadata` must be enabled.

tsconfig.json:

```JSON
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    ...
  },
  ...
}
```

> NOTE: SQLite's SQLCipher extension is also supported, see [SQLCipher](./docs/sqlcipher)
<!-- -->
> NOTE: for custom builds and Electron, see [Custom builds and Electron](https://github.com/TryGhost/node-sqlite3#custom-builds-and-electron)

## RELEASE NOTES

[CHANGELOG](./CHANGELOG.md)

## LICENSE

**node-sqlite3-orm** is licensed under the MIT License: [LICENSE](./LICENSE)

## WIKI

further documentation can be found in our [Wiki](https://github.com/gms1/node-sqlite3-orm/wiki/)
