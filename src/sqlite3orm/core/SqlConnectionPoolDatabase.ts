import * as _dbg from 'debug';
import { Database } from 'sqlite3';

import { SqlConnectionPool } from './SqlConnectionPool';
import { SQL_OPEN_DEFAULT, SqlDatabase } from './SqlDatabase';
import { SqlDatabaseSettings } from './SqlDatabaseSettings';

const debug = _dbg('sqlite3orm:database');

export class SqlConnectionPoolDatabase extends SqlDatabase {
  pool?: SqlConnectionPool;

  public close(): Promise<void> {
    if (this.pool) {
      return this.pool.release(this);
    } else {
      return super.close();
    }
  }

  public async open(
    databaseFile: string,
    mode?: number,
    settings?: SqlDatabaseSettings,
  ): Promise<void> {
    /* istanbul ignore else */
    if (this.isOpen()) {
      /* istanbul ignore else */
      if (this.pool) {
        // stealing from pool
        // this connection should not be recycled by the pool
        // => temporary mark as dirty
        const oldDirty = this.dirty;
        this.dirty = true;
        await this.pool.release(this);
        this.dirty = oldDirty;
      } else {
        await super.close();
      }
    }
    this.pool = undefined;
    return super.open(databaseFile, mode, settings);
  }

  /*
  @internal
  */
  public openByPool(
    pool: SqlConnectionPool,
    databaseFile: string,
    mode?: number,
    settings?: SqlDatabaseSettings,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const db = new Database(databaseFile, mode || SQL_OPEN_DEFAULT, (err) => {
        if (err) {
          reject(err);
        } else {
          this.pool = pool;
          this.db = db;
          this.dbId = SqlDatabase.lastId++;
          this.databaseFile = databaseFile;
          debug(`${this.dbId}: opened`);
          resolve();
        }
      });
    }).then(
      (): Promise<void> => {
        if (settings) {
          return this.applySettings(settings);
        }
        return Promise.resolve();
      },
    );
  }

  /*
  @internal
  */
  public closeByPool(): Promise<void> {
    this.pool = undefined;
    return new Promise<void>((resolve, reject) => {
      /* istanbul ignore if */
      if (!this.db) {
        resolve();
      } else {
        const db = this.db;
        debug(`${this.dbId}: close`);
        this.db = undefined;
        this.dbId = undefined;
        this.databaseFile = undefined;
        db.close((err) => {
          db.removeAllListeners();
          /* istanbul ignore if */
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  }

  /*
  @internal
  */
  public async recycleByPool(
    pool: SqlConnectionPool,
    sqldb: SqlConnectionPoolDatabase,
    settings?: SqlDatabaseSettings,
  ): Promise<void> {
    /* istanbul ignore else */
    if (sqldb.db) {
      try {
        await sqldb.endTransaction(false);
      } catch (err) {}
      sqldb.db.removeAllListeners();
      // move
      this.db = sqldb.db;
      this.dbId = sqldb.dbId;
      this.databaseFile = sqldb.databaseFile;
      this.pool = pool;
      // reapply default settings
      if (settings) {
        try {
          await this.applySettings(settings);
        } catch (err) {}
      }
    }
    sqldb.db = undefined;
    sqldb.dbId = undefined;
    sqldb.databaseFile = undefined;
    sqldb.pool = undefined;
  }
}
