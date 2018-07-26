// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class
import {SqlDatabase, BaseDAO, SQL_MEMORY_DB_PRIVATE, schema, field, id, table} from '..';

const DATATYPE_BOOLEAN_TABLE = 'DB:DATATYPE_BOOLEAN';

@table({name: DATATYPE_BOOLEAN_TABLE})
class DataTypeBoolean {
  @id({name: 'id', dbtype: 'INTEGER NOT NULL'})
  id: number;

  @field({name: 'my_bool_text', dbtype: 'TEXT'})
  myBool2Text?: boolean;

  @field({name: 'my_bool_int', dbtype: 'INTEGER'})
  myBool2Int?: boolean;

  @field({name: 'my_bool_real', dbtype: 'REAL'})
  myBool2Real?: boolean;

  constructor() {
    this.id = 0;
  }
}



describe('test boolean type', () => {
  let sqldb: SqlDatabase;
  let dao: BaseDAO<DataTypeBoolean>;
  let model: DataTypeBoolean = new DataTypeBoolean();
  // ---------------------------------------------
  beforeEach(async (done) => {
    try {
      sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE);
      await schema().createTable(sqldb, DATATYPE_BOOLEAN_TABLE);
      dao = new BaseDAO<DataTypeBoolean>(DataTypeBoolean, sqldb);
      model.id = 0;
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('expect writing boolean properties to the database to succeed', async (done) => {
    try {
      let sqlstmt = await sqldb.prepare(`SELECT
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
      row = await sqlstmt.get({':id': model.id});
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
      row = await sqlstmt.get({':id': model.id});
      expect(row.id).toBe(model.id);
      expect(row.my_bool_text).toBe('0');
      expect(row.my_bool_int).toBe(0);
      expect(row.my_bool_real).toBe(0);

      // all undefined
      let oldid = ++model.id;
      model = new DataTypeBoolean();
      model.id = oldid;
      await dao.insert(model);
      row = await sqlstmt.get({':id': model.id});
      expect(row.id).toBe(model.id);
      // tslint:disable: no-null-keyword
      expect(row.my_bool_text).toBe(null);
      expect(row.my_bool_int).toBe(null);
      expect(row.my_bool_real).toBe(null);
      // tslint:enable: no-null-keyword

      await sqlstmt.finalize();
    } catch (err) {
      fail(err);
    }
    done();
  });


  it('expect reading boolean properties from database to succeed', async (done) => {
    try {
      let sqlstmt = await sqldb.prepare(`INSERT INTO "${DATATYPE_BOOLEAN_TABLE}"
              (id, my_bool_text, my_bool_int, my_bool_real)
            values
              (:id, :my_bool_text, :my_bool_int, :my_bool_real)`);

      // all true
      ++model.id;
      await sqlstmt.run({':id': model.id, ':my_bool_text': true, ':my_bool_int': true, ':my_bool_real': true});
      model = await dao.select(model);
      expect(typeof model.myBool2Text).toBe('boolean', `record ${model.id}: myBool2Text should be of type boolean`);
      expect(typeof model.myBool2Int).toBe('boolean', `record ${model.id}: myBool2Int should be of type boolean`);
      expect(typeof model.myBool2Real).toBe('boolean', `record ${model.id}: myBool2Real should be of type boolean`);
      expect(model.myBool2Text).toBeTruthy(`record ${model.id}: myBool2Text should be true`);
      expect(model.myBool2Int).toBeTruthy(`record ${model.id}: myBool2Int should be true`);
      expect(model.myBool2Real).toBeTruthy(`record ${model.id}: myBool2Real should be true`);

      // all false
      ++model.id;
      await sqlstmt.run({':id': model.id, ':my_bool_text': false, ':my_bool_int': false, ':my_bool_real': false});
      model = await dao.select(model);
      expect(typeof model.myBool2Text).toBe('boolean', `record ${model.id}: myBool2Text should be of type boolean`);
      expect(typeof model.myBool2Int).toBe('boolean', `record ${model.id}: myBool2Int should be of type boolean`);
      expect(typeof model.myBool2Real).toBe('boolean', `record ${model.id}: myBool2Real should be of type boolean`);
      expect(model.myBool2Text).toBeFalsy(`record ${model.id}: myBool2Text should be false`);
      expect(model.myBool2Int).toBeFalsy(`record ${model.id}: myBool2Int should be false`);
      expect(model.myBool2Real).toBeFalsy(`record ${model.id}: myBool2Real should be false`);

      // all undefined
      ++model.id;
      await sqlstmt.run(
          {':id': model.id, ':my_bool_text': undefined, ':my_bool_int': undefined, ':my_bool_real': undefined});
      model = await dao.select(model);
      expect(typeof model.myBool2Text).toBe('undefined', `record ${model.id}: myBool2Text should be of type undefined`);
      expect(typeof model.myBool2Int).toBe('undefined', `record ${model.id}: myBool2Int should be of type undefined`);
      expect(typeof model.myBool2Real).toBe('undefined', `record ${model.id}: myBool2Real should be of type undefined`);

      // all null
      // tslint:disable: no-null-keyword
      ++model.id;
      await sqlstmt.run({':id': model.id, ':my_bool_text': null, ':my_bool_int': null, ':my_bool_real': null});
      model = await dao.select(model);
      expect(typeof model.myBool2Text).toBe('undefined', `record ${model.id}: myBool2Text should be of type undefined`);
      expect(typeof model.myBool2Int).toBe('undefined', `record ${model.id}: myBool2Int should be of type undefined`);
      expect(typeof model.myBool2Real).toBe('undefined', `record ${model.id}: myBool2Real should be of type undefined`);
      // tslint:enable: no-null-keyword

      // myBool2Text is '0'
      ++model.id;
      await sqlstmt.run({':id': model.id, ':my_bool_text': '0', ':my_bool_int': undefined, ':my_bool_real': undefined});
      model = await dao.select(model);
      expect(typeof model.myBool2Text).toBe('boolean', `record ${model.id}: myBool2Text should be of type boolean`);
      expect(model.myBool2Text).toBeFalsy(`record ${model.id}: myBool2Text should be false`);

      // myBool2Text is '1'
      ++model.id;
      await sqlstmt.run({':id': model.id, ':my_bool_text': '1', ':my_bool_int': undefined, ':my_bool_real': undefined});
      model = await dao.select(model);
      expect(typeof model.myBool2Text).toBe('boolean', `record ${model.id}: myBool2Text should be of type boolean`);
      expect(model.myBool2Text).toBeTruthy(`record ${model.id}: myBool2Text should be true`);

      // myBool2Text is 'false'
      ++model.id;
      await sqlstmt.run(
          {':id': model.id, ':my_bool_text': 'false', ':my_bool_int': undefined, ':my_bool_real': undefined});
      model = await dao.select(model);
      expect(typeof model.myBool2Text).toBe('boolean', `record ${model.id}: myBool2Text should be of type boolean`);
      expect(model.myBool2Text).toBeFalsy(`record ${model.id}: myBool2Text should be false`);

      // myBool2Text is 'true'
      ++model.id;
      await sqlstmt.run(
          {':id': model.id, ':my_bool_text': 'true', ':my_bool_int': undefined, ':my_bool_real': undefined});
      model = await dao.select(model);
      expect(typeof model.myBool2Text).toBe('boolean', `record ${model.id}: myBool2Text should be of type boolean`);
      expect(model.myBool2Text).toBeTruthy(`record ${model.id}: myBool2Text should be true`);

      await sqlstmt.finalize();
    } catch (err) {
      fail(err);
    }
    done();
  });



});
