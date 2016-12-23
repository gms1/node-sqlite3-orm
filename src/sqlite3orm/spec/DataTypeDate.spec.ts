import {BaseDAO} from '../BaseDAO';
import {field, FieldOpts, fk, id, table, TableOpts} from '../decorators';
import {schema} from '../Schema';
import {SQL_MEMORY_DB_PRIVATE, SqlDatabase} from '../SqlDatabase';
import {SqlStatement} from '../SqlStatement';


const DATATYPE_DATE_TABLE = 'DATATYPE_DATE';

@table({name: DATATYPE_DATE_TABLE})
class DataTypeDate {
  @id({name: 'id', dbtype: 'INTEGER NOT NULL'})
  id: number;

  @field({name: 'my_date_text', dbtype: 'TEXT'})
  myDate2Text: Date;

  @field({name: 'my_date_int', dbtype: 'INTEGER'})
  myDate2Int: Date;
}



describe('test Date type', () => {
  let sqldb: SqlDatabase;
  let dao: BaseDAO<DataTypeDate>;
  let model: DataTypeDate = new DataTypeDate();
  // ---------------------------------------------
  beforeAll(async(done) => {
    try {
      sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE);
      await schema().createTable(sqldb, DATATYPE_DATE_TABLE);
      dao = new BaseDAO<DataTypeDate>(DataTypeDate, sqldb);
      model.id = 0;
    } catch (err) {
      fail(err);
    }
    done();
  });

  it('expect writing Date properties to the database to succeed', async(
                                                                      done) => {
    try {
      let sqlstmt = await sqldb.prepare(`SELECT
              id, my_date_text, my_date_int
            FROM ${DATATYPE_DATE_TABLE}
            WHERE id = :id`);

      let row: any;

      // now
      ++model.id;
      model.myDate2Int = model.myDate2Text = new Date();
      await dao.insert(model);
      row = await sqlstmt.get({':id': model.id});
      expect(row.id).toBe(model.id);
      expect(row.my_date_text)
          .toBe(
              model.myDate2Text.toISOString(), 'date wrongly written to text');
      expect(row.my_date_int)
          .toBe(
              Math.floor(model.myDate2Text.getTime() / 1000),
              'date wrongly written to integer');

    } catch (err) {
      fail(err);
    }
    done();

  });


  it('expect reading Date properties from database to succeed', async(
                                                                       done) => {
    try {
      let sqlstmt = await sqldb.prepare(`INSERT INTO ${DATATYPE_DATE_TABLE}
              (id, my_date_text, my_date_int)
            values
              (:id, :my_date_text, :my_date_int)`);

      // all true
      ++model.id;
      await sqlstmt.run({
        ':id': model.id,
        ':my_date_text': new Date().toISOString(),
        ':my_date_int': Math.floor(new Date().getTime() / 1000)
      });
      model = await dao.select(model);
      expect(model.myDate2Text instanceof Date)
          .toBeTruthy(
              `record ${model.id}: myDate2Text should be an instance of Date`);
      expect(model.myDate2Int instanceof Date)
          .toBeTruthy(
              `record ${model.id}: myDate2Int should be an instance of Date`);

    } catch (err) {
      fail(err);
    }
    done();

  });


});
