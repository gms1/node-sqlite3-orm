import {SqlDatabase, SQL_OPEN_DEFAULT} from './SqlDatabase';
import {Database} from 'sqlite3';


/**
 * A simple connection pool
 *
 * @export
 * @class SqlConnectionPool
 */
export class SqlConnectionPool {
  private databaseFile?: string;

  private mode?: number;

  private min?: number;

  private max?: number;

  private inPool: SqlDatabase[] = [];

  private inUse: Set<SqlDatabase>;

  /**
   * Creates an instance of SqlConnectionPool.
   *
   */
  constructor() {
    this.databaseFile = undefined;
    this.mode = undefined;
    this.inUse = new Set<SqlDatabase>();
  }


  /**
   * Open a database connection pool
   *
   * @param {string} databaseFile - The path to the database file or URI
   * filename (see SQL_MEMORY_DB_SHARED/SQL_MEMORY_DB_PRIVATE for an in-memory
   * database)
   * @param {number} [mode=SQL_OPEN_DEFAULT] - A bit flag combination of: SQL_OPEN_CREATE |
   * SQL_OPEN_READONLY | SQL_OPEN_READWRITE
   * @param {number} [min=1] minimum connections whihc should be opened by this connection pool
   * @param {number} [max=0] maximum connections which can be opened by this connection pool
   * @returns {Promise<void>}
   */
  open(databaseFile: string, mode: number = SQL_OPEN_DEFAULT, min: number = 1, max: number = 0):
      Promise<void> {
    return new Promise<void>(async(resolve, reject) => {
      try {
        await this.close();
        this.databaseFile = databaseFile;
        this.mode = mode;
        this.min = min;
        this.max = max;

        let promises: Promise<void>[] = [];

        for (let i = 0; i < this.min; i++) {
          let sqldb = new SqlDatabase();
          this.inPool.push(sqldb);
          promises.push(sqldb.openByPool(this, this.databaseFile, this.mode));
        }
        await Promise.all(promises);
        resolve();
      } catch (err) {
        this.inPool.length = 0;
        reject(err);
      }
    });
  }

  /**
   * Close the database connection pool
   *
   * @returns {Promise<void>}
   */
  close(): Promise<void> {
    return new Promise<void>(async(resolve, reject) => {
      try {
        if (this.inUse.size) {
          throw new Error(
              `failed to close connection pool because ${this.inUse.size} connections are in use`);
        }
        let promises: Promise<void>[] = [];
        this.inPool.forEach((value) => { promises.push(value.closeByPool()); });
        this.inPool.length = 0;
        await Promise.all(promises);
        this.databaseFile = undefined;
        this.mode = undefined;
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * get a connection from the pool
   *
   * @param {number} [timeout=0] The timeout to wait for a connection ( 0 is infinite )
   * @returns {Promise<SqlDatabase>}
   */
  get(timeout: number = 0): Promise<SqlDatabase> {
    return new Promise<SqlDatabase>(async(resolve, reject) => {
      try {
        /**
         *
         *
         * @returns
         */
        let cond = () => { return (this.inPool.length > 0); };
        if (!cond() && this.max && this.inUse.size >= this.max) {
          await wait(cond, timeout);
        }
        if (this.inPool.length > 0) {
          let sqldb = this.inPool.shift() as SqlDatabase;
          this.inUse.add(sqldb);
          resolve(sqldb);
          return;
        }
        let sqldb = new SqlDatabase();
        if (this.databaseFile === undefined) {
          throw new Error(`connection pool not opened`);
        }
        await sqldb.openByPool(this, this.databaseFile, this.mode);
        this.inUse.add(sqldb);
        resolve(sqldb);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * release a connection to the pool
   *
   * @param {SqlDatabase} sqldb
   * @returns {void}
   */
  release(sqldb: SqlDatabase): void {
    if (!this.inUse.has(sqldb)) {
      return;
    }
    this.inUse.delete(sqldb);

    // transfer wrapped database connection
    let olddb = sqldb.getDatabase();
    sqldb.setDatabase(undefined);

    let newsqldb = new SqlDatabase();
    newsqldb.setDatabase(olddb);
    this.inPool.push(newsqldb);
  }
}

// TODO: move this function or find a better one:
function wait(
    cond: () => boolean, timeout: number = 0,
    intervall: number = 100): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let counter = 0;
    /**
     *
     *
     * @returns
     */
    let timer = setInterval(() => {
      if (cond()) {
        clearInterval(timer);
        resolve();
        return;
      }
      if (timeout > 0 && (++counter * intervall) >= timeout) {
        clearInterval(timer);
        reject(new Error('timeout reached'));
        return;
      }
    }, intervall);
  });
}
