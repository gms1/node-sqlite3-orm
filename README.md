[![Build Status](https://api.travis-ci.org/gms1/node-sqlite3-orm.svg?branch=master)](https://travis-ci.org/gms1/node-sqlite3-orm)
[![npm version](https://badge.fury.io/js/sqlite3orm.svg)](https://badge.fury.io/js/sqlite3orm)

# node-sqlite3-orm
This module allows you to map your model, written in JavaScript or TypeScript, to a database schema using SQLite Version 3.
**node-sqlite3-orm** is designed to work with new JavaScript *Decorators*, *Promises* and the *async/await* feature.

> NOTE: Please keep in mind that this module is in early development state! ( transpiled using TypeScript 2.0 and targeting ES6, tested on node 6.3.1 )

> NOTE: Your contribution is highly welcome! Feel free to pick-up a TODO-item or add yours.

## Introduction

**node-sqlite3-orm** provides you with the ability to create the database schema for the mapped model and to store and retrieve the mapped data to and from the database,

```TypeScript
import {table, field, fk, id, TableOpts, FieldOpts} from 'sqlite3orm/decorators';

@table({name: 'USERS'})
class User {
  @id({name: 'user_id', dbtype:'INTEGER NOT NULL'})
  userId: number;

  @field({name: 'user_loginname', dbtype:'TEXT NOT NULL'})
  userLoginName: string;
}

@table({name: 'CONTACTS', autoIncrement: true})
class Contact {
  @id({name: 'contact_id', dbtype:'INTEGER NOT NULL'})
  contactId: number;
  
  @field({name: 'contact_email', dbtype:'TEXT'})
  emailAddress: string;

  @field({name: 'contact_mobile', dbtype:'TEXT'})
  mobile: string;

  @fk('contact_user', 'USERS', 'user_id')
  @field({name: 'user_id', dbtype:'INTEGER NOT NULL'})
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

(async () => {
  // get the user_version from the database:
  let userVersion = await sqldb.getUserVersion();

  // create all the tables if they do not exist:
  await schema().createTable(sqldb,'USERS');
  await schema().createTable(sqldb,'CONTACTS');

  if (userVersion >= 1 && userVersion < 10) {
    // the 'CONTACTS' table has been introduced in user_version 1 
    // a column 'contact_mobile' has been added to the 'CONTACTS' table in user_version 10
    await schema().alterTableAddColumn(sqldb, 'CONTACTS', 'contact_mobile');
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
  user = await userDAO.insert(user);

  // insert a contact:
  let contact = new Contact();
  contact.userId = 1;
  contact.emailAddress = 'donald@duck.com'
  contact = await contactDAO.insert(contact);

  // update a contact:
  contact.mobile = '+49 123 456';
  contact = await contactDAO.update(contact);

  // read a user:
  let userDonald = await userDAO.select(user);

  // read all contacts from user 'donald':
  let contactsDonald = await contactDAO.selectAllOf('contact_user', User, userDonald);

  // read all users:
  let allUsers = await userDAO.selectAll();

  // read all users having a contact:
  let allUsersHavingContacts = await
      userDAO.selectAll('WHERE EXISTS(select 1 from CONTACTS C where C.user_id = T.user_id)');

  // read all contacts from 'duck.com':
  let allContactsFromDuckDotCom = await
      contactDAO.selectAll('WHERE contact_email like :contact_email', {':contact_email': '%@duck.com'});

})();

```
## Supported data types using DAO:

Of course, all primitive JavaScript data types ('String', 'Number', 'Boolean') and properties of type 'Date' are supported. 
Type safety is guaranteed, when reading properties of these types from the database, however, NULL values will be treated as 'undefined'. 

> TODO: add support for user provided serialize/deserialize functions 

## Connection pool

> NOTE: For each database transaction, the involved database connection (SqlDatabase instance) should be used exclusively!

One possibility to achieve this could be to use a connection pool and to perform all database transactions with its own database connection.

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

sqlite3-orm-js is licensed under the MIT License:
[LICENSE](./LICENSE)

## Release Notes

| Release   | Notes                                                                                                                            |
|-----------|----------------------------------------------------------------------------------------------------------------------------------|
| 0.0.8     | SqlConnectionPool: allow connections to be garbage-collected if the connection pool is not limited by max-connections            |
| 0.0.7     | SqlConnectionPool: a new connection pool                                                                                         |
| 0.0.6     | BaseDAO: ensure type safety for mapped properties of primitive or Date type                                                      |


## Downloads

[![NPM](https://nodei.co/npm/sqlite3orm.png?downloads=true&downloadRank=true&stars=true)](https://github.com/gms1/node-sqlite3-orm)
