// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class

import {
  BaseDAO,
  field,
  Filter,
  fk,
  id,
  QueryModel,
  SQL_MEMORY_DB_PRIVATE,
  SqlDatabase,
  table,
} from '../..';

@table({ name: 'ISSUE74_TABLE' })
class Issue74Model {
  @id({ name: 'id', dbtype: 'INTEGER NOT NULL' }) id!: number;

  @field({ name: 'loaded' })
  loaded: boolean = false;
}

describe('test QueryModel', () => {
  let sqldb: SqlDatabase;

  beforeAll(async () => {
    sqldb = new SqlDatabase();
    await sqldb.open(SQL_MEMORY_DB_PRIVATE);

    let issue74Dao: BaseDAO<Issue74Model> = new BaseDAO(Issue74Model, sqldb);
    await issue74Dao.createTable();
    // await contactDao.createTable();
    const issue74Model = new Issue74Model();

    issue74Model.id = 1;
    issue74Model.loaded = false;

    await issue74Dao.insert(issue74Model);

    issue74Model.id = 2;
    issue74Model.loaded = true;
    await issue74Dao.insert(issue74Model);
  });

  // ---------------------------------------------
  afterAll(async () => {
    try {
      let issue74Dao: BaseDAO<Issue74Model> = new BaseDAO(Issue74Model, sqldb);
      await issue74Dao.dropTable();
    } catch (err) {
      fail(err);
    }
  });

  it('worked: `not: { loaded: true }``', async () => {
    try {
      const issue74Model = new QueryModel<Issue74Model>(Issue74Model);
      const res = await issue74Model.selectAll(sqldb, {
        where: {
          not: { loaded: true },
        },
      });
      expect(res.length).toBe(1);
      expect(res[0].id).toBe(1);
      expect(res[0].loaded).toBe(false);
    } catch (err) {
      fail(err);
    }
  });

  it('worked: `not: { loaded: { eq: false } }``', async () => {
    try {
      const issue74Model = new QueryModel<Issue74Model>(Issue74Model);
      const res = await issue74Model.selectAll(sqldb, {
        where: {
          not: { loaded: { eq: false } },
        },
      });
      expect(res.length).toBe(1);
      expect(res[0].id).toBe(2);
    } catch (err) {
      fail(err);
    }
  });

  it('failed: `not: { loaded: false }``', async () => {
    try {
      const issue74Model = new QueryModel<Issue74Model>(Issue74Model);
      const res = await issue74Model.selectAll(sqldb, {
        where: {
          not: { loaded: false },
        },
      });
      expect(res.length).toBe(1);
      expect(res.length).toBe(1);
      expect(res[0].id).toBe(2);
    } catch (err) {
      fail(err);
    }
  });

  it('worked: `{ loaded: true }`', async () => {
    try {
      const issue74Model = new QueryModel<Issue74Model>(Issue74Model);
      const res = await issue74Model.selectAll(sqldb, {
        where: {
          loaded: true,
        },
      });
      expect(res.length).toBe(1);
      expect(res[0].id).toBe(2);
      expect(res[0].loaded).toBe(true);
    } catch (err) {
      fail(err);
    }
  });

  it('worked: `{ loaded: { eq: false } }`', async () => {
    try {
      const issue74Model = new QueryModel<Issue74Model>(Issue74Model);
      const res = await issue74Model.selectAll(sqldb, {
        where: {
          loaded: { eq: false },
        },
      });
      expect(res.length).toBe(1);
      expect(res[0].id).toBe(1);
      expect(res[0].loaded).toBe(false);
    } catch (err) {
      fail(err);
    }
  });

  it('failed: `{ loaded: false }`', async () => {
    try {
      const issue74Model = new QueryModel<Issue74Model>(Issue74Model);
      const res = await issue74Model.selectAll(sqldb, {
        where: {
          loaded: false,
        },
      });
      expect(res.length).toBe(1);
      expect(res[0].id).toBe(1);
      expect(res[0].loaded).toBe(false);
    } catch (err) {
      fail(err);
    }
  });
});
