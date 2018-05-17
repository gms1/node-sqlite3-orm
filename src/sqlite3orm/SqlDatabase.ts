import {Database, OPEN_CREATE, OPEN_READONLY, OPEN_READWRITE, Statement, verbose as sqlverbose} from 'sqlite3';

import {SqlStatement, SqlRunResult} from './SqlStatement';
import {SqlConnectionPool} from './SqlConnectionPool';

export const SQL_OPEN_READONLY = OPEN_READONLY;
export const SQL_OPEN_READWRITE = OPEN_READWRITE;
export const SQL_OPEN_CREATE = OPEN_CREATE;

export const SQL_MEMORY_DB_SHARED = 'file::memory:?cache=shared';
export const SQL_MEMORY_DB_PRIVATE = ':memory:';
// NOTE:
// our tests defined in 'SqlDatabase.spec.ts' are working fine using
// private-cache mode:
//   export const SQL_MEMORY_DB_PRIVATE = ':memory:';
//   export const SQL_MEMORY_DB_PRIVATE = 'file::memory:?cache=off';
// but failing, if private-cache mode is explicitly defined:
//   export const SQL_MEMORY_DB_PRIVATE = 'file::memory:?cache=private';
// could it be, that the last URI opens the memory in shared-cache mode?
// but even running jasmine using `jasmine /path/to/Database.spec.js` works as
// expected,
// only if jasmine is called without any spec.js, these tests are failing in the
// 'beforeAll' function, with:
//   Error: SQLITE_ERROR: table TEST already exists
//   Error: SQLITE_CONSTRAINT: UNIQUE constraint failed: TEST.id

// tslint:disable-next-line: no-bitwise
export const SQL_OPEN_DEFAULT = SQL_OPEN_READWRITE | SQL_OPEN_CREATE;

/**
 * A thin wrapper for the 'Database' class from 'node-sqlite3' using Promises
 * instead of callbacks
 * see
 * https://github.com/mapbox/node-sqlite3/wiki/API
 *
 * see why we may want to have a connection pool running on nodejs serving multiple requests
 * https://github.com/mapbox/node-sqlite3/issues/304
 *
 * @export
 * @class SqlDatabase
 */
export class SqlDatabase {
  private db?: Database;
  private pool?: SqlConnectionPool;

  /**
   * Creates an instance of SqlDatabase.
   *
   */
  constructor() {
    this.db = undefined;
    this.pool = undefined;
  }

  /**
   * Open a database connection
   *
   * @param {string} databaseFile - The path to the database file or URI
   * filename (see SQL_MEMORY_DB_SHARED/SQL_MEMORY_DB_PRIVATE for an in-memory
   * database)
   * @param {number} [mode=SQL_OPEN_DEFAULT] - A bit flag combination of: SQL_OPEN_CREATE |
   * SQL_OPEN_READONLY | SQL_OPEN_READWRITE
   * @returns {Promise<void>}
   */
  public async open(databaseFile: string, mode?: number): Promise<void> {
    if (!!this.pool) {
      this.pool.release(this);
      }
    return new Promise<void>((resolve, reject) => {
      const db = new Database(databaseFile, mode || SQL_OPEN_DEFAULT, (err) => {
        if (err) {
          reject(err);
        } else {
          this.db = db;
          resolve();
        }
      });
    });
  }

