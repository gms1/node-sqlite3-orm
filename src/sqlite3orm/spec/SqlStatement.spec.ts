// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class
import {SqlDatabase, SqlStatement, SQL_MEMORY_DB_PRIVATE} from '..';

// ---------------------------------------------

describe('test SqlStatement', () => {
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
  it('expect basic prepared dml to succeed', async (done) => {
    let selStmt: SqlStatement;
    let insStmt: SqlStatement;
    selStmt = await sqldb.prepare('SELECT col FROM TEST WHERE id=?');
    try {
      // prepare insert row
      insStmt = await sqldb.prepare('INSERT INTO TEST (id,col) values(?,?)');
      let row: any;
      // insert id=1 col='testvalue 1'
      let res = await insStmt.run([1, 'testvalue 1']);
      expect(res.changes).toBe(1);
      // select inserted row having id=1
      row = await selStmt.get(1);
      expect(row.col).toBe('testvalue 1');
      await selStmt.reset();
      // select another row having id=0
      row = await selStmt.get(0);
      expect(row.col).toBe('testvalue 0');
      // finalize statements
      await selStmt.finalize();
      await insStmt.finalize();
    } catch (err) {
      fail(err);
    }
    try {
      // statement is not prepared
      await selStmt.run();
      fail('\"run\" should failed on finalized statement');
    } catch (err) {
    }
    try {
      // statement is not prepared
      await selStmt.get();
      fail('\"get\" should failed on finalized statement');
    } catch (err) {
    }
    // prepare select where id>=?
    selStmt = await sqldb.prepare('SELECT id, col FROM TEST WHERE id>=? ORDER BY id');
    try {
      // select all rows having id>0
      let allRows = await selStmt.all(0);
      expect(allRows.length).toBe(2, 'result from prepared statement should have 2 rows');
      expect(allRows[0].id).toBe(0, 'result from prepared statement should have id=0 as first row');
      expect(allRows[0].col)
          .toBe('testvalue 0', 'result from prepared statement have col=\"testvalue 0\" in first row');
      expect(allRows[1].id).toBe(1, 'result from prepared statement should have id=1 as first row');
      expect(allRows[1].col)
          .toBe('testvalue 1', 'result from prepared statement have col=\"testvalue 1\" in first row');
    } catch (err) {
      fail(err);
    }
    try {
      // select all rows having id>0 using callback
      let allRows: any[] = [];
      await selStmt.each(0, (err: any, row: any) => allRows.push(row));
      expect(allRows.length).toBe(2, 'result from prepared statement should have 2 rows');
      expect(allRows[0].id).toBe(0, 'result from prepared statement should have id=0 as first row');
      expect(allRows[0].col)
          .toBe('testvalue 0', 'result from prepared statement have col=\"testvalue 0\" in first row');
      expect(allRows[1].id).toBe(1, 'result from prepared statement should have id=1 as first row');
      expect(allRows[1].col)
          .toBe('testvalue 1', 'result from prepared statement have col=\"testvalue 1\" in first row');
    } catch (err) {
      fail(err);
    }

    done();
  });

  // ---------------------------------------------


});
