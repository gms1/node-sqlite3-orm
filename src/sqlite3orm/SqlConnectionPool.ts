// import * as core from './core';

// tslint:disable-next-line no-require-imports
import * as _dbg from 'debug';

import {SqlDatabase, SQL_OPEN_DEFAULT} from './SqlDatabase';


const debug = _dbg('sqlite3orm:connectionpool');

/**
 * A simple connection pool
 *
 * @export
 * @class SqlConnectionPool
 */
export class SqlConnectionPool {
  private databaseFile?: string;

  private mode: number;

  private min: number;

  private max: number;

  private curr: number;

  private inPool: SqlDatabase[];

  private inUse: Set<SqlDatabase>;


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
   * filename (see SQL_MEMORY_DB_SHARED/SQL_MEMORY_DB_PRIVATE for an in-memory
   * database)
   * @param [mode=SQL_OPEN_DEFAULT] - A bit flag combination of: SQL_OPEN_CREATE |
   * SQL_OPEN_READONLY | SQL_OPEN_READWRITE
   * @param [min=1] minimum connections whihc should be opened by this connection pool
   * @param [max=0] maximum connections which can be opened by this connection pool
   * @returns A promise
   */
  async open(databaseFile: string, mode: number = SQL_OPEN_DEFAULT, min: number = 1, max: number = 0): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        await this.close();
      } catch (err) {
      }
      try {
        this.databaseFile = databaseFile;
        this.mode = mode;
        this.min = min;
        this.max = max;
        this.inPool.length = 0;

        const promises: Promise<void>[] = [];

        if (this.min < 1) {
          this.min = 1;
        }

        for (let i = 0; i < this.min; i++) {
          const sqldb = new SqlDatabase();
          this.inPool.push(sqldb);
          promises.push(sqldb.openByPool(this, this.databaseFile, this.mode));
        }
        await Promise.all(promises);
        this.curr += this.min;
        debug(`pool: ${this.curr} connections open (${this.inPool.length} in pool)`);
        resolve();
      } catch (err) {
        try {
          await this.close();
        } catch (_ignore) {
        }
        debug(`opening pool to ${databaseFile} failed: ${err.message}`);
        reject(err);
      }
    });
  }

  /**
   * Close the database connection pool
   *
   * @returns A promise
   */
  async close(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
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
        resolve();
      } catch (err) /* istanbul ignore next */ {
        debug(`closing pool failed: ${err.message}`);
        reject(err);
      }
    });
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
    return new Promise<SqlDatabase>(async (resolve, reject) => {
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
          resolve(sqldb);
          return;
        }
        if (!this.databaseFile) {
          throw new Error(`connection pool not opened`);
        }
        sqldb = new SqlDatabase();
        await sqldb.openByPool(this, this.databaseFile, this.mode);
        this.curr++;
        debug(`pool: ${this.curr} connections open (${this.inPool.length} in pool)`);
        if (this.max > 0) {
          this.inUse.add(sqldb);
        }
        resolve(sqldb);
      } catch (err) {
        debug(`getting connection from pool failed: ${err.message}`);
        reject(err);
      }
    });
  }

  /**
   * release a connection to the pool
   *
   * @param sqldb - The db connection
   */
  release(sqldb: SqlDatabase): void {
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
      newsqldb.recycleByPool(this, sqldb);
      this.inPool.push(newsqldb);
      debug(`pool: ${this.curr} connections open (${this.inPool.length} in pool)`);
    }
  }
}

// TODO: move this function or find a better one:
async function wait(cond: () => boolean, timeout: number = 0, intervall: number = 100): Promise<void> {
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
