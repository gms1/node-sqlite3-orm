// import * as core from './core';

// tslint:disable-next-line no-require-imports
import * as _dbg from 'debug';

import {SQL_OPEN_DEFAULT, SqlDatabase} from './SqlDatabase';
import {SqlDatabaseSettings} from './SqlDatabaseSettings';

const debug = _dbg('sqlite3orm:pool');

/**
 * A simple connection pool
 *
 * @export
 * @class SqlConnectionPool
 */
export class SqlConnectionPool {
  opening?: Promise<void>;

  private databaseFile?: string;

  private mode: number;

  private min: number;

  private max: number;

  private curr: number;

  private readonly inPool: SqlDatabase[];

  private readonly inUse: Set<SqlDatabase>;

  private settings?: SqlDatabaseSettings;


  /**
   * Creates an instance of SqlConnectionPool.
   *
   */
  constructor() {
    this.databaseFile = undefined;
    this.mode = SQL_OPEN_DEFAULT;
    this.inUse = new Set<SqlDatabase>();
    this.inPool = [];
    this.min = this.max = 0;
    this.curr = 0;
  }

  /**
   * Open a database connection pool
   *
   * @param databaseFile - The path to the database file or URI
   * @param [mode=SQL_OPEN_DEFAULT] - A bit flag combination of: SQL_OPEN_CREATE |
   * SQL_OPEN_READONLY | SQL_OPEN_READWRITE
   * @param [min=1] minimum connections whihc should be opened by this connection pool
   * @param [max=0] maximum connections which can be opened by this connection pool
   * @returns A promise
   */
  open(
      databaseFile: string, mode: number = SQL_OPEN_DEFAULT, min: number = 1, max: number = 0,
      settings?: SqlDatabaseSettings): Promise<void> {
    const opening = new Promise<void>(async (resolve, reject) => {
      try {
        await this.close();
      } catch (err) {
      }
      try {
        this.databaseFile = databaseFile;
        this.opening = opening;
        this.mode = mode;
        this.min = min;
        this.max = max;
        this.settings = settings;
        this.curr = 0;
        this.inPool.length = 0;

        const promises: Promise<void>[] = [];

        if (this.min < 1) {
          this.min = 1;
        }
        let sqldb = new SqlDatabase();
        await sqldb.openByPool(this, this.databaseFile, this.mode, this.settings);
        this.inPool.push(sqldb);

        for (let i = 1; i < this.min; i++) {
          sqldb = new SqlDatabase();
          promises.push(sqldb.openByPool(this, this.databaseFile, this.mode, this.settings));
          this.inPool.push(sqldb);
        }
        await Promise.all(promises);
        debug(`pool: opened: ${this.curr} connections open (${this.inPool.length} in pool)`);
        this.opening = undefined;
        resolve();
      } catch (err) {
        this.opening = undefined;
        try {
          await this.close();
        } catch (_ignore) {
        }
        debug(`opening pool to ${databaseFile} failed: ${err.message}`);
        reject(err);
      }
    });
    return opening;
  }

  /**
   * Close the database connection pool
   *
   * @returns A promise
   */
  async close(): Promise<void> {
    try {
      if (this.databaseFile) {
        debug(`pool: closing: ${this.curr} connections open (${this.inPool.length} in pool)`);
      }
      this.databaseFile = undefined;
      this.mode = SQL_OPEN_DEFAULT;
      const promises: Promise<void>[] = [];
      this.inPool.forEach((value) => {
        promises.push(value.closeByPool());
      });
      this.inPool.length = 0;
      this.inUse.forEach((value) => {
        promises.push(value.closeByPool());
      });
      this.inUse.clear();
      await Promise.all(promises);
    } catch (err) /* istanbul ignore next */ {
      debug(`closing pool failed: ${err.message}`);
      return Promise.reject(err);
    }
  }

  /**
   * test if this connection pool is connected to a database file
   */
  isOpen(): boolean {
    return !!this.databaseFile;
  }

  /**
   * get a connection from the pool
   *
   * @param [timeout=0] The timeout to wait for a connection ( 0 is infinite )
   * @returns A promise of the db connection
   */
  async get(timeout: number = 0): Promise<SqlDatabase> {
    try {
      let sqldb: SqlDatabase|undefined;
      const cond = () => this.inPool.length > 0;
      if (this.max > 0 && !cond() && this.inUse.size >= this.max) {
        await wait(cond, timeout);
      }
      if (this.inPool.length > 0) {
        // tslint:disable-next-line no-unnecessary-type-assertion
        sqldb = this.inPool.shift() as SqlDatabase;
        if (this.max > 0) {
          this.inUse.add(sqldb);
        }
        this.curr++;
        debug(`pool: ${this.curr} connections open (${this.inPool.length} in pool)`);
        return sqldb;
      }
      if (!this.databaseFile) {
        throw new Error(`connection pool not opened`);
      }
      sqldb = new SqlDatabase();
      await sqldb.openByPool(this, this.databaseFile, this.mode, this.settings);
      this.curr++;
      debug(`pool: ${this.curr} connections open (${this.inPool.length} in pool)`);
      if (this.max > 0) {
        this.inUse.add(sqldb);
      }
      return sqldb;
    } catch (err) {
      debug(`getting connection from pool failed: ${err.message}`);
      return Promise.reject(err);
    }
  }

  /**
   * release a connection to the pool
   *
   * @param sqldb - The db connection
   */
  async release(sqldb: SqlDatabase): Promise<void> {
    /* istanbul ignore if */
    if (this !== sqldb.getPool()) {
      // not opened by this pool
      return;
    }
    if (this.max > 0 && this.inUse.has(sqldb)) {
      this.inUse.delete(sqldb);
    }
    if (sqldb.isOpen()) {
      // transfer database connection
      const newsqldb = new SqlDatabase();
      await newsqldb.recycleByPool(this, sqldb, this.settings);
      this.inPool.push(newsqldb);
      this.curr--;
      debug(`pool: ${this.curr} connections open (${this.inPool.length} in pool)`);
    }
  }
}

// TODO: move this function or find a better one:
function wait(cond: () => boolean, timeout: number = 0, intervall: number = 100): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let counter = 0;
    const timer = setInterval(() => {
      if (cond()) {
        clearInterval(timer);
        resolve();
        return;
      }
      if (timeout > 0 && (++counter * intervall) >= timeout) {
        clearInterval(timer);
        debug(`getting connection timed out`);
        reject(new Error('timeout reached'));
        return;
      }
    }, intervall);
  });
}
