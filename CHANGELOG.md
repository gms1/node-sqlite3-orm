# CHANGELOG

| Release   | Notes                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------- |
| 2.6.3     | upgrade node-sqlite3 5.0.3 [TryGhost](https://github.com/TryGhost/node-sqlite3)                                             |
| 2.6.2     | selectOne method                                                                                                            |
| 2.6.1     | BaseDao option 'ignoreNoChanges': if set to `true` resolve 'updatePartialAll' and 'deleteAll' with `0` if nothing changed   |
| 2.6.0     | [2.6.0 changes](#260-changes)                                                                                               |
| 2.5.5     | new feature: online backup support                                                                                          |
| 2.5.1-4   | maintenance releases                                                                                                        |
| 2.5.0     | [2.5.0 changes](#250-changes)                                                                                               |
| 2.4.18    | bug fix: query model: binding `false` values using shorthand form (#74)                                                     |
| 2.4.2-17  | maintenance releases                                                                                                        |
| 2.4.14    | improved support for sqlcipher: new database settings for 'key' and 'cipherCompatibility'                                   |
| 2.4.2-13  | maintenance releases                                                                                                        |
| 2.4.1     | autoupgrade detection for autoIncrement changes                                                                             |
| 2.4.0     | [2.4.0 changes](#240-changes)                                                                                               |
| 2.3.2     | customizable serialize/deserialize; support for date in milliseconds unix epoch                                             |
| 2.3.1     | descending index columns                                                                                                    |
| 2.3.0     | BaseDAO: added partial insert/update/update all, as well as delete all methods                                              |
| 2.2.0     | autoupgrade for automatically creating or upgrade tables and indexes in the database                                        |
| 2.1.0     | [2.1.0 changes](#210-changes)                                                                                               |
| 2.0.0     | [2.0.0 changes](#200-changes)                                                                                               |
| 1.0.1     | maintenance releases                                                                                                        |
| 1.0.0     | maintenance releases                                                                                                        |
| 0.0.20-24 | maintenance releases                                                                                                        |
| 0.0.19    | BaseDAO: added selectById/deleteById methods for convenience                                                                |
| 0.0.15-18 | maintenance releases                                                                                                        |
| 0.0.14    | new @index decorator and create/drop - index methods                                                                        |
| 0.0.13    | BaseDAO: added createTable/dropTable/alterTableAddColumn methods for convenience                                            |
| 0.0.10-12 | maintenance releases                                                                                                        |
| 0.0.9     | possibility to map properties of complex type to a database column and serialize/deserialize this properties in JSON format |
| 0.0.8     | SqlConnectionPool: allow connections to be garbage-collected if the connection pool is not limited by max-connections       |
| 0.0.7     | SqlConnectionPool: a new connection pool                                                                                    |
| 0.0.6     | BaseDAO: ensure type safety for mapped properties of primitive or Date type                                                 |

## 2.6.0 changes

### new features

- BaseDAO: new 'countAll' method
- BaseDAO: new 'exists' method
- [Online Backup](./README.md#online-backup) introduced in 2.5.2

## 2.5.0 changes

### new features

- BaseDAO: new `replace` methods for [REPLACE command](https://www.sqlite.org/lang_replace.html)
- BaseDAO: insert modes; see [insert modes](./README.md#basedao-insert-modes)

## 2.4.0 changes

### new features

- typesafe queries

### breaking changes

- MetaModel: get\*Statement() methods have been moved to the new QueryModel
- BaseDAO: protected members have been moved to the new QueryModel

## 2.1.0 changes

### new features

- DbCatalogDAO for reading schemas, tables, table-definitions, index-definitions and foreign key-definitions
- SqlDatabaseSettings for applying pragma settings on opening a connection to a database

## 2.0.0 changes

### new features

- support for mapping a table to multiple model classes
- support for schema qualified table and index names
- quoted identifiers
- optional parameter 'isUnique' for the 'index' decorator
- BaseDAO
  - selectAllChildsOf: same as calling selectAllOf from the child-DAO
  - selectByChild: select the parent of a child
  - selectParentOf: same as selectByChild from the child-DAO
- debugging utility: [see debug](https://www.npmjs.com/package/debug)

### breaking changes

- BaseDAO

      some protected member-functions have been changed (e.g setHostParam ) or removed (e.g setProperty ).

- reflect metadata key 'METADATA_TABLE_KEY'

      previously 'METADATA_TABLE_KEY' has been used to reference a Table class instance,
      now the 'METADATA_MODEL_KEY' references a MetaModel class instance which is mapped to a Table class instance

- Table/View

      all model (class and property) related things have been moved to the new MetaModel/MetaProperty classes
      the getters for the DML statements have been moved to MetaModel and deprecated getters have been removed
