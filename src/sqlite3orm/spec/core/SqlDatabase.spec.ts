/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import {
  SQL_MEMORY_DB_PRIVATE,
  SQL_OPEN_DEFAULT,
  SQL_OPEN_READWRITE,
  SqlDatabase,
  SqlDatabaseSettings,
} from '../..';
import * as path from 'path';

const CIPHER_DB = path.resolve(__dirname, '../fixtures/cipher.db');
const CIPHER_COMPATIBILITY = 3;
const CIPHER_KEY = 'sqlite3orm';

// ---------------------------------------------

describe('test SqlDatabase', () => {
  let sqldb: SqlDatabase;

  // ---------------------------------------------
  beforeEach(async () => {
    try {
      sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE);
      await sqldb.exec(
        'CREATE TABLE TEST (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, col VARCHAR(50))',
      );
      await sqldb.run('INSERT INTO TEST (id, col) values (:a, :b)', {
        ':a': 0,
        ':b': 'testvalue 0',
      });
    } catch (err) {
      fail(err);
    }
  });

  afterEach(async () => {
    try {
      await sqldb.close();
    } catch (err) {
      fail(err);
    }
    (sqldb as any) = undefined;
  });

  // ---------------------------------------------
  it('expect basic dmls to succeed', async () => {
    try {
      // insert id=1 should work
      const res = await sqldb.run("INSERT INTO TEST (id,col) values (1,'testvalue 1/1')");
      expect(res.lastID).toBe(1);
      const row = await sqldb.get('SELECT col FROM TEST WHERE id=:id', { ':id': 1 });
      expect(row.col).toBe('testvalue 1/1');

      // insert id=1 should fail
      try {
        await sqldb.run("INSERT INTO TEST (id,col) values (1,'testvalue 1/2')");
        fail();
      } catch (err) {
        expect('' + err).toContain('UNIQUE constraint');
      }
    } catch (err) {
      fail(err);
    }
    // insert without id should work
    try {
      const res = await sqldb.run("INSERT INTO TEST (col) values ('testvalue 2')");
      expect(res.lastID).toBe(2);
    } catch (err) {
      fail(err);
    }

    // select without parameter should work
    try {
      const res = await sqldb.all('SELECT id, col FROM TEST order by id');
      expect(res.length).toBeGreaterThan(1);
      expect(res[0].id).toBe(0);
      expect(res[0].col).toBe('testvalue 0');
      expect(res[1].id).toBe(1);
      expect(res[1].col).toBe('testvalue 1/1');
      expect(res[2].id).toBe(2);
      expect(res[2].col).toBe('testvalue 2');
    } catch (err) {
      fail(err);
    }

    try {
      // update should work
      const res = await sqldb.run('UPDATE TEST set col = ? WHERE id=?', ['testvalue 1/2', 1]);
      expect(res.changes).toBe(1);
      const row = await sqldb.get('SELECT col FROM TEST WHERE id=?', 1);
      expect(row.col).toBe('testvalue 1/2');
    } catch (err) {
      fail(err);
    }

    try {
      // prepared update should work
      const stmt = await sqldb.prepare('UPDATE TEST set col = $col WHERE ID=$id');
      const res = await stmt.run({ $id: 1, $col: 'testvalue 1/3' });
      expect(res.changes).toBe(1);
      await stmt.finalize();
      const row = await sqldb.get('SELECT col FROM TEST WHERE id=?', 1);
      expect(row.col).toBe('testvalue 1/3');
    } catch (err) {
      fail(err);
    }

    try {
      const res2: any[] = [];
      // select using parameter should work
      const count = await sqldb.each(
        'SELECT id, col FROM TEST WHERE id >= ? order by id',
        [0],
        (err, row) => {
          if (err) {
            err.message = 'error row: ' + err.message;
            fail(err);
          } else {
            res2.push(row);
          }
        },
      );
      expect(count).toBeGreaterThan(1);
      expect(res2[0].id).toBe(0);
      expect(res2[0].col).toBe('testvalue 0');
      expect(res2[1].id).toBe(1);
      expect(res2[1].col).toBe('testvalue 1/3');
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('expect transaction to commit on end', async () => {
    try {
      const oldver = await sqldb.getUserVersion();

      await sqldb.transactionalize(async () => {
        await sqldb.setUserVersion(oldver + 3);
      });

      const newver = await sqldb.getUserVersion();
      expect(oldver + 3).toBe(newver);
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('expect transaction to rollback on error', async () => {
    try {
      const oldver = await sqldb.getUserVersion();

      try {
        await sqldb.transactionalize(async () => {
          await sqldb.setUserVersion(oldver + 3);
          throw new Error('do not commit');
        });
        fail('unexpected');
      } catch (err2) {
        const newver = await sqldb.getUserVersion();
        expect(oldver).toBe(newver);
      }
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('expect getting and setting PRAGMA user_version to succeed', async () => {
    try {
      const oldver = await sqldb.getUserVersion();
      expect(oldver).toBe(0);
      await sqldb.setUserVersion(oldver + 3);
      const newver = await sqldb.getUserVersion();
      expect(newver).toBe(oldver + 3);
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('expect getting PRAGMA cipher_version to succeed (can be undefined)', async () => {
    try {
      const version = await sqldb.getCipherVersion();
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('expect closing database to succeed', async () => {
    try {
      await sqldb.close();
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('expect endTransaction(true) to succeed if no transaction is open', async () => {
    try {
      await sqldb.endTransaction(true);
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('expect endTransaction(true) to succeed if transaction is open', async () => {
    try {
      await sqldb.beginTransaction();
      await sqldb.endTransaction(true);
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('expect endTransaction(false) to succeed if no transaction is open', async () => {
    try {
      await sqldb.endTransaction(true);
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('expect endTransaction(false) to succeed if transaction is open', async () => {
    try {
      await sqldb.beginTransaction();
      await sqldb.endTransaction(true);
    } catch (err) {
      fail(err);
    }
  });

  // ---------------------------------------------
  it('expect closed database to throw on exec', async () => {
    try {
      await sqldb.close();
      await sqldb.exec("INSERT INTO TEST (col) values ('testvalue 3')");
      fail('closed database should throw on exec');
    } catch (err) {}
  });
  // ---------------------------------------------
  it('expect closed database to throw on prepare', async () => {
    try {
      await sqldb.close();
      await sqldb.prepare("INSERT INTO TEST (col) values ('testvalue 3')");
      fail('closed database should throw on prepare');
    } catch (err) {}
  });
  // ---------------------------------------------
  it('expect closed database to throw on run', async () => {
    try {
      await sqldb.close();
      await sqldb.run("INSERT INTO TEST (col) values ('testvalue 3')");
      fail('closed database should throw on run');
    } catch (err) {}
  });
  // ---------------------------------------------
  it('expect closed database to throw on get', async () => {
    try {
      await sqldb.close();
      await sqldb.get('SELECT col from TEST');
      fail('closed database should throw on get');
    } catch (err) {}
  });
  // ---------------------------------------------
  it('expect closed database to throw on all', async () => {
    try {
      await sqldb.close();
      await sqldb.all('SELECT col from TEST');
      fail('closed database should throw on all');
    } catch (err) {}
  });
  // ---------------------------------------------
  it('expect closed database to throw on each', async () => {
    try {
      await sqldb.close();
      await sqldb.each('SELECT col from TEST', () => {});
      fail('closed database should throw on each');
    } catch (err) {}
  });

  // ---------------------------------------------
  it('expect closed database to throw on adding event listener', async () => {
    try {
      await sqldb.close();
      sqldb.on('error', () => {});
      fail('closed database should throw on adding event listener');
    } catch (err) {}
  });
  // ---------------------------------------------
  it('expect closed database to throw on endTransaction', async () => {
    try {
      await sqldb.close();
      await sqldb.endTransaction(true);
      fail('closed database should throw on exec');
    } catch (err) {}
  });
  // ---------------------------------------------
  it('expect insert into not existing table to throw', async () => {
    try {
      SqlDatabase.verbose();
      await sqldb.exec("INSERT INTO NOTEXIST (col) values ('testvalue 3')");
      fail('insert into not existing table should throw');
    } catch (err) {}
  });

  // ---------------------------------------------
  it('expect get from not existing table to throw', async () => {
    try {
      SqlDatabase.verbose();
      await sqldb.get('SELECT id from NOTEXIST');
      fail('get from not existing table should throw');
    } catch (err) {}
  });

  // ---------------------------------------------
  it('expect prepare from not existing table to throw', async () => {
    try {
      SqlDatabase.verbose();
      await sqldb.prepare('SELECT id from NOTEXIST');
      fail('prepare from not existing table should throw');
    } catch (err) {}
  });

  // ---------------------------------------------
  it('expect adding event listener to succeed on open database', async () => {
    let errors = 0;
    try {
      sqldb.on('error', () => errors++);
    } catch (err) {
      fail(err);
    }
  });
});

describe('test SqlDatabase Settings', () => {
  // ---------------------------------------------
  it('should be able to open a database using custom settings', async () => {
    try {
      const settings: SqlDatabaseSettings = {
        journalMode: 'WAL',
        busyTimeout: 300,
        synchronous: ['main.FULL'],
        caseSensitiveLike: 'TRUE',
        foreignKeys: 'TRUE',
        ignoreCheckConstraints: 'TRUE',
        queryOnly: 'TRUE',
        readUncommitted: 'TRUE',
        recursiveTriggers: 'TRUE',
        secureDelete: ['FAST', 'temp.TRUE'],
        executionMode: 'PARALLELIZE',
      };
      const sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE, SQL_OPEN_DEFAULT, settings);
      const userVersion = await sqldb.getUserVersion();
      expect(userVersion).toBeDefined();
    } catch (err) {
      fail(err);
    }
  });

  it('should fail to open wrong db file', async () => {
    try {
      const sqldb = new SqlDatabase();
      await sqldb.open('::/.', SQL_OPEN_READWRITE);
      fail(`should not succeed`);
    } catch (err) {}
  });

  it('should fail to open using wrong setting (schema having dot)', async () => {
    try {
      const settings: SqlDatabaseSettings = { synchronous: ['NOTEXIST.YYY.FULL'] };
      const sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE, SQL_OPEN_DEFAULT, settings);
      fail(`should not succeed`);
    } catch (err) {}
  });

  it('should fail to open using wrong setting (empty)', async () => {
    try {
      const settings: SqlDatabaseSettings = { synchronous: [''] };
      const sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE, SQL_OPEN_DEFAULT, settings);
      fail(`should not succeed`);
    } catch (err) {}
  });

  it('should fail to open using wrong setting (executionMode)', async () => {
    try {
      const settings: SqlDatabaseSettings = {
        journalMode: 'WAL',
        busyTimeout: 300,
        synchronous: ['main.FULL'],
        caseSensitiveLike: 'TRUE',
        foreignKeys: 'TRUE',
        ignoreCheckConstraints: 'TRUE',
        queryOnly: 'TRUE',
        readUncommitted: 'TRUE',
        recursiveTriggers: 'TRUE',
        secureDelete: ['FAST', 'temp.TRUE'],
        executionMode: 'NOTEXIST',
      };
      const sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE, SQL_OPEN_DEFAULT, settings);
      fail(`should not succeed`);
    } catch (err) {}
  });

  it('should succeed to open serialized', async () => {
    try {
      const settings: SqlDatabaseSettings = {
        executionMode: 'SERIALIZE',
      };
      const sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE, SQL_OPEN_DEFAULT, settings);
      const userVersion = await sqldb.getUserVersion();
      expect(userVersion).toBeDefined();
    } catch (err) {
      fail(err);
    }
  });
});

describe('test SqlDatabase when sqlcipher IS available', () => {
  let sqldb: SqlDatabase;
  let sqlcipherVersion: string | undefined;
  beforeEach(async () => {
    try {
      sqldb = new SqlDatabase();

      await sqldb.open(CIPHER_DB, SQL_OPEN_READWRITE, {
        cipherCompatibility: CIPHER_COMPATIBILITY,
        key: CIPHER_KEY,
      });
      sqlcipherVersion = await sqldb.getCipherVersion();
    } catch (err) {
      fail(err);
    }
  });
  it('should be able to read encrypted content', async () => {
    if (!sqlcipherVersion) {
      pending('sqlcipher IS NOT available');
      return;
    }
    try {
      const res = await sqldb.all('SELECT id, col FROM TEST order by id');
      expect(res.length).toBeTruthy();
      expect(res[0].id).toBe(1);
      expect(res[0].col).toBe('my encrypted test data');
    } catch (err) {
      fail(err);
    }
  });
});

describe('test SqlDatabase when sqlcipher IS NOT available', () => {
  let sqldb: SqlDatabase;
  let sqlcipherVersion: string | undefined;
  beforeEach(async () => {
    try {
      sqldb = new SqlDatabase();

      await sqldb.open(CIPHER_DB, SQL_OPEN_READWRITE, {
        cipherCompatibility: CIPHER_COMPATIBILITY,
        key: CIPHER_KEY,
      });
      sqlcipherVersion = await sqldb.getCipherVersion();
    } catch (err) {
      fail(err);
    }
  });

  it('', async () => {
    if (sqlcipherVersion) {
      pending(`sqlcipher IS available: version is '${sqlcipherVersion}'`);
      return;
    }
    try {
      await sqldb.all('SELECT id, col FROM TEST order by id');
      fail('should not be able to read the database content');
    } catch (err) {
      return;
    }
  });
});
