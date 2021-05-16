/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseDAO, field, id, schema, SQL_MEMORY_DB_PRIVATE, SqlDatabase, table } from '../../..';

const DATATYPE_BOOLEAN_TABLE = 'DB:DATATYPE_BOOLEAN';

@table({ name: DATATYPE_BOOLEAN_TABLE })
class DataTypeBoolean {
  @id({ name: 'id', dbtype: 'INTEGER NOT NULL' })
  id!: number;

  @field({ name: 'my_bool_text', dbtype: 'TEXT' })
  myBool2Text?: boolean;

  @field({ name: 'my_bool_int', dbtype: 'INTEGER' })
  myBool2Int?: boolean;

  @field({ name: 'my_bool_real', dbtype: 'REAL' })
  myBool2Real?: boolean;
}

describe('test boolean type', () => {
  let sqldb: SqlDatabase;
  let dao: BaseDAO<DataTypeBoolean>;
  let model: DataTypeBoolean = new DataTypeBoolean();
  // ---------------------------------------------
  beforeEach(async () => {
    try {
      sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE);
      await schema().createTable(sqldb, DATATYPE_BOOLEAN_TABLE);
      dao = new BaseDAO<DataTypeBoolean>(DataTypeBoolean, sqldb);
      model.id = 1;
    } catch (err) {
      fail(err);
    }
  });

  it('expect writing boolean properties to the database to succeed', async () => {
    try {
      const sqlstmt = await sqldb.prepare(`SELECT
              id, my_bool_text, my_bool_int, my_bool_real
            FROM "${DATATYPE_BOOLEAN_TABLE}"
            WHERE id = :id`);

      let row: any;

      // all true
      ++model.id;
      model.myBool2Text = true;
      model.myBool2Int = true;
      model.myBool2Real = true;
      await dao.insert(model);
      row = await sqlstmt.get({ ':id': model.id });
      expect(row.id).toBe(model.id);
      expect(row.my_bool_text).toBe('1');
      expect(row.my_bool_int).toBe(1);
      expect(row.my_bool_real).toBe(1);

      // all false
      ++model.id;
      model.myBool2Text = false;
      model.myBool2Int = false;
      model.myBool2Real = false;
      await dao.insert(model);
      row = await sqlstmt.get({ ':id': model.id });
      expect(row.id).toBe(model.id);
      expect(row.my_bool_text).toBe('0');
      expect(row.my_bool_int).toBe(0);
      expect(row.my_bool_real).toBe(0);

      // all undefined
      const oldid = ++model.id;
      model = new DataTypeBoolean();
      model.id = oldid;
      await dao.insert(model);
      row = await sqlstmt.get({ ':id': model.id });
      expect(row.id).toBe(model.id);
      expect(row.my_bool_text).toBe(null);
      expect(row.my_bool_int).toBe(null);
      expect(row.my_bool_real).toBe(null);

      await sqlstmt.finalize();
    } catch (err) {
      fail(err);
    }
  });

  it('expect reading boolean properties from database to succeed', async () => {
    try {
      const sqlstmt = await sqldb.prepare(`INSERT INTO "${DATATYPE_BOOLEAN_TABLE}"
              (id, my_bool_text, my_bool_int, my_bool_real)
            values
              (:id, :my_bool_text, :my_bool_int, :my_bool_real)`);

      // all true
      ++model.id;
      await sqlstmt.run({
        ':id': model.id,
        ':my_bool_text': true,
        ':my_bool_int': true,
        ':my_bool_real': true,
      });
      model = await dao.select(model);
      expect(typeof model.myBool2Text).toBe('boolean');
      expect(typeof model.myBool2Int).toBe('boolean');
      expect(typeof model.myBool2Real).toBe('boolean');
      expect(model.myBool2Text).toBeTruthy();
      expect(model.myBool2Int).toBeTruthy();
      expect(model.myBool2Real).toBeTruthy();

      // all false
      ++model.id;
      await sqlstmt.run({
        ':id': model.id,
        ':my_bool_text': false,
        ':my_bool_int': false,
        ':my_bool_real': false,
      });
      model = await dao.select(model);
      expect(typeof model.myBool2Text).toBe('boolean');
      expect(typeof model.myBool2Int).toBe('boolean');
      expect(typeof model.myBool2Real).toBe('boolean');
      expect(model.myBool2Text).toBeFalsy();
      expect(model.myBool2Int).toBeFalsy();
      expect(model.myBool2Real).toBeFalsy();

      // all undefined
      ++model.id;
      await sqlstmt.run({
        ':id': model.id,
        ':my_bool_text': undefined,
        ':my_bool_int': undefined,
        ':my_bool_real': undefined,
      });
      model = await dao.select(model);
      expect(typeof model.myBool2Text).toBe('undefined');
      expect(typeof model.myBool2Int).toBe('undefined');
      expect(typeof model.myBool2Real).toBe('undefined');

      // all null
      ++model.id;
      await sqlstmt.run({
        ':id': model.id,
        ':my_bool_text': null,
        ':my_bool_int': null,
        ':my_bool_real': null,
      });
      model = await dao.select(model);
      expect(typeof model.myBool2Text).toBe('undefined');
      expect(typeof model.myBool2Int).toBe('undefined');
      expect(typeof model.myBool2Real).toBe('undefined');

      // myBool2Text is '0'
      ++model.id;
      await sqlstmt.run({
        ':id': model.id,
        ':my_bool_text': '0',
        ':my_bool_int': undefined,
        ':my_bool_real': undefined,
      });
      model = await dao.select(model);
      expect(typeof model.myBool2Text).toBe('boolean');
      expect(model.myBool2Text).toBeFalsy();

      // myBool2Text is '1'
      ++model.id;
      await sqlstmt.run({
        ':id': model.id,
        ':my_bool_text': '1',
        ':my_bool_int': undefined,
        ':my_bool_real': undefined,
      });
      model = await dao.select(model);
      expect(typeof model.myBool2Text).toBe('boolean');
      expect(model.myBool2Text).toBeTruthy();

      // myBool2Text is 'false'
      ++model.id;
      await sqlstmt.run({
        ':id': model.id,
        ':my_bool_text': 'false',
        ':my_bool_int': undefined,
        ':my_bool_real': undefined,
      });
      model = await dao.select(model);
      expect(typeof model.myBool2Text).toBe('boolean');
      expect(model.myBool2Text).toBeFalsy();

      // myBool2Text is 'true'
      ++model.id;
      await sqlstmt.run({
        ':id': model.id,
        ':my_bool_text': 'true',
        ':my_bool_int': undefined,
        ':my_bool_real': undefined,
      });
      model = await dao.select(model);
      expect(typeof model.myBool2Text).toBe('boolean');
      expect(model.myBool2Text).toBeTruthy();

      await sqlstmt.finalize();
    } catch (err) {
      fail(err);
    }
  });
});
