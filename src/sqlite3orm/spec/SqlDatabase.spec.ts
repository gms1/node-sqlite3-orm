// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class
import {SqlDatabase, SQL_MEMORY_DB_PRIVATE} from '../index';

// ---------------------------------------------

describe('test SqlDatabase', () => {
  let sqldb: SqlDatabase;

  // ---------------------------------------------
  beforeEach(async (done) => {
    try {
      sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE);
      await sqldb.exec('CREATE TABLE TEST (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, col VARCHAR(50))');
      await sqldb.run('INSERT INTO TEST (id, col) values (:a, :b)', {':a': 0, ':b': 'testvalue 0'});
    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('expect basic dmls to succeed', async (done) => {
    try {
      // insert id=1 should work
      let res = await sqldb.run('INSERT INTO TEST (id,col) values (1,\'testvalue 1/1\')');
      expect(res.lastID).toBe(1);
      let row = await sqldb.get('SELECT col FROM TEST WHERE id=:id', {':id': 1});
      expect(row.col).toBe('testvalue 1/1');

      // insert id=1 should fail
      try {
        await sqldb.run('INSERT INTO TEST (id,col) values (1,\'testvalue 1/2\')');
        fail();
      } catch (err) {
        // tslint:disable-next-line: restrict-plus-operands
        expect('' + err).toContain('UNIQUE constraint');
      }
    } catch (err) {
      fail(err);
    }
    // insert without id should work
    try {
      let res = await sqldb.run('INSERT INTO TEST (col) values (\'testvalue 2\')');
      expect(res.lastID).toBe(2);
    } catch (err) {
      fail(err);
    }

    // select without parameter should work
    try {
      let res = await sqldb.all('SELECT id, col FROM TEST order by id');
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
      let res = await sqldb.run('UPDATE TEST set col = ? WHERE id=?', ['testvalue 1/2', 1]);
      expect(res.changes).toBe(1);
      let row = await sqldb.get('SELECT col FROM TEST WHERE id=?', 1);
      expect(row.col).toBe('testvalue 1/2');
    } catch (err) {
      fail(err);
    }

    try {
      // prepared update should work
      let stmt = await sqldb.prepare('UPDATE TEST set col = $col WHERE ID=$id');
      let res = await stmt.run({$id: 1, $col: 'testvalue 1/3'});
      expect(res.changes).toBe(1);
      await stmt.finalize();
      let row = await sqldb.get('SELECT col FROM TEST WHERE id=?', 1);
      expect(row.col).toBe('testvalue 1/3');
    } catch (err) {
      fail(err);
    }

    try {
      let res2: any[] = [];
      // select using parameter should work
      let count = await sqldb.each('SELECT id, col FROM TEST WHERE id >= ? order by id', [0], (err, row) => {
        if (err) {
          err.message = 'error row: ' + err.message;
          fail(err);
        } else {
          res2.push(row);
        }
      });
      expect(count).toBeGreaterThan(1);
      expect(res2[0].id).toBe(0);
      expect(res2[0].col).toBe('testvalue 0');
      expect(res2[1].id).toBe(1);
      expect(res2[1].col).toBe('testvalue 1/3');

    } catch (err) {
      fail(err);
    }
    done();
  });


  // ---------------------------------------------
  it('expect transaction to commit on end', async (done) => {
    try {
      let oldver = await sqldb.getUserVersion();

      await sqldb.transactionalize(async () => {
        await sqldb.setUserVersion(oldver + 3);
      });

      let newver = await sqldb.getUserVersion();
      expect(oldver + 3).toBe(newver);
    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('expect transaction to rollback on error', async (done) => {
    try {
      let oldver = await sqldb.getUserVersion();

      try {
        await sqldb.transactionalize(async () => {
          await sqldb.setUserVersion(oldver + 3);
          throw new Error('do not commit');
        });
        fail('unexpected');
      } catch (err2) {
        let newver = await sqldb.getUserVersion();
        expect(oldver).toBe(newver);
      }
    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('expect getting and setting PRAGMA user_version to succeed', async (done) => {
    try {
      let oldver = await sqldb.getUserVersion();
      expect(oldver).toBe(0);
      await sqldb.setUserVersion(oldver + 3);
      let newver = await sqldb.getUserVersion();
      expect(newver).toBe(oldver + 3);
    } catch (err) {
      fail(err);
    }
    done();
  });
  // ---------------------------------------------
  it('expect closing database to succeed', async (done) => {
    try {
      await sqldb.close();
    } catch (err) {
      fail(err);
    }
    done();
  });
  // ---------------------------------------------
  it('expect closed database to throw on exec', async (done) => {
    try {
      await sqldb.close();
      await sqldb.exec('INSERT INTO TEST (col) values (\'testvalue 3\')');
      fail('closed database should throw on exec');
    } catch (err) {
    }
    done();
  });
  // ---------------------------------------------
  it('expect closed database to throw on prepare', async (done) => {
    try {
      await sqldb.close();
      await sqldb.prepare('INSERT INTO TEST (col) values (\'testvalue 3\')');
      fail('closed database should throw on prepare');
    } catch (err) {
    }
    done();
  });
  // ---------------------------------------------
  it('expect closed database to throw on run', async (done) => {
    try {
      await sqldb.close();
      await sqldb.run('INSERT INTO TEST (col) values (\'testvalue 3\')');
      fail('closed database should throw on run');
    } catch (err) {
    }
    done();
  });
  // ---------------------------------------------
  it('expect closed database to throw on get', async (done) => {
    try {
      await sqldb.close();
      await sqldb.get('SELECT col from TEST');
      fail('closed database should throw on get');
    } catch (err) {
    }
    done();
  });
  // ---------------------------------------------
  it('expect closed database to throw on all', async (done) => {
    try {
      await sqldb.close();
      await sqldb.all('SELECT col from TEST');
      fail('closed database should throw on all');
    } catch (err) {
    }
    done();
  });
  // ---------------------------------------------
  it('expect closed database to throw on each', async (done) => {
    try {
      await sqldb.close();
      await sqldb.each('SELECT col from TEST', () => {});
      fail('closed database should throw on each');
    } catch (err) {
    }
    done();
  });
  // ---------------------------------------------
  it('expect insert into not existing table should throw', async (done) => {
    try {
      SqlDatabase.verbose();
      await sqldb.exec('INSERT INTO NOTEXIST (col) values (\'testvalue 3\')');
      fail('insert into not existing table should throw');
    } catch (err) {
    }
    done();
  });

  // ---------------------------------------------
  // TODO:
  /*
  it('expect closing database to trigger close-event', async(done) => {
    try {
      let isOpen = true;
      sqldb.on('close', () => isOpen = false);
      await sqldb.close();
      expect(isOpen).toBeFalsy('close-event not fired');
    } catch (err) {
      fail(err);
    }
    done();
  });
  */



});
