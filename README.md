[![Build Status](https://api.travis-ci.org/gms1/node-sqlite3-orm.svg?branch=master)](https://travis-ci.org/gms1/node-sqlite3-orm)
[![npm version](https://badge.fury.io/js/sqlite3orm.svg)](https://badge.fury.io/js/sqlite3orm)
[![DeepScan Grade](https://deepscan.io/api/projects/699/branches/1107/badge/grade.svg)](https://deepscan.io/dashboard/#view=project&pid=699&bid=1107)
[![Dependency Status](https://david-dm.org/gms1/node-sqlite3-orm.svg)](https://david-dm.org/gms1/node-sqlite3-orm)
[![devDependency Status](https://david-dm.org/gms1/node-sqlite3-orm/dev-status.svg)](https://david-dm.org/gms1/node-sqlite3-orm#info=devDependencies)
[![Known Vulnerabilities](https://snyk.io/test/github/gms1/node-sqlite3-orm/badge.svg)](https://snyk.io/test/github/gms1/node-sqlite3-orm)
[![Greenkeeper badge](https://badges.greenkeeper.io/gms1/node-sqlite3-orm.svg)](https://greenkeeper.io/)

# node-sqlite3-orm

This module allows you to map your model, written in JavaScript or TypeScript, to a database schema using SQLite Version 3.
**node-sqlite3-orm** is designed to work with new JavaScript *Decorators*, *Promises* and the *async/await* feature.

> NOTE: Your contribution is highly welcome! Feel free to pick-up a TODO-item or add yours.

## Introduction

**node-sqlite3-orm** provides you with the ability to create the database schema for the mapped model and to store and retrieve the mapped data to and from the database,

```TypeScript
import {table, id, field, index, fk, FieldOpts, TableOpts} from '../decorators';

@table({name: 'USERS'})
class User {
  @id({name: 'user_id', dbtype: 'INTEGER NOT NULL'})
  userId: number;

  @field({name: 'user_loginname', dbtype: 'TEXT NOT NULL'})
  userLoginName: string;

  @field({name: 'user_json', dbtype: 'TEXT', isJson: true})
  userJsonData: any;
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
}
```

With **node-sqlite3-orm** you have full control over the names for tables, fields and foreign key constraints in the mapped database schema.
Properties without a *node-sqlite3-orm* decorator will not be mapped to the database.

## Database Connection

```TypeScript
import {SqlDatabase} from 'sqlite3orm/SqlDatabase';

(async () => {
  let sqldb = new SqlDatabase();
  await sqldb.open(':memory:');
})();
```
SqlDatabase is a thin promised-based wrapper around sqlite3.Database: [node-sqlite3](https://github.com/mapbox/node-sqlite3) 

## Schema Creation

```TypeScript
import {schema} from 'sqlite3orm/Schema';

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

  // read all contacts from user 'donald':
  let contactsDonald =
      await contactDAO.selectAllOf('fk_user_contacts', User, userDonald);

  // read all users:
  let allUsers = await userDAO.selectAll();

  // read all users having a contact:
  let allUsersHavingContacts = await userDAO.selectAll(
      'WHERE EXISTS(SELECT 1 FROM CONTACTS C WHERE C.user_id = T.user_id)');

  // read all contacts from 'duck.com':
  let allContactsFromDuckDotCom = await contactDAO.selectAll(
      'WHERE contact_email like $contact_email',
      {$contact_email: '%@duck.com'});

})();

```
## Supported data types using DAO:

All primitive JavaScript data types ('String', 'Number', 'Boolean') and properties of type 'Date' are supported. 
Type safety is guaranteed, when reading properties of these types from the database (NULL values are treated as 'undefined'). 
Other data types can be serialized to a database field of type TEXT in JSON format, by setting the option 'isJson' to true (see sample above).

> TODO: add support for user provided serialize/deserialize functions 

## Connection pool

> NOTE: For each database transaction, the involved database connection (SqlDatabase instance) should be used exclusively!

One possibility to achieve this could be to use a connection pool and to perform all database transactions with their own database connection.

> NOTE: instances of BaseDAO are lightweight objects and can be created on the fly and exclusively for one database transaction

 
```TypeScript

(async () => {
  let pool = new SqlConnectionPool();

  // open the database connection pool with 1 to 2 database connections:
  //    do not use a private memory database for the connection pool :hint: 
  await pool.open(SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT, 1, 2);

  let con1 = await pool.get();
  let con2 = await pool.get();
  await Promise.all([doSomeThing(con1), doAnotherThing(con2)]);

  // free all connections to the pool:
  con1.close();
  pool.release(con2);

})();

```

## Install

```
$ npm install sqlite3orm
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


## License

**node-sqlite3-orm** is licensed under the MIT License:
[LICENSE](./LICENSE)

## Release Notes

| Release   | Notes                                                                                                                            |
|-----------|----------------------------------------------------------------------------------------------------------------------------------|
| 0.0.20-24 | maintenance releases
| 0.0.19    | BaseDAO: added selectById/deleteById methods for convenience
| 0.0.15-18 | maintenance releases
| 0.0.14    | new @index decorator and create/drop - index methods
| 0.0.13    | BaseDAO: added createTable/dropTable/alterTableAddColumn methods for convenience
| 0.0.10-12 | maintenance releases
| 0.0.9     | possibility to map properties of complex type to a database column and serialize/deserialize this properties in JSON format
| 0.0.8     | SqlConnectionPool: allow connections to be garbage-collected if the connection pool is not limited by max-connections
| 0.0.7     | SqlConnectionPool: a new connection pool
| 0.0.6     | BaseDAO: ensure type safety for mapped properties of primitive or Date type


## Downloads

[![NPM](https://nodei.co/npm/sqlite3orm.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/sqlite3orm)
