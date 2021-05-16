import { BaseDAO, field, id, schema, SQL_MEMORY_DB_PRIVATE, SqlDatabase, table } from '../../..';

const DATATYPE_JSON_TABLE = 'DJ:DATATYPE_JSON';

interface JsonData {
  notes: string;
  scores: number[];
}

@table({ name: DATATYPE_JSON_TABLE, autoIncrement: true })
class DataTypeJson {
  @id({ name: 'id', dbtype: 'INTEGER NOT NULL' })
  id!: number;

  @field({ name: 'my_json_text', dbtype: 'TEXT', isJson: true })
  myJsonData?: JsonData;
}

describe('test Json data', () => {
  let sqldb: SqlDatabase;
  let dao: BaseDAO<DataTypeJson>;
  // ---------------------------------------------
  beforeEach(async () => {
    try {
      sqldb = new SqlDatabase();
      await sqldb.open(SQL_MEMORY_DB_PRIVATE);
      await schema().createTable(sqldb, DATATYPE_JSON_TABLE);
      dao = new BaseDAO<DataTypeJson>(DataTypeJson, sqldb);
    } catch (err) {
      fail(err);
    }
  });

  it('expect reading/writing Json properties from/to the database to succeed', async () => {
    try {
      // write
      const model: DataTypeJson = new DataTypeJson();
      model.myJsonData = { notes: 'hello', scores: [3, 5, 1] };
      await dao.insert(model);

      // read
      const model2: DataTypeJson = await dao.select(model);
      expect(model2.id).toBe(model.id);
      expect(model2.myJsonData).toBeDefined();
      if (!model2.myJsonData) {
        throw new Error('this should not happen');
      }
      expect(model2.myJsonData.notes).toBe(model.myJsonData.notes);
      expect(model2.myJsonData.scores.length).toBe(model2.myJsonData.scores.length);
      expect(model2.myJsonData.scores[0]).toBe(model2.myJsonData.scores[0]);
      expect(model2.myJsonData.scores[1]).toBe(model2.myJsonData.scores[1]);
      expect(model2.myJsonData.scores[2]).toBe(model2.myJsonData.scores[2]);
    } catch (err) {
      fail(err);
    }
  });

  it('expect reading/writing Json properties from/to the database to succeed', async () => {
    try {
      // write
      const model: DataTypeJson = new DataTypeJson();
      await dao.insert(model);

      // read
      const model2: DataTypeJson = await dao.select(model);
      expect(model2.id).toBe(model.id);
      expect(model2.myJsonData).toBeUndefined('myJsonData is defined');
    } catch (err) {
      fail(err);
    }
  });
});
