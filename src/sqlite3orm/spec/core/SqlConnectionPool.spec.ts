// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class
// tslint:disable no-non-null-assertion

import {
  SQL_MEMORY_DB_SHARED,
  SQL_OPEN_DEFAULT,
  SQL_OPEN_READWRITE,
  SqlConnectionPool,
  SqlDatabase,
  SqlDatabaseSettings
} from '../../';

describe('test SqlConnectionPool', () => {
  // ---------------------------------------------

  it('expect pool to be able to open a database using default settings', async (done) => {
    try {
      let pool = new SqlConnectionPool('TESTPOOL');
      await pool.open(SQL_MEMORY_DB_SHARED);
      expect(pool.isOpen()).toBeTruthy();

      // getting first connection
      let sqldb1 = await pool.get(100);
      expect(sqldb1).toBeDefined();
      expect(sqldb1.isOpen()).toBeTruthy();

      await sqldb1.close();
      await pool.close();
      expect(pool.isOpen()).toBeFalsy();

    } catch (err) {
      fail(err);
    }
    done();

  });

  it('expect pool to be able to open a database using min < 1', async (done) => {
    try {
      let pool = new SqlConnectionPool();
      await pool.open(SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT, 0);
      expect(pool.isOpen()).toBeTruthy();

      // getting first connection
      let sqldb1 = await pool.get(100);
      expect(sqldb1).toBeDefined();
      expect(sqldb1.isOpen()).toBeTruthy();

      await sqldb1.close();
      await pool.close();
      expect(pool.isOpen()).toBeFalsy();

    } catch (err) {
      fail(err);
    }
    done();

  });


  it('expect pool to share a file-database', async (done) => {
    try {
      let pool = new SqlConnectionPool();
      const fileName = 'testsqlite3.db';
      await pool.open(fileName, SQL_OPEN_DEFAULT, 2, 2);
      expect(pool.isOpen()).toBeTruthy();
      expect(pool.poolSize).toBe(2);
      expect(pool.openSize).toBe(0);

      // getting first connection
      let sqldb1 = await pool.get(100);
      expect(sqldb1).toBeDefined();
      expect(sqldb1.isOpen()).toBeTruthy();

      // getting second connection
      let sqldb2 = await pool.get(100);
      expect(sqldb2).toBeDefined();
      expect(sqldb2.isOpen()).toBeTruthy();

      // getting third connect should fail
      let sqldb3: SqlDatabase|undefined;
      try {
        sqldb3 = await pool.get(100);
        fail('got 3 connection from pool with max 2 connections');
      } catch (ignore) {
      }
      expect(sqldb3).toBeUndefined();

      // first connection should work
      const ver0 = await sqldb1.getUserVersion();

      const ver1 = ver0 + 3;
      await sqldb1.setUserVersion(ver1);

      // second connection should work
      const ver2 = await sqldb2.getUserVersion();
      expect(ver2).toBe(ver1, 'got wrong user version from connection 2');

      // closing one connection
      await sqldb2.close();
      expect(sqldb2.isOpen()).toBeFalsy('closed connection 2 is open');

      // getting third connect should succeed
      sqldb3 = await pool.get(100);
      expect(sqldb3).toBeDefined();
      expect(sqldb3.isOpen()).toBeTruthy();
      expect(sqldb3 !== sqldb2).toBeTruthy('got same connection instance from pool');

      // third connection should work
      const ver3 = await sqldb3.getUserVersion();
      expect(ver3).toBe(ver1, 'got wrong user version from connection 3');

      await sqldb1.close();
      await sqldb2.close();
      await sqldb3.close();
      await pool.close();
      expect(pool.isOpen()).toBeFalsy();

      await pool.open(fileName, SQL_OPEN_DEFAULT, 2, 2);
      expect(pool.isOpen()).toBeTruthy();
      expect(pool.poolSize).toBe(2);
      expect(pool.openSize).toBe(0);

      sqldb1 = await pool.get(100);

      const ver4 = await sqldb1.getUserVersion();
      expect(ver4).toBe(ver3, 'user version after reopening pool to file db');

      await sqldb1.close();
      await pool.close();
      expect(pool.isOpen()).toBeFalsy();

    } catch (err) {
      fail(err);
    }
    done();

  });


  it('expect pool to share a memory-database', async (done) => {
    try {
      let pool = new SqlConnectionPool();
      await pool.open(SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT, 2, 2);
      expect(pool.isOpen()).toBeTruthy();
      expect(pool.poolSize).toBe(2);
      expect(pool.openSize).toBe(0);

      // getting first connection
      let sqldb1 = await pool.get(100);
      expect(sqldb1).toBeDefined();
      expect(sqldb1.isOpen()).toBeTruthy();

      // getting second connection
      let sqldb2 = await pool.get(100);
      expect(sqldb2).toBeDefined();
      expect(sqldb2.isOpen()).toBeTruthy();

      // getting third connect should fail
      let sqldb3: SqlDatabase|undefined;
      try {
        sqldb3 = await pool.get(100);
        fail('got 3 connection from pool with max 2 connections');
      } catch (ignore) {
      }
      expect(sqldb3).toBeUndefined();

      // first connection should work
      const ver0 = await sqldb1.getUserVersion();

      const ver1 = ver0 + 3;
      await sqldb1.setUserVersion(ver1);

      // second connection should work
      const ver2 = await sqldb2.getUserVersion();
      expect(ver2).toBe(ver1, 'got wrong user version from connection 2');

      // closing one connection
      await sqldb2.close();
      expect(sqldb2.isOpen()).toBeFalsy('closed connection 2 is open');

      // getting third connect should succeed
      sqldb3 = await pool.get(100);
      expect(sqldb3).toBeDefined();
      expect(sqldb3.isOpen()).toBeTruthy();
      expect(sqldb3 !== sqldb2).toBeTruthy('got same connection instance from pool');

      // third connection should work
      const ver3 = await sqldb3.getUserVersion();
      expect(ver3).toBe(ver1, 'got wrong user version from connection 3');

      await sqldb1.close();
      await sqldb2.close();
      await sqldb3.close();
      await pool.close();
      expect(pool.isOpen()).toBeFalsy();


      /*

      // sqlite3 URI format support is required to support shared memory db
      // otherwise the opened database is a persisted on the file system
      // see doc/build-node-sqlite3.md

      await pool.open(SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT, 2, 2);
      expect(pool.isOpen()).toBeTruthy();
      expect(pool.poolSize).toBe(2);
      expect(pool.openSize).toBe(0);

      sqldb1 = await pool.get(100);

      const ver4 = await sqldb1.getUserVersion();
      expect(ver4).toBe(ver0, 'user version after reopening pool connected to memory db');

      await sqldb1.close();
      await pool.close();
      expect(pool.isOpen()).toBeFalsy();
      */


    } catch (err) {
      fail(err);
    }
    done();

  });


  it('expect pool to be closed after failed attempt to open a database', async (done) => {
    try {
      let pool = new SqlConnectionPool();
      await pool.open('::/.', SQL_OPEN_READWRITE);
      expect(pool.isOpen()).toBeFalsy();
      expect(pool.poolSize).toBe(0);
      expect(pool.openSize).toBe(0);

      // getting first connection
      let sqldb1 = await pool.get(100);
      fail('got invalid connection');
    } catch (err) {
    }
    done();

  });


  it('expect getting connection after pool has closed to fail', async (done) => {
    let pool = new SqlConnectionPool();
    try {
      await pool.open(SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT, 0);
      expect(pool.isOpen()).toBeTruthy();

      await pool.close();
      expect(pool.isOpen()).toBeFalsy();
    } catch (err) {
      fail(err);
    }

    try {
      let sqldb1 = await pool.get(100);
      fail('should not get a connection');

    } catch (err) {
      done();
    }

  });

  it('expect opening pool multiple times (using same file and mode) to succeed', async (done) => {
    const pool = new SqlConnectionPool();
    try {
      await Promise.all([
        pool.open(SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT, 3),
        pool.open(SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT, 3),
        pool.open(SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT, 3),
      ]);
    } catch (err) {
      fail(err);
    }
    expect(pool.isOpen()).toBeTruthy();
    done();
  });


  it('expect opening pool multiple times (using different files) to fail', async (done) => {
    const pool = new SqlConnectionPool();
    try {
      await Promise.all([
        pool.open('test1.db', SQL_OPEN_DEFAULT, 3),
        pool.open('test2.db', SQL_OPEN_DEFAULT, 3),
        pool.open('test3.db', SQL_OPEN_DEFAULT, 3),
      ]);
    } catch (err) {
      fail(err);
    }
    // the last one wins ( same as running sequential )
    expect(pool.isOpen()).toBeTruthy();
    done();
  });


  it('getting connections from pool having max-limit should succeed', async (done) => {
    const pool = new SqlConnectionPool();
    let conn1: SqlDatabase|undefined;
    let conn2: SqlDatabase|undefined;
    try {
      await pool.open(SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT, 1, 1);
      expect(pool.isOpen()).toBeTruthy();
      conn1 = await pool.get(100);
    } catch (err) {
      fail(err);
    }

    try {
      conn2 = await pool.get(200);
      fail('getting second connection from pool having max==2 should have thrown');
    } catch (err) {
    }

    try {
      await Promise.all([
        pool.get(500).then((conn) => {
          conn2 = conn;
        }),
        conn1!.close()
      ]);
    } catch (err) {
      fail(err);
    }
    expect(conn2).toBeDefined();

    done();
  });

  it('getting connections from pool without max-limit should succeed', async (done) => {
    const pool = new SqlConnectionPool();
    try {
      await pool.open(SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT, 1);
    } catch (err) {
      fail(err);
    }
    expect(pool.isOpen()).toBeTruthy();

    try {
      const conn1 = await pool.get(100);
      const conn2 = await pool.get(100);
      const conn3 = await pool.get(100);
      await conn3.close();
      await conn2.close();
      await conn1.close();
    } catch (err) {
      fail(err);
    }
    done();
  });


  it('closing pool having connections open should succeed', async (done) => {
    const pool = new SqlConnectionPool();
    let conn1: SqlDatabase|undefined;
    let conn2: SqlDatabase|undefined;
    let conn3: SqlDatabase|undefined;
    try {
      await pool.open(SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT, 2, 3);
      expect(pool.isOpen()).toBeTruthy();
      expect(pool.poolSize).toBe(2);
      expect(pool.openSize).toBe(0);
      conn1 = await pool.get(100);
      expect(pool.poolSize).toBe(1);
      expect(pool.openSize).toBe(1);
      conn2 = await pool.get(100);
      expect(pool.poolSize).toBe(0);
      expect(pool.openSize).toBe(2);
      conn3 = await pool.get(1000);
      expect(pool.poolSize).toBe(0);
      expect(pool.openSize).toBe(3);
    } catch (err) {
      fail(err);
    }

    try {
      await conn1!.close();
      expect(pool.poolSize).toBe(1);
      expect(pool.openSize).toBe(2);
      await conn3!.close();
      expect(pool.poolSize).toBe(2);
      expect(pool.openSize).toBe(1);
      await pool.close();
    } catch (err) {
      fail(err);
    }

    expect(pool.isOpen()).toBeFalsy();
    expect(pool.poolSize).toBe(0);
    expect(pool.openSize).toBe(0);

    expect(conn1!.isOpen()).toBeFalsy();
    expect(conn2!.isOpen()).toBeFalsy();
    expect(conn3!.isOpen()).toBeFalsy();
    done();
  });


  it('connection should be closed by pool having min connections in pool', async (done) => {
    const pool = new SqlConnectionPool();
    let conn1: SqlDatabase|undefined;
    let conn2: SqlDatabase|undefined;
    let conn3: SqlDatabase|undefined;
    try {
      await pool.open(SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT, 2, 3);
      expect(pool.isOpen()).toBeTruthy();
      expect(pool.poolSize).toBe(2);
      expect(pool.openSize).toBe(0);
      conn1 = await pool.get(100);
      expect(pool.poolSize).toBe(1);
      expect(pool.openSize).toBe(1);
      conn2 = await pool.get(100);
      expect(pool.poolSize).toBe(0);
      expect(pool.openSize).toBe(2);
      conn3 = await pool.get(1000);
      expect(pool.poolSize).toBe(0);
      expect(pool.openSize).toBe(3);
    } catch (err) {
      fail(err);
    }

    try {
      await conn1!.close();
      expect(pool.poolSize).toBe(1);
      expect(pool.openSize).toBe(2);
      await conn2!.close();
      expect(pool.poolSize).toBe(2);
      expect(pool.openSize).toBe(1);
      await conn3!.close();
      expect(pool.poolSize).toBe(2);  // <= one connection closed (inPool.length >= min)
      expect(pool.openSize).toBe(0);
      await pool.close();
    } catch (err) {
      fail(err);
    }

    expect(pool.isOpen()).toBeFalsy();
    expect(pool.poolSize).toBe(0);
    expect(pool.openSize).toBe(0);

    expect(conn1!.isOpen()).toBeFalsy();
    expect(conn2!.isOpen()).toBeFalsy();
    expect(conn3!.isOpen()).toBeFalsy();
    done();
  });



});



