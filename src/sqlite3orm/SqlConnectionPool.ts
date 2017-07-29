import {SqlDatabase, SQL_OPEN_DEFAULT} from './SqlDatabase';


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
  async open(databaseFile: string, mode: number = SQL_OPEN_DEFAULT, min: number = 1, max: number = 0): Promise<void> {
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
  async close(): Promise<void> {
    return new Promise<void>(async(resolve, reject) => {
      try {
        let promises: Promise<void>[] = [];
        this.inPool.forEach((value) => { promises.push(value.closeByPool()); });
        this.inPool.length = 0;
        this.inUse.forEach((value) => { promises.push(value.closeByPool()); });
        this.inUse.clear();
        await Promise.all(promises);
        this.databaseFile = undefined;
        this.mode = SQL_OPEN_DEFAULT;
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
  async get(timeout: number = 0): Promise<SqlDatabase> {
    return new Promise<SqlDatabase>(async(resolve, reject) => {
      try {
        let sqldb: SqlDatabase|undefined;
        let cond = () => this.inPool.length > 0;
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
        if (this.max > 0) {
          this.inUse.add(sqldb);
        }
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
    if (this !== sqldb.getPool()) {
      // not opened by this pool
      return;
    }
    if (this.max > 0 && this.inUse.has(sqldb)) {
      this.inUse.delete(sqldb);
    }
    if (sqldb.isOpen()) {
      // transfer database connection
      let newsqldb = new SqlDatabase();
      newsqldb.recycleByPool(this, sqldb);
      this.inPool.push(newsqldb);
    }
  }
}

// TODO: move this function or find a better one:
async function wait(cond: () => boolean, timeout: number = 0, intervall: number = 100): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let counter = 0;
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