  /**
   * Close the database connection
   *
   * @returns {Promise<void>}
   */
  public async close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!!this.pool) {
        this.pool.release(this);
        resolve();
      } else if (!this.db) {
        resolve();
      } else {
        const db = this.db;
        this.db = undefined;
        db.close((err) => {
          db.removeAllListeners();
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      }
    });
  }

  /**
   * Test if a connection is open
   *
   * @returns {boolean}
   */
  public isOpen(): boolean {
    return !!this.db;
  }

  /**
   * Runs a SQL statement with the specified parameters
   *
   * @param {string} sql - The SQL statment
   * @param {*} [params] - The parameters referenced in the statement; you can
   * provide multiple parameters as array
   * @returns {Promise<SqlRunResult>}
   */
  public async run(sql: string, params?: any): Promise<SqlRunResult> {
    return new Promise<SqlRunResult>((resolve, reject) => {
      // trace('run stmt=' + sql);
      // trace('>input: ' + JSON.stringify(params));
      if (!this.db) {
        reject(new Error('database connection not open'));
        return;
      }
      // tslint:disable-next-line: only-arrow-functions
      this.db.run(sql, params, function(err: Error): void {
        if (err) {
          reject(err);
        } else {
          // tslint:disable-next-line: no-invalid-this
          const res: SqlRunResult = {lastID: this.lastID, changes: this.changes};
          resolve(res);
        }
      });
    });
  }

  /**
   * Runs a SQL query with the specified parameters, fetching only the first row
   *
   * @param {string} sql - The DQL statement
   * @param {*} [params] - The parameters referenced in the statement; you can
   * provide multiple parameters as array
   * @returns {Promise<any>}
   */
  public async get(sql: string, params?: any): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      // trace('get stmt=' + sql);
      // trace('>input: ' + JSON.stringify(params));
      if (!this.db) {
        reject(new Error('database connection not open'));
        return;
      }
      this.db.get(sql, params, (err, row) => {
        if (err) {
          // trace('>error: ' + err.message);
          reject(err);
        } else {
          // trace('>succeeded: ' + JSON.stringify(row));
          resolve(row);
        }
      });
    });
  }

  /**
   * Runs a SQL query with the specified parameters, fetching all rows
   *
   * @param {string} sql - The DQL statement
   * @param {*} [params] - The parameters referenced in the statement; you can
   * provide multiple parameters as array
   * @returns {Promise<any[]>}
   */
  public async all(sql: string, params?: any): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
      // trace('all stmt=' + sql);
      // trace('>input: ' + JSON.stringify(params));
      if (!this.db) {
        reject(new Error('database connection not open'));
        return;
      }
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          // trace('>error: ' + err.message);
          reject(err);
        } else {
          // trace('>succeeded: ' + JSON.stringify(rows));
          resolve(rows);
        }
      });
    });
  }

  /**
   * Runs a SQL query with the specified parameters, fetching all rows
   * using a callback for each row
   *
   * @param {string} sql - The DQL statement
   * @param {*} [params] - The parameters referenced in the statement; you can
   * provide multiple parameters as array
   * @param {(err: Error, row: any) => void} [callback]
   * @returns {Promise<number>}
   */
  public async each(sql: string, params?: any, callback?: (err: Error, row: any) => void): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('database connection not open'));
        return;
      }
      this.db.each(sql, params, callback, (err: Error, count: number) => {
        if (err) {
          reject(err);
        } else {
          resolve(count);
        }
      });
    });
  }

  /**
   * Execute a SQL statement
   *
   * @param {string} sql - The SQL statement
   * @returns {Promise<void>}
   */
  public async exec(sql: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // trace('exec stmt=' + sql);
      if (!this.db) {
        reject(new Error('database connection not open'));
        return;
      }
      this.db.exec(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Prepare a SQL statement
   *
   * @param {string} sql - The SQL statement
   * @param {*} [params] - The parameters referenced in the statement; you can
   * provide multiple parameters as array
   * @returns {Promise<SqlStatement>}
   */
  public async prepare(sql: string, params?: any): Promise<SqlStatement> {
    return new Promise<SqlStatement>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('database connection not open'));
        return;
        }
      let dbstmt: Statement;
      dbstmt = this.db.prepare(sql, params, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(new SqlStatement(dbstmt));
        }
      });
    });
  }

  /**
   * serialized sqlite3 calls
   * if callback is provided, run callback in serialized mode
   * otherwise, switch connection to serialized mode
   *
   * @param {() => void} [callback]
   * @returns {void}
   */
  public serialize(callback?: () => void): void {
    if (!this.db) {
      throw new Error('database connection not open');
      }
    return this.db.serialize(callback);
  }

  /**
   * parallelized sqlite3 calls
   * if callback is provided, run callback in parallel mode
   * otherwise, switch connection to parallel mode
   *
   * @param {() => void} [callback]
   * @returns {void}
   */
  public parallelize(callback?: () => void): void {
    if (!this.db) {
      throw new Error('database connection not open');
      }
    return this.db.parallelize(callback);
  }

  /**
   * Run callback inside a database transaction
   *
   * @param {() => void} [callback]
   * @returns {void}
   */
  public async transactionalize<T>(callback: () => Promise<T>): Promise<T> {
    return this.run('BEGIN IMMEDIATE TRANSACTION')
        .then(callback)
        .then(async(res) => this.run('COMMIT TRANSACTION').then(async() => Promise.resolve(res)))
        .catch(async(err) => this.run('ROLLBACK TRANSACTION').then(async() => Promise.reject(err)));
  }

  // tslint:disable unified-signatures

  /**
   *
   *
   * @param {'trace'} event
   * @param {(sql: string) => void} listener
   * @returns {this}
   */
  public on(event: 'trace', listener: (sql: string) => void): this;
  /**
   *
   *
   * @param {'profile'} event
   * @param {(sql: string) => void} listener
   * @returns {this}
   */
  public on(event: 'profile', listener: (sql: string) => void): this;
  /**
   *
   *
   * @param {'error'} event
   * @param {(sql: string) => void} listener
   * @returns {this}
   */
  public on(event: 'error', listener: (sql: string) => void): this;
  /**
   *
   *
   * @param {'open'} event
   * @param {(sql: string) => void} listener
   * @returns {this}
   */
  public on(event: 'open', listener: (sql: string) => void): this;
  /**
   *
   *
   * @param {'close'} event
   * @param {(sql: string) => void} listener
   * @returns {this}
   */
  public on(event: 'close', listener: (sql: string) => void): this;
  /**
   *
   *
   * @param {string} event
   * @param {(sql: string) => void} listener
   * @returns {this}
   */
  public on(event: string, listener: (sql: string) => void): this {
    if (!this.db) {
      throw new Error('database connection not open');
    }
    this.db.on(event, listener);
    return this;
  }

  /**
   * Get the 'user_version' from the database
   *
   * @returns {Promise<number>}
   */
  public async getUserVersion(): Promise<number> {
    let userVersion = 0;
    try {
      const res = await this.get('PRAGMA user_version');
      userVersion = res.user_version;
    } catch (e) {
      // NOTE: should not happen
      /* istanbul ignore next */
      return Promise.reject(e);
      }
    return Promise.resolve(userVersion);
  }

  /**
   * Set the 'user_version' in the database
   *
   * @param {number} newver
   * @returns {Promise<void>}
   */
  public async setUserVersion(newver: number): Promise<void> {
    return this.exec(`PRAGMA user_version = ${newver}`);
  }

  /**
   * Set the execution mode to verbose to produce long stack traces. There is no way to reset this.
   * See https://github.com/mapbox/node-sqlite3/wiki/Debugging
   *
   * @param {number} newver
   * @returns {Promise<void>}
   */
  public static verbose(): void {
    sqlverbose();
  }

  /*
  @internal
  */
  public async openByPool(pool: SqlConnectionPool, databaseFile: string, mode?: number): Promise<void> {
    this.pool = pool;
    return new Promise<void>((resolve, reject) => {
      const db = new Database(databaseFile, mode || SQL_OPEN_DEFAULT, (err) => {
        if (err) {
          reject(err);
        } else {
          this.db = db;
          resolve();
        }
      });
    });
  }

  /*
  @internal
  */
  public async closeByPool(): Promise<void> {
    this.pool = undefined;
    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        resolve();
      } else {
        const db = this.db;
        this.db = undefined;
        db.close((err) => {
          db.removeAllListeners();
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
  public recycleByPool(pool: SqlConnectionPool, sqldb: SqlDatabase): void {
    if (!!sqldb.db) {
      sqldb.db.removeAllListeners();
      this.db = sqldb.db;
      this.pool = pool;
    }
    sqldb.db = undefined;
    sqldb.pool = undefined;
  }

  /*
  @internal
  */
  public getPool(): SqlConnectionPool|undefined {
    return this.pool;
  }
}
