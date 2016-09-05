import {SQL_MEMORY_DB_PRIVATE, SqlDatabase} from '../SqlDatabase';
import {SqlStatement} from '../SqlStatement';

function rejectTest(err: Error): void {
  expect('' + err).toBeNull();
}

// ---------------------------------------------

describe('test SqlDatabase', () => {
  let sqldb: SqlDatabase;

  // ---------------------------------------------
  beforeAll(async(done) => {
    try {
      sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE);
      await sqldb.exec(
          'CREATE TABLE TEST (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, col VARCHAR(50))');
      await sqldb.run(
          'INSERT INTO TEST (id, col) values (:a, :b)',
          {':a': 0, ':b': 'testvalue 0'});
    } catch (err) {
      rejectTest(err);
    }
    done();
  });

  // ---------------------------------------------
  it('expect insert without parameter to succeed', async(done) => {
    try {
      let res = await sqldb.run(
          'INSERT INTO TEST (id,col) values (1,\'testvalue 1/1\')');
      expect(res.lastID).toBe(1);
      let row =
          await sqldb.get('SELECT col from TEST where id=:id', {':id': 1});
      expect(row.col).toBe('testvalue 1/1');
    } catch (err) {
      rejectTest(err);
    }
    done();
  });

  // ---------------------------------------------
  it('expect insert without parameter to violate unique constraint',
     async(done) => {
       try {
         let res = await sqldb.run(
             'INSERT INTO TEST (id,col) values (1,\'testvalue 1/1\')');
         fail();
       } catch (err) {
         expect('' + err).toContain('UNIQUE constraint');
       }
       done();
     });

  // ---------------------------------------------
  it('expect insert without primary key to succeed', async(done) => {
    try {
      let res =
          await sqldb.run('INSERT INTO TEST (col) values (\'testvalue 2\')');
      expect(res.lastID).toBe(2);
    } catch (err) {
      rejectTest(err);
    }
    done();
  });


  // ---------------------------------------------
  it('expect update with parameter to succeed', async(done) => {
    try {
      let res = await sqldb.run(
          'UPDATE TEST set col = ? WHERE id=?', ['testvalue 1/2', 1]);
      expect(res.changes).toBe(1);
      let row = await sqldb.get('SELECT col from TEST where id=?', 1);
      expect(row.col).toBe('testvalue 1/2');
    } catch (err) {
      rejectTest(err);
    }
    done();
  });

  // ---------------------------------------------
  it('expect prepared update with parameter to succeed', async(done) => {
    try {
      let stmt = await sqldb.prepare('UPDATE TEST set col = $col WHERE ID=$id');
      let res = await stmt.run({$id: 1, $col: 'testvalue 1/3'});
      expect(res.changes).toBe(1);
      await stmt.finalize();
      let row = await sqldb.get('SELECT col from TEST where id=?', 1);
      expect(row.col).toBe('testvalue 1/3');
    } catch (err) {
      rejectTest(err);
    }
    done();
  });
  // ---------------------------------------------
  it('expect select without parameter to succeed', async(done) => {
    try {
      let res = await sqldb.all('SELECT id, col from TEST order by id');
      expect(res.length).toBeGreaterThan(1);
      expect(res[0].id).toBe(0);
      expect(res[0].col).toBe('testvalue 0');
      expect(res[1].id).toBe(1);
      expect(res[1].col).toBe('testvalue 1/3');
    } catch (err) {
      rejectTest(err);
    }
    done();
  });


  // ---------------------------------------------
  it('expect select with parameter to succeed', async(done) => {
    try {
      let res: any[] = [];

      let count = await sqldb.each(
          'SELECT id, col from TEST where id >= ? order by id', [0],
          (err, row) => {
            if (err) {
              err.message = 'error row: ' + err.message;
              rejectTest(err);
            } else {
              res.push(row);
            }
          });
      expect(count).toBeGreaterThan(1);
      expect(res[0].id).toBe(0);
      expect(res[0].col).toBe('testvalue 0');
      expect(res[1].id).toBe(1);
      expect(res[1].col).toBe('testvalue 1/3');

    } catch (err) {
      rejectTest(err);
    }
    done();
  });

  it('expect getting and setting PRAGMA user_version to succeed',
     async(done) => {
       try {
         let oldver = await sqldb.getUserVersion();
         expect(oldver).toBe(0);
         await sqldb.setUserVersion(oldver + 3);
         let newver = await sqldb.getUserVersion();
         expect(newver).toBe(oldver + 3);
       } catch (err) {
         rejectTest(err);
       }
       done();
     });
});
