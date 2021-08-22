import { SqlDatabase, SQL_MEMORY_DB_PRIVATE } from '../../core';

describe('test SqlBackup', () => {
  const TARGET_DB_FILE = 'testBackup.db';
  let sqlSourceDb: SqlDatabase;

  beforeEach(async () => {
    sqlSourceDb = new SqlDatabase();
    await sqlSourceDb.open(SQL_MEMORY_DB_PRIVATE);
    await sqlSourceDb.exec(
      'CREATE TABLE TEST (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, col VARCHAR(50))',
    );
    await sqlSourceDb.run('INSERT INTO TEST (id, col) values (:a, :b)', {
      ':a': 0,
      ':b': 'testvalue 0',
    });
  });

  it('should backup and restore to/from file', async () => {
    const sqlBackup = await sqlSourceDb.backup(TARGET_DB_FILE);
    expect(sqlBackup.idle).toBe(true);
    expect(sqlBackup.completed).toBe(false);
    expect(sqlBackup.failed).toBe(false);
    expect(sqlBackup.progress).toBe(0);

    await sqlBackup.step(-1);
    expect(sqlBackup.idle).toBe(true);
    expect(sqlBackup.completed).toBe(true);
    expect(sqlBackup.failed).toBe(false);
    expect(sqlBackup.progress).toBe(100);
    expect(sqlBackup.pageCount).toBeGreaterThanOrEqual(1);

    await sqlSourceDb.exec('DELETE FROM TEST');

    const res1 = await sqlSourceDb.all('SELECT id, col FROM TEST order by id');
    expect(res1.length).toBe(0);

    // await sqlSourceDb.exec('DROP TABLE TEST');

    const sqlRestore = await sqlSourceDb.backup(TARGET_DB_FILE, false);
    expect(sqlRestore.idle).toBe(true);
    expect(sqlRestore.completed).toBe(false);
    expect(sqlRestore.failed).toBe(false);
    expect(sqlRestore.progress).toBe(0);

    await sqlRestore.step(-1);
    expect(sqlRestore.idle).toBe(true);
    expect(sqlRestore.completed).toBe(true);
    expect(sqlRestore.failed).toBe(false);
    expect(sqlRestore.progress).toBe(100);
    expect(sqlBackup.pageCount).toBeGreaterThanOrEqual(1);

    const res2 = await sqlSourceDb.all('SELECT id, col FROM TEST order by id');
    expect(res2.length).toBe(1);
    expect(res2[0].id).toBe(0);
    expect(res2[0].col).toBe('testvalue 0');

    sqlBackup.finish();
  });
});
