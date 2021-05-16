import { BaseDAO, field, id, schema, SQL_MEMORY_DB_PRIVATE, SqlDatabase, table } from '../../..';

const DATATYPE_DATE_TABLE = 'DD:DATATYPE_DATE';

@table({ name: DATATYPE_DATE_TABLE })
class DataTypeDate {
  @id({ name: 'id', dbtype: 'INTEGER NOT NULL' })
  id!: number;

  @field({ name: 'my_date_text', dbtype: "TEXT DEFAULT(datetime('now') || 'Z')" })
  myDate2Text?: Date;

  @field({
    name: 'my_date_sec',
    dbtype: "INTEGER DEFAULT(CAST(strftime('%s','now') as INT))",
    dateInMilliSeconds: false,
  })
  myDate2Seconds?: Date;

  @field({
    name: 'my_date_milli',
    dbtype: "INTEGER DEFAULT(CAST((julianday('now') - 2440587.5)*86400000 AS INT))",
    dateInMilliSeconds: true,
  })
  myDate2Milliseconds?: Date;
}

describe('test Date type', () => {
  let sqldb: SqlDatabase;
  let dao: BaseDAO<DataTypeDate>;
  let lastModelId = 1;

  // ---------------------------------------------
  beforeEach(async () => {
    try {
      sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE);
      await schema().createTable(sqldb, DATATYPE_DATE_TABLE);
      dao = new BaseDAO<DataTypeDate>(DataTypeDate, sqldb);
    } catch (err) {
      fail(err);
    }
  });

  it('expect writing Date properties to the database to succeed', async () => {
    try {
      const model: DataTypeDate = new DataTypeDate();
      model.id = ++lastModelId;
      // setting to now:
      model.myDate2Seconds = model.myDate2Text = model.myDate2Milliseconds = new Date();
      await dao.insert(model);

      const sqlstmt = await sqldb.prepare(`SELECT
              id, my_date_text, my_date_sec, my_date_milli
            FROM "${DATATYPE_DATE_TABLE}"
            WHERE id = :id`);
      const row = await sqlstmt.get({ ':id': model.id });
      expect(row.id).toBe(model.id);
      expect(row.my_date_text).toBe(model.myDate2Text.toISOString());
      expect(row.my_date_sec).toBe(Math.floor(model.myDate2Text.getTime() / 1000));
      expect(row.my_date_milli).toBe(model.myDate2Text.getTime());
    } catch (err) {
      fail(err);
    }
  });

  it('expect reading Date properties from database to succeed', async () => {
    try {
      const writeModel: DataTypeDate = new DataTypeDate();
      writeModel.id = ++lastModelId;
      writeModel.myDate2Text = writeModel.myDate2Seconds = writeModel.myDate2Milliseconds = new Date();

      const sqlstmt = await sqldb.prepare(`INSERT INTO "${DATATYPE_DATE_TABLE}"
              (id, my_date_text, my_date_sec, my_date_milli)
            values
              (:id, :my_date_text, :my_date_sec, :my_date_milli)`);

      await sqlstmt.run({
        ':id': writeModel.id,
        ':my_date_text': writeModel.myDate2Text.toISOString(),
        ':my_date_sec': Math.floor(writeModel.myDate2Seconds.getTime() / 1000),
        ':my_date_milli': writeModel.myDate2Milliseconds.getTime(),
      });
      const readModel = await dao.select(writeModel);
      expect(readModel.myDate2Text instanceof Date).toBeTruthy();
      expect(readModel.myDate2Seconds instanceof Date).toBeTruthy();
      expect(readModel.myDate2Milliseconds instanceof Date).toBeTruthy();

      expect(readModel.id).toBe(writeModel.id);
      expect(readModel.myDate2Text).toBe(writeModel.myDate2Text);
      expect(readModel.myDate2Seconds).toBe(writeModel.myDate2Seconds);
      expect(readModel.myDate2Milliseconds).toBe(writeModel.myDate2Milliseconds);
    } catch (err) {
      fail(err);
    }
  });

  it('expect reading Date properties from database defaults to succeed', async () => {
    try {
      const writeModel: DataTypeDate = new DataTypeDate();
      writeModel.id = ++lastModelId;

      const writeDate = new Date();
      writeDate.setUTCMilliseconds(0);

      const sqlstmt = await sqldb.prepare(`INSERT INTO "${DATATYPE_DATE_TABLE}"
              (id) values (:id)`);
      await sqlstmt.run({ ':id': writeModel.id });

      const readModel = await dao.select(writeModel);

      const readDate = new Date();
      readDate.setUTCMilliseconds(0);
      readDate.setUTCSeconds(readDate.getUTCSeconds() + 1);

      expect(readModel.myDate2Text).toBeDefined();
      expect(readModel.myDate2Seconds).toBeDefined();
      expect(readModel.myDate2Milliseconds).toBeDefined();

      expect(readModel.myDate2Text instanceof Date).toBeTruthy();
      expect(readModel.myDate2Seconds instanceof Date).toBeTruthy();
      expect(readModel.myDate2Milliseconds instanceof Date).toBeTruthy();

      expect(readModel.id).toBe(writeModel.id);

      expect(+writeDate <= +(readModel.myDate2Text as Date)).toBeTruthy();
      expect(+readDate >= +(readModel.myDate2Text as Date)).toBeTruthy();

      expect(+writeDate <= +(readModel.myDate2Seconds as Date)).toBeTruthy();
      expect(+readDate >= +(readModel.myDate2Seconds as Date)).toBeTruthy();

      expect(+writeDate <= +(readModel.myDate2Milliseconds as Date)).toBeTruthy();
      expect(+readDate >= +(readModel.myDate2Milliseconds as Date)).toBeTruthy();
    } catch (err) {
      fail(err);
    }
  });

  it('expect writing undefined Date properties to the database to succeed', async () => {
    try {
      const model: DataTypeDate = new DataTypeDate();
      model.id = ++lastModelId;
      await dao.insert(model);

      const model2: DataTypeDate = await dao.select(model);
      expect(model2.id).toBe(model.id);
      expect(model2.myDate2Text).toBeUndefined();
      expect(model2.myDate2Seconds).toBeUndefined();
      expect(model2.myDate2Milliseconds).toBeUndefined();
    } catch (err) {
      fail(err);
    }
  });
});
