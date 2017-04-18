import {SqlDatabase, SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT} from '../SqlDatabase';
import {SqlConnectionPool} from '../SqlConnectionPool';

describe('test SqlConnectionPool', () => {
  // ---------------------------------------------


  it('expect pool to be able to open a database', async(done) => {
    try {
      let pool = new SqlConnectionPool();
      await pool.open(SQL_MEMORY_DB_SHARED, SQL_OPEN_DEFAULT, 1, 2);

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

    } catch (err) {
      fail(err);
    }
    done();

  });


});
