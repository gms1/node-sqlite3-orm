#  Getting Started

## Install Global Dependencies

The sample output provided here is from an installation on Windows 10 x64.

```bash
$ npm -g install gulp-cli
```

### Sample output

```bash
C:\Program Files\nodejs\gulp -> C:\Program Files\nodejs\node_modules\gulp-cli\bin\gulp.js
+ gulp-cli@1.4.0
added 139 packages in 20.699s
```

## Clone the Repo and Install Dependencies

```bash
$ git clone git@github.com:gms1/node-sqlite3-orm.git

$ cd node-sqlite3-orm

$ npm install
```

### Sample output

```bash
> sqlite3@3.1.13 install C:\ae\node-sqlite3-orm\node_modules\sqlite3
> node-pre-gyp install --fallback-to-build

[sqlite3] Success: "C:\ae\node-sqlite3-orm\node_modules\sqlite3\lib\binding\node-v57-win32-x64\node_sqlite3.node" is installed via remote
added 512 packages in 44.156s
```

## Build and Run All Tests

```bash
$ gulp test
```

### Sample output

```bash
[21:17:38] mode: development
[21:17:43] Using gulpfile C:\ae\node-sqlite3-orm\gulpfile.js
[21:17:43] Starting 'dist:packageJson'...
[21:17:43] Starting 'dist:copyFiles'...
[21:17:43] Starting 'ts:tsc'...
[21:17:43] Starting 'ts:lint'...
[21:17:44] Finished 'dist:packageJson' after 1.43 s
[21:17:44] Finished 'dist:copyFiles' after 1.52 s
[21:17:44] Starting 'dist:files'...
[21:17:44] Finished 'dist:files' after 51 μs
[21:17:48] Finished 'ts:lint' after 4.52 s
[21:17:48] Finished 'ts:tsc' after 5.05 s
[21:17:48] Starting 'build'...
[21:17:48] Finished 'build' after 6.16 μs
[21:17:48] Starting 'test'...
Jasmine started

  test BaseDAO
    √ expect basic functionality (insert/update/delete/selectOne/selectAll) to work
    √ expect foreign key select to work

  test boolean type
    √ expect writing boolean properties to the database to succeed
    √ expect reading boolean properties from database to succeed

  test Date type
    √ expect writing Date properties to the database to succeed
    √ expect reading Date properties from database to succeed

  test Json data
    √ expect reading/writing Json properties from/to the database to succeed

  test README sample
    √ expect README sample to succeed

  test schema
    √ expect meta-data to be defined
    √ expect create/drop/alter-table to work (using Schema)
    √ expect create/drop/alter-table to work (using BaseDAO)

  test SqlConnectionPool
    √ expect pool to be able to open a database

  test SqlDatabase
    √ expect insert without parameter to succeed
    √ expect insert without parameter to violate unique constraint
    √ expect insert without primary key to succeed
    √ expect update with parameter to succeed
    √ expect prepared update with parameter to succeed
    √ expect select without parameter to succeed
    √ expect select with parameter to succeed
    √ expect getting and setting PRAGMA user_version to succeed
    √ expect transaction to commit on end
    √ expect transaction to rollback on error

Executed 22 of 22 specs SUCCESS in 0.181 sec.
[21:17:49] Finished 'test' after 1.13 s
```

## Build

```bash
$ gulp build
```

### Sample output

```bash
[21:40:35] mode: development
[21:40:40] Using gulpfile C:\ae\node-sqlite3-orm\gulpfile.js
[21:40:40] Starting 'dist:packageJson'...
[21:40:40] Starting 'dist:copyFiles'...
[21:40:40] Starting 'ts:tsc'...
[21:40:40] Starting 'ts:lint'...
[21:40:41] Finished 'dist:packageJson' after 1.29 s
[21:40:41] Finished 'dist:copyFiles' after 1.46 s
[21:40:41] Starting 'dist:files'...
[21:40:41] Finished 'dist:files' after 54 μs
[21:40:44] Finished 'ts:lint' after 4.14 s
[21:40:44] Finished 'ts:tsc' after 4.6 s
[21:40:44] Starting 'build'...
[21:40:44] Finished 'build' after 7.88 μs
```

## Run a Single Test

```bash
$ ./node_modules/.bin/jasmine dist/spec/BaseDAO.spec.js
```

### Sample output

```bash
Started
..


2 specs, 0 failures
Finished in 0.02 seconds
```

## Generate Documentation

```bash
$ npm run typedoc
```

### Sample output

```bash
> sqlite3orm@0.0.18 typedoc C:\ae\node-sqlite3-orm
> typedoc --options typedoc.json --out docs/typedoc/sqlite3orm --exclude '**/*.spec.ts' src/


Using TypeScript 2.4.1 from C:\ae\node-sqlite3-orm\node_modules\typedoc\node_modules\typescript\lib


Documentation generated at C:\ae\node-sqlite3-orm\docs\typedoc\sqlite3orm
```

Try to make changes to the tests to get familar with the code.

---

Thank you for supporting this project!
