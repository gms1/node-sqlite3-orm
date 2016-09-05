import {SQL_MEMORY_DB_PRIVATE, SqlDatabase} from '../SqlDatabase';
import {SqlStatement} from '../SqlStatement';

function rejectTest(err: Error): void {
  expect('' + err).toBeNull();
}

// ---------------------------------------------

describe('test SqlDatabase', () => {
  let sqldb: SqlDatabase;

  // ---------------------------------------------
  beforeAll((done) => {
    sqldb = new SqlDatabase();
    sqldb.open(SQL_MEMORY_DB_PRIVATE)
        .then((res) => {
          return sqldb.exec(
              'CREATE TABLE TEST (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, col VARCHAR(50))');
        })
        .then((res) => {
          return sqldb.run(
              'INSERT INTO TEST (id, col) values (:a, :b)', {':a': 0, ':b': 'testvalue 0'});
        })
        .then((res) => done())
        .catch((err) => {
          rejectTest(err);
          done();
        });
  });

  // ---------------------------------------------
  it('expect insert without parameter to succeed', (done) => {
    sqldb.run("INSERT INTO TEST (id,col) values (1,'testvalue 1/1')")
        .then((res) => {
          expect(res.lastID).toBe(1);
          return sqldb.get('SELECT col from TEST where id=:id', {':id': 1}); })
        .then((res) => {
          expect(res.col).toBe('testvalue 1/1');
          done();
        })
        .catch((err) => {
          rejectTest(err);
          done();
        });
  });

  // ---------------------------------------------
  it('expect insert without parameter to violate unique constraint', (done) => {
    sqldb.run("INSERT INTO TEST (id,col) values (1,'testvalue 1/1')")
        .then((res) => fail())
        .catch((err) => {
          expect('' + err).toContain('UNIQUE constraint');
          done();
        });
  });

  // ---------------------------------------------
  it('expect insert without primary key to succeed', (done) => {
    sqldb.run("INSERT INTO TEST (col) values ('testvalue 2')")
        .then((res) => {
          expect(res.lastID).toBe(2);
          done();
        })
        .catch((err) => {
          rejectTest(err);
          done();
        });
  });


  // ---------------------------------------------
  it('expect update with parameter to succeed', (done) => {
    sqldb.run('UPDATE TEST set col = ? WHERE id=?', ['testvalue 1/2', 1])
        .catch((err) => {
          rejectTest(err);
          done();
        })
        .then((res) => {
          expect(res.changes).toBe(1);
          return sqldb.get('SELECT col from TEST where id=?', 1);
        })
        .then((res) => {
          expect(res.col).toBe('testvalue 1/2');
          done();
        })
        .catch((err) => {
          rejectTest(err);
          done();
        });
  });

  // ---------------------------------------------
  it('expect prepared update with parameter to succeed', (done) => {
    let stmt: SqlStatement;
    sqldb.prepare('UPDATE TEST set col = $col WHERE ID=$id')
        .catch((err) => {
          rejectTest(err);
          done();
        })
        .then((res) => {
          stmt = res as SqlStatement;
          return stmt.run({$id: 1, $col: 'testvalue 1/3'});
        })
        .then((res) => {
          expect(res.changes).toBe(1);
          return stmt.finalize();
        })
        .catch((err) => {
          rejectTest(err);
          done();
        })
        .then((res) => {
          return sqldb.get('SELECT col from TEST where id=?', 1);
        })
        .then((res) => {
          expect(res.col).toBe('testvalue 1/3');
          done();
        })
        .catch((err) => {
          rejectTest(err);
          done();
        });

  });
  // ---------------------------------------------
  it('expect select without parameter to succeed', (done) => {
    sqldb.all('SELECT id, col from TEST order by id')
        .catch((err) => {
          rejectTest(err);
          done();
        })
        .then((res) => {
          expect(res.length).toBeGreaterThan(1);
          expect(res[0].id).toBe(0);
          expect(res[0].col).toBe('testvalue 0');
          expect(res[1].id).toBe(1);
          expect(res[1].col).toBe('testvalue 1/3');
          done();
        });
  });


  // ---------------------------------------------
  it('expect select with parameter to succeed', (done) => {
    let res: any[] = [];

    sqldb
        .each(
            'SELECT id, col from TEST where id >= ? order by id', [0],
            (err, row) => {
              if (err) {
                err.message = 'error row: ' + err.message;
                rejectTest(err);
              } else {
                res.push(row);
              }
            })
        .catch((err) => {
          err.message = 'error Promise: ' + err.message;
          rejectTest(err);
          done();
        })
        .then((count) => {
          expect(count).toBeGreaterThan(1);
          expect(res[0].id).toBe(0);
          expect(res[0].col).toBe('testvalue 0');
          expect(res[1].id).toBe(1);
          expect(res[1].col).toBe('testvalue 1/3');
          done();
        });
  });

  it('expect getting and setting PRAGMA user_version to succeed', (done) => {
    let oldver: number;
    let newver: number;
    (async() => { return await sqldb.getUserVersion(); })()
        .then((res) => {
          oldver = res;
          expect(oldver).toBe(0);
          return sqldb.setUserVersion(oldver + 3);
        })
        .then((res) => { return sqldb.getUserVersion(); })
        .then((res) => {
          newver = res;
          expect(newver).toBe(oldver + 3);
          done();
        })
        .catch((err) => {
          rejectTest(err);
          done();
        });
    done();
  });
});
