// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class
import {SqlDatabase, BaseDAO, SQL_MEMORY_DB_PRIVATE, schema, field, id, table} from '..';

const DATATYPE_DATE_TABLE = 'DD:DATATYPE_DATE';

@table({name: DATATYPE_DATE_TABLE})
class DataTypeDate {
  @id({name: 'id', dbtype: 'INTEGER NOT NULL'})
  id: number;

  @field({name: 'my_date_text', dbtype: 'TEXT DEFAULT(datetime(\'now\') || \'Z\')'})
  myDate2Text?: Date;

  @field({
    name: 'my_date_sec',
    dbtype: 'INTEGER DEFAULT(CAST(strftime(\'%s\',\'now\') as INT))',
    dateInMilliSeconds: false
  })
  myDate2Seconds?: Date;

  @field({
    name: 'my_date_milli',
    dbtype: 'INTEGER DEFAULT(CAST((julianday(\'now\') - 2440587.5)*86400000 AS INT))',
    dateInMilliSeconds: true
  })
  myDate2Milliseconds?: Date;


  constructor() {
    this.id = 0;
  }
}



describe('test Date type', () => {
  let sqldb: SqlDatabase;
  let dao: BaseDAO<DataTypeDate>;
  let lastModelId = 0;

  // ---------------------------------------------
  beforeEach(async (done) => {
    try {
      sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE);
      await schema().createTable(sqldb, DATATYPE_DATE_TABLE);
      dao = new BaseDAO<DataTypeDate>(DataTypeDate, sqldb);
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('expect writing Date properties to the database to succeed', async (done) => {
    try {
      const model: DataTypeDate = new DataTypeDate();
      model.id = ++lastModelId;
      // setting to now:
      model.myDate2Seconds = model.myDate2Text = model.myDate2Milliseconds = new Date();
      await dao.insert(model);

      let sqlstmt = await sqldb.prepare(`SELECT
              id, my_date_text, my_date_sec, my_date_milli
            FROM "${DATATYPE_DATE_TABLE}"
            WHERE id = :id`);
      const row = await sqlstmt.get({':id': model.id});
      expect(row.id).toBe(model.id);
      expect(row.my_date_text).toBe(model.myDate2Text.toISOString(), 'date wrongly written to text');
      expect(row.my_date_sec)
          .toBe(Math.floor(model.myDate2Text.getTime() / 1000), 'date wrongly written to integer (seconds)');
      expect(row.my_date_milli).toBe(model.myDate2Text.getTime(), 'date wrongly written to integer (milliseconds)');

    } catch (err) {
      fail(err);
    }
    done();

  });


  it('expect reading Date properties from database to succeed', async (done) => {
    try {
      const writeModel: DataTypeDate = new DataTypeDate();
      writeModel.id = ++lastModelId;
      writeModel.myDate2Text = writeModel.myDate2Seconds = writeModel.myDate2Milliseconds = new Date();

      let sqlstmt = await sqldb.prepare(`INSERT INTO "${DATATYPE_DATE_TABLE}"
              (id, my_date_text, my_date_sec, my_date_milli)
            values
              (:id, :my_date_text, :my_date_sec, :my_date_milli)`);

      await sqlstmt.run({
        ':id': writeModel.id,
        ':my_date_text': writeModel.myDate2Text.toISOString(),
        ':my_date_sec': Math.floor(writeModel.myDate2Seconds.getTime() / 1000),
        ':my_date_milli': writeModel.myDate2Milliseconds.getTime()
      });
      const readModel = await dao.select(writeModel);
      expect(readModel.myDate2Text instanceof Date)
          .toBeTruthy(`record ${readModel.id}: myDate2Text should be an instance of Date`);
      expect(readModel.myDate2Seconds instanceof Date)
          .toBeTruthy(`record ${readModel.id}: myDate2Seconds should be an instance of Date`);
      expect(readModel.myDate2Milliseconds instanceof Date)
          .toBeTruthy(`record ${readModel.id}: myDate2Milliseconds should be an instance of Date`);

      expect(readModel.id).toBe(writeModel.id);
      expect(readModel.myDate2Text).toBe(writeModel.myDate2Text, 'date wrongly written to text');
      expect(readModel.myDate2Seconds).toBe(writeModel.myDate2Seconds, 'date wrongly written to integer');
      expect(readModel.myDate2Milliseconds).toBe(writeModel.myDate2Milliseconds, 'date wrongly written to integer');

    } catch (err) {
      fail(err);
    }
    done();

  });

  it('expect reading Date properties from database defaults to succeed', async (done) => {
    try {
      const writeModel: DataTypeDate = new DataTypeDate();
      writeModel.id = ++lastModelId;

      const writeDate = new Date();
      writeDate.setUTCMilliseconds(0);

      let sqlstmt = await sqldb.prepare(`INSERT INTO "${DATATYPE_DATE_TABLE}"
              (id) values (:id)`);
      await sqlstmt.run({':id': writeModel.id});

      const readModel = await dao.select(writeModel);

      const readDate = new Date();
      readDate.setUTCMilliseconds(0);
      readDate.setUTCSeconds(readDate.getUTCSeconds() + 1);

      expect(readModel.myDate2Text).toBeDefined(`record ${readModel.id}: myDate2Text should be defined`);
      expect(readModel.myDate2Seconds).toBeDefined(`record ${readModel.id}: myDate2Seconds should be defined`);
      expect(readModel.myDate2Milliseconds)
          .toBeDefined(`record ${readModel.id}: myDate2Milliseconds should be defined`);

      expect(readModel.myDate2Text instanceof Date)
          .toBeTruthy(`record ${readModel.id}: myDate2Text should be an instance of Date`);
      expect(readModel.myDate2Seconds instanceof Date)
          .toBeTruthy(`record ${readModel.id}: myDate2Seconds should be an instance of Date`);
      expect(readModel.myDate2Milliseconds instanceof Date)
          .toBeTruthy(`record ${readModel.id}: myDate2Milliseconds should be an instance of Date`);

      expect(readModel.id).toBe(writeModel.id);

      expect(+writeDate <= +(readModel.myDate2Text as Date)).toBeTruthy('text-date has wrong default value');
      expect(+readDate >= +(readModel.myDate2Text as Date)).toBeTruthy('text-date has wrong default value');

      expect(+writeDate <= +(readModel.myDate2Seconds as Date)).toBeTruthy('date_sec has wrong default value');
      expect(+readDate >= +(readModel.myDate2Seconds as Date)).toBeTruthy('date_sec has wrong default value');

      expect(+writeDate <= +(readModel.myDate2Milliseconds as Date)).toBeTruthy('date_milli has wrong default value');
      expect(+readDate >= +(readModel.myDate2Milliseconds as Date)).toBeTruthy('date_milli has wrong default value');

    } catch (err) {
      fail(err);
    }
    done();

  });


  it('expect writing undefined Date properties to the database to succeed', async (done) => {
    try {
      const model: DataTypeDate = new DataTypeDate();
      model.id = ++lastModelId;
      await dao.insert(model);

      let model2: DataTypeDate = await dao.select(model);
      expect(model2.id).toBe(model.id);
      expect(model2.myDate2Text).toBeUndefined('date wrongly written to text');
      expect(model2.myDate2Seconds).toBeUndefined('date wrongly written to integer');
      expect(model2.myDate2Milliseconds).toBeUndefined('date wrongly written to integer');

    } catch (err) {
      fail(err);
    }
    done();

  });

});
