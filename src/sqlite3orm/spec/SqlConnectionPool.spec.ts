// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class
import {
  SqlConnectionPool,
  SqlDatabase,
  SQL_OPEN_DEFAULT,
  SQL_OPEN_READWRITE,
  SQL_MEMORY_DB_SHARED,
  SqlDatabaseSettings
} from '..';

describe('test SqlConnectionPool', () => {
  // ---------------------------------------------

  it('expect pool to be able to open a database using default settings', async (done) => {
    try {
      let pool = new SqlConnectionPool();
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


  it('expect pool to be able to open a database', async (done) => {
    try {
      let pool = new SqlConnectionPool();
      await pool.open('testsqlite3.db', SQL_OPEN_DEFAULT, 1, 2);
      expect(pool.isOpen()).toBeTruthy();

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
      let ver1 = await sqldb1.getUserVersion();

      ver1 += 3;
      await sqldb1.setUserVersion(ver1);

      // second connection should work
      let ver2 = await sqldb2.getUserVersion();
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
      let ver3 = await sqldb3.getUserVersion();
      expect(ver3).toBe(ver1, 'got wrong user version from connection 3');

      await pool.close();
      expect(pool.isOpen()).toBeFalsy();

    } catch (err) {
      fail(err);
    }
    done();

  });


  it('expect pool to be closed after failed attempt to open a database', async (done) => {
    try {
      let pool = new SqlConnectionPool();
      await pool.open('testsqlite4.db', SQL_OPEN_READWRITE);
      expect(pool.isOpen()).toBeFalsy();

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
