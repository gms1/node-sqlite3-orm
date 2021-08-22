import * as _dbg from 'debug';
import { wait } from '../utils/wait';

import { SqlConnectionPoolDatabase } from './SqlConnectionPoolDatabase';
import { SQL_OPEN_CREATE, SQL_OPEN_DEFAULT, SqlDatabase } from './SqlDatabase';
import { SqlDatabaseSettings } from './SqlDatabaseSettings';

const debug = _dbg('sqlite3orm:pool');

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

  private readonly inPool: SqlConnectionPoolDatabase[];

  private readonly inUse: Set<SqlConnectionPoolDatabase>;

  private settings?: SqlDatabaseSettings;

  private _opening?: Promise<void>;

  get poolSize(): number {
    return this.inPool.length;
  }
  get openSize(): number {
    return this.inUse.size;
  }

  /**
   * Creates an instance of SqlConnectionPool.
   *
   */
  constructor(public readonly name: string = '') {
    this.databaseFile = undefined;
    this.mode = SQL_OPEN_DEFAULT;
    this.inUse = new Set<SqlConnectionPoolDatabase>();
    this.inPool = [];
    this.min = this.max = 0;
  }

  /**
   * Open a database connection pool
   *
   * @param databaseFile - The path to the database file or URI
   * @param [mode=SQL_OPEN_DEFAULT] - A bit flag combination of: SQL_OPEN_CREATE |
   * SQL_OPEN_READONLY | SQL_OPEN_READWRITE
   * @param [min=1] minimum connections which should be opened by this connection pool
   * @param [max=0] maximum connections which can be opened by this connection pool
   * @returns A promise
   */
  async open(
    databaseFile: string,
    mode: number = SQL_OPEN_DEFAULT,
    min: number = 1,
    max: number = 0,
    settings?: SqlDatabaseSettings,
  ): Promise<void> {
    if (this._opening) {
      try {
        await this._opening;
        if (this.databaseFile === databaseFile && (mode & ~SQL_OPEN_CREATE) === this.mode) {
          // already opened
          return;
        }
      } catch (err) {}
    }
    this._opening = this.openInternal(databaseFile, mode, min, max, settings);
    try {
      await this._opening;
    } catch (err) {
      return Promise.reject(err);
    } finally {
      this._opening = undefined;
    }
    return;
  }

  protected async openInternal(
    databaseFile: string,
    mode: number = SQL_OPEN_DEFAULT,
    min: number = 1,
    max: number = 0,
    settings?: SqlDatabaseSettings,
  ): Promise<void> {
    try {
      await this.close();
    } catch (err) {}
    try {
      this.databaseFile = databaseFile;
      this.mode = mode;
      this.min = min;
      this.max = max;
      this.settings = settings;
      this.inPool.length = 0;

      const promises: Promise<void>[] = [];

      if (this.min < 1) {
        this.min = 1;
      }
      let sqldb = new SqlConnectionPoolDatabase();
      await sqldb.openByPool(this, this.databaseFile, this.mode, this.settings);
      this.inPool.push(sqldb);

      this.mode &= ~SQL_OPEN_CREATE;
      for (let i = 1; i < this.min; i++) {
        sqldb = new SqlConnectionPoolDatabase();
        promises.push(sqldb.openByPool(this, this.databaseFile, this.mode, this.settings));
        this.inPool.push(sqldb);
      }
      await Promise.all(promises);
      if (this.name.length) {
        SqlConnectionPool.openNamedPools.set(this.name, this);
      }
      debug(
        `pool ${this.name}: opened: ${this.inUse.size} connections open (${this.inPool.length} in pool)`,
      );
    } catch (err) {
      try {
        await this.close();
      } catch (_ignore) {}
      debug(`pool ${this.name}: opening ${databaseFile} failed: ${err.message}`);
      return Promise.reject(err);
    }
  }

  /**
   * Close the database connection pool
   *
   * @returns A promise
   */
  async close(): Promise<void> {
    try {
      if (this.databaseFile) {
        if (this.inUse.size) {
          debug(
            `pool ${this.name}: closing: forcibly closing ${this.inUse.size} opened connections (${this.inPool.length} in pool)`,
          );
        } else {
          debug(
            `pool ${this.name}: closing: ${this.inUse.size} connections open (${this.inPool.length} in pool)`,
          );
        }
      }
      if (this.name.length) {
        SqlConnectionPool.openNamedPools.delete(this.name);
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
      debug(`pool ${this.name}: closing failed: ${err.message}`);
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
      let sqldb: SqlConnectionPoolDatabase | undefined;
      const cond = () => this.inPool.length > 0;
      if (this.max > 0 && !cond() && this.inUse.size >= this.max) {
        await wait(cond, timeout);
      }
      if (this.inPool.length > 0) {
        sqldb = this.inPool.shift() as SqlConnectionPoolDatabase;
        this.inUse.add(sqldb);
        debug(
          `pool ${this.name}: ${this.inUse.size} connections open (${this.inPool.length} in pool)`,
        );
        return sqldb;
      }
      if (!this.databaseFile) {
        throw new Error(`connection pool not opened`);
      }
      sqldb = new SqlConnectionPoolDatabase();
      await sqldb.openByPool(this, this.databaseFile, this.mode, this.settings);
      this.inUse.add(sqldb);
      debug(
        `pool ${this.name}: ${this.inUse.size} connections open (${this.inPool.length} in pool)`,
      );
      return sqldb;
    } catch (err) {
      debug(`pool ${this.name}: getting connection from pool failed: ${err.message}`);
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
    if (!(sqldb instanceof SqlConnectionPoolDatabase) || this !== sqldb.pool) {
      // not opened by this pool
      return sqldb.close();
    }
    this.inUse.delete(sqldb);
    /* istanbul ignore else */
    if (sqldb.isOpen()) {
      if (sqldb.dirty || this.inPool.length >= this.min) {
        // close database connection
        await sqldb.closeByPool();
      } else {
        // transfer database connection
        const newsqldb = new SqlConnectionPoolDatabase();
        await newsqldb.recycleByPool(this, sqldb, this.settings);
        this.inPool.push(newsqldb);
      }
      debug(
        `pool ${this.name}: ${this.inUse.size} connections open (${this.inPool.length} in pool)`,
      );
    }
  }

  static readonly openNamedPools: Map<string, SqlConnectionPool> = new Map<
    string,
    SqlConnectionPool
  >();
}