describe('test SqlConnectionPool Settings', () => {
  // ---------------------------------------------
  it('should be able to open a database using custom settings', async (done) => {
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
        executionMode: 'PARALLELIZE'
      };
      let pool = new SqlConnectionPool();
      await pool.open(SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT, 2, 3, settings);
      expect(pool.isOpen()).toBeTruthy();
      let sqldb1 = await pool.get(100);
      expect(sqldb1).toBeDefined();
      expect(sqldb1.isOpen()).toBeTruthy();
      let sqldb2 = await pool.get();
      expect(sqldb2).toBeDefined();
      expect(sqldb2.isOpen()).toBeTruthy();

      const userVersion1 = await sqldb1.getUserVersion();
      const userVersion2 = await sqldb2.getUserVersion();
      expect(userVersion1).toBeDefined();
      expect(userVersion2).toBeDefined();

      await sqldb1.close();
      await sqldb2.close();

      expect(sqldb1.isOpen()).toBeFalsy();
      expect(sqldb2.isOpen()).toBeFalsy();

      expect(pool.isOpen()).toBeTruthy();
      sqldb1 = await pool.get(100);
      expect(sqldb1).toBeDefined();
      expect(sqldb1.isOpen()).toBeTruthy();

      const userVersion3 = await sqldb1.getUserVersion();
      expect(userVersion3).toBeDefined();
      await sqldb1.open(SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT, settings);
      const userVersion4 = await sqldb1.getUserVersion();
      expect(userVersion4).toBeDefined();

    } catch (err) {
      fail(err);
    }
    done();
  });
});
