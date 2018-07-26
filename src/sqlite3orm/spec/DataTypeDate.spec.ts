// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class
import {SqlDatabase, BaseDAO, SQL_MEMORY_DB_PRIVATE, schema, field, id, table} from '..';

const DATATYPE_DATE_TABLE = 'DD:DATATYPE_DATE';

@table({name: DATATYPE_DATE_TABLE})
class DataTypeDate {
  @id({name: 'id', dbtype: 'INTEGER NOT NULL'})
  id: number;

  @field({name: 'my_date_text', dbtype: 'TEXT NOT NULL DEFAULT(datetime(\'now\') || \'Z\')'})
  myDate2Text?: Date;

  @field({name: 'my_date_int', dbtype: 'INTEGER NOT NULL DEFAULT(strftime(\'%s\',\'now\'))'})
  myDate2Int?: Date;

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
      model.myDate2Int = model.myDate2Text = new Date();
      await dao.insert(model);

      let sqlstmt = await sqldb.prepare(`SELECT
              id, my_date_text, my_date_int
            FROM "${DATATYPE_DATE_TABLE}"
            WHERE id = :id`);
      const row = await sqlstmt.get({':id': model.id});
      expect(row.id).toBe(model.id);
      expect(row.my_date_text).toBe(model.myDate2Text.toISOString(), 'date wrongly written to text');
      expect(row.my_date_int).toBe(Math.floor(model.myDate2Text.getTime() / 1000), 'date wrongly written to integer');

    } catch (err) {
      fail(err);
    }
    done();

  });


  it('expect reading Date properties from database to succeed', async (done) => {
    try {
      const writeModel: DataTypeDate = new DataTypeDate();
      writeModel.id = ++lastModelId;
      writeModel.myDate2Text = writeModel.myDate2Int = new Date();

      let sqlstmt = await sqldb.prepare(`INSERT INTO "${DATATYPE_DATE_TABLE}"
              (id, my_date_text, my_date_int)
            values
              (:id, :my_date_text, :my_date_int)`);

      await sqlstmt.run({
        ':id': writeModel.id,
        ':my_date_text': writeModel.myDate2Text.toISOString(),
        ':my_date_int': Math.floor(writeModel.myDate2Int.getTime() / 1000)
      });
      const readModel = await dao.select(writeModel);
      expect(readModel.myDate2Text instanceof Date)
          .toBeTruthy(`record ${readModel.id}: myDate2Text should be an instance of Date`);
      expect(readModel.myDate2Int instanceof Date)
          .toBeTruthy(`record ${readModel.id}: myDate2Int should be an instance of Date`);

      expect(readModel.id).toBe(writeModel.id);
      expect(readModel.myDate2Text).toBe(writeModel.myDate2Text, 'date wrongly written to text');
      expect(readModel.myDate2Int).toBe(writeModel.myDate2Int, 'date wrongly written to integer');

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
      expect(readModel.myDate2Int).toBeDefined(`record ${readModel.id}: myDate2Int should be defined`);

      expect(readModel.myDate2Text instanceof Date)
          .toBeTruthy(`record ${readModel.id}: myDate2Text should be an instance of Date`);
      expect(readModel.myDate2Int instanceof Date)
          .toBeTruthy(`record ${readModel.id}: myDate2Int should be an instance of Date`);

      expect(readModel.id).toBe(writeModel.id);

      expect(+writeDate <= +(readModel.myDate2Text as Date)).toBeTruthy('text-date has wrong default value');
      expect(+readDate >= +(readModel.myDate2Text as Date)).toBeTruthy('text-date has wrong default value');

      expect(+writeDate <= +(readModel.myDate2Int as Date)).toBeTruthy('int-date has wrong default value');
      expect(+readDate >= +(readModel.myDate2Int as Date)).toBeTruthy('int-date has wrong default value');

    } catch (err) {
      fail(err);
    }
    done();

  });

});
