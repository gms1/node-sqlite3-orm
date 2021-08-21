/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as _dbg from 'debug';
import {
  Database,
  OPEN_CREATE,
  OPEN_PRIVATECACHE,
  OPEN_READONLY,
  OPEN_READWRITE,
  OPEN_SHAREDCACHE,
  OPEN_URI,
  verbose as sqlverbose,
} from 'sqlite3';

import { SqlDatabaseSettings } from './SqlDatabaseSettings';
import { SqlRunResult, SqlStatement } from './SqlStatement';

export const SQL_OPEN_READONLY = OPEN_READONLY;
export const SQL_OPEN_READWRITE = OPEN_READWRITE;
export const SQL_OPEN_CREATE = OPEN_CREATE;

// introduced by https://github.com/mapbox/node-sqlite3/pull/1078
export const SQL_OPEN_URI = OPEN_URI;
export const SQL_OPEN_SHAREDCACHE = OPEN_SHAREDCACHE;
export const SQL_OPEN_PRIVATECACHE = OPEN_PRIVATECACHE;

export const SQL_DEFAULT_SCHEMA = 'main';

// see https://www.sqlite.org/inmemorydb.html
export const SQL_MEMORY_DB_PRIVATE = ':memory:';
export const SQL_MEMORY_DB_SHARED = 'file:sqlite3orm?mode=memory&cache=shared';

const debug = _dbg('sqlite3orm:database');

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
  protected static lastId: number = 0;

  protected db?: Database;
  protected dbId?: number;

  dirty?: boolean;

  /**
   * Open a database connection
   *
   * @param databaseFile - The path to the database file or URI
   * @param [mode=SQL_OPEN_DEFAULT] - A bit flag combination of: SQL_OPEN_CREATE |
   * SQL_OPEN_READONLY | SQL_OPEN_READWRITE
   * @returns A promise
   */
  public open(databaseFile: string, mode?: number, settings?: SqlDatabaseSettings): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const db = new Database(databaseFile, mode || SQL_OPEN_DEFAULT, (err) => {
        if (err) {
          debug(`opening connection to ${databaseFile} failed: ${err.message}`);
          reject(err);
        } else {
          this.db = db;
          this.dbId = SqlDatabase.lastId++;
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

  /**
   * Close the database connection
   *
   * @returns {Promise<void>}
   */
  public close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        resolve();
      } else {
        const db = this.db;
        debug(`${this.dbId}: close`);
        this.db = undefined;
        this.dbId = undefined;
        db.close((err) => {
          db.removeAllListeners();
          /* istanbul ignore if */
          if (err) {
            debug(`closing connection failed: ${err.message}`);
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
   * @param sql - The SQL statment
   * @param [params] - The parameters referenced in the statement; you can
   * provide multiple parameters as array
   * @returns A promise
   */
  public run(sql: string, params?: any): Promise<SqlRunResult> {
    return new Promise<SqlRunResult>((resolve, reject) => {
      // trace('run stmt=' + sql);
      // trace('>input: ' + JSON.stringify(params));
      /* istanbul ignore if */
      if (!this.db) {
        reject(new Error('database connection not open'));
        return;
      }
      debug(`${this.dbId}: sql: ${sql}`);
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;
      this.db.run(sql, params, function(err: Error): void {
        // do not use arrow function for this callback
        // the below 'this' should not reference our self
        if (err) {
          debug(
            `${self.dbId}: failed sql: ${err.message}
${sql}\nparams: `,
            params,
          );
          reject(err);
        } else {
          const res: SqlRunResult = { lastID: this.lastID, changes: this.changes };
          resolve(res);
        }
      });
    });
  }

  /**
   * Runs a SQL query with the specified parameters, fetching only the first row
   *
   * @param sql - The DQL statement
   * @param [params] - The parameters referenced in the statement; you can
   * provide multiple parameters as array
   * @returns A promise
   */
  public get(sql: string, params?: any): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      // trace('get stmt=' + sql);
      // trace('>input: ' + JSON.stringify(params));
      /* istanbul ignore if */
      if (!this.db) {
        reject(new Error('database connection not open'));
        return;
      }
      debug(`${this.dbId}: sql: ${sql}`);
      this.db.get(sql, params, (err, row) => {
        if (err) {
          debug(`${this.dbId}: failed sql: ${err.message}
${sql}`);
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
   * @param sql - The DQL statement
   * @param [params] - The parameters referenced in the statement; you can
   * provide multiple parameters as array
   * @returns A promise
   */
  public all(sql: string, params?: any): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
      // trace('all stmt=' + sql);
      // trace('>input: ' + JSON.stringify(params));
      /* istanbul ignore if */
      if (!this.db) {
        reject(new Error('database connection not open'));
        return;
      }
      debug(`${this.dbId}: sql: ${sql}`);
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          debug(`${this.dbId}: failed sql: ${err.message}
${sql}`);
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
   * @param sql - The DQL statement
   * @param [params] - The parameters referenced in the statement; you can
   * provide multiple parameters as array
   * @param [callback] - The callback function
   * @returns A promise
   */
  public each(
    sql: string,
    params?: any,
    callback?: (err: Error, row: any) => void,
  ): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      /* istanbul ignore if */
      if (!this.db) {
        reject(new Error('database connection not open'));
        return;
      }
      debug(`${this.dbId}: sql: ${sql}`);
      this.db.each(sql, params, callback, (err: Error, count: number) => {
        if (err) {
          debug(`${this.dbId}: failed sql: ${err.message}
${sql}`);
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
   * @param sql - The SQL statement
   * @returns A promise
   */
  public exec(sql: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // trace('exec stmt=' + sql);
      /* istanbul ignore if */
      if (!this.db) {
        reject(new Error('database connection not open'));
        return;
      }
      debug(`${this.dbId}: sql: ${sql}`);
      this.db.exec(sql, (err) => {
        if (err) {
          debug(`${this.dbId}: failed sql: ${err.message}
${sql}`);
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
   * @param sql - The SQL statement
   * @param [params] - The parameters referenced in the statement; you can
   * provide multiple parameters as array
   * @returns A promise
   */
  public prepare(sql: string, params?: any): Promise<SqlStatement> {
    return new Promise<SqlStatement>((resolve, reject) => {
      /* istanbul ignore if */
      if (!this.db) {
        reject(new Error('database connection not open'));
        return;
      }
      debug(`${this.dbId}: sql: ${sql}`);
      const dbstmt = this.db.prepare(sql, params, (err) => {
        if (err) {
          debug(`${this.dbId}: failed sql: ${err.message}
${sql}`);
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
   * @param [callback]
   */
  public serialize(callback?: () => void): void {
    /* istanbul ignore if */
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
   * @param [callback]
   */
  public parallelize(callback?: () => void): void {
    /* istanbul ignore if */
    if (!this.db) {
      throw new Error('database connection not open');
    }
    return this.db.parallelize(callback);
  }

  /**
   * Run callback inside a database transaction
   *
   * @param [callback]
   */
  public transactionalize<T>(callback: () => Promise<T>): Promise<T> {
    return this.run('BEGIN IMMEDIATE TRANSACTION')
      .then(callback)
      .then((res) => this.run('COMMIT TRANSACTION').then(() => Promise.resolve(res)))
      .catch((err) => this.run('ROLLBACK TRANSACTION').then(() => Promise.reject(err)));
  }

  /**
   *
   * @param event
   * @param listener
   */
  public on(event: 'trace', listener: (sql: string) => void): this;
  /**
   *
   *
   * @param event
   * @param listener
   */
  public on(event: 'profile', listener: (sql: string, time: number) => void): this;
  /**
   *
   *
   * @param event
   * @param listener
   */
  public on(event: 'error', listener: (err: Error) => void): this;
  /**
   *
   *
   * @param event
   * @param listener
   */
  public on(event: 'close', listener: () => void): this;
  /**
   *
   *
   * @param event
   * @param listener
   */
  public on(event: string, listener: (...args: any[]) => void): this {
    /* istanbul ignore if */
    if (!this.db) {
      throw new Error('database connection not open');
    }
    this.db.on(event, listener);
    return this;
  }

  /**
   * Get the 'user_version' from the database
   * @returns A promise of the user version number
   */
  public getUserVersion(): Promise<number> {
    return this.get('PRAGMA user_version').then((res) => res.user_version);
  }

  /**
   * Set the 'user_version' in the database
   *
   * @param newver
   * @returns A promise
   */
  public setUserVersion(newver: number): Promise<void> {
    return this.exec(`PRAGMA user_version = ${newver}`);
  }

  /**
   * Get the 'cipher_version' from the database
   * @returns A promise of the cipher version
   */
  public getCipherVersion(): Promise<string | undefined> {
    return this.get('PRAGMA cipher_version').then((res) =>
      /* istanbul ignore next */ res ? res.cipher_version : undefined,
    );
  }

  protected applySettings(settings: SqlDatabaseSettings): Promise<void> {
    /* istanbul ignore if */
    if (!this.db) {
      return Promise.reject(new Error('database connection not open'));
    }
    const promises: Promise<void>[] = [];
    try {
      /* istanbul ignore if */
      if (settings.cipherCompatibility) {
        this._addPragmaSetting(promises, 'cipher_compatibility', settings.cipherCompatibility);
      }
      /* istanbul ignore if */
      if (settings.key) {
        this._addPragmaSetting(promises, 'key', settings.key);
      }
      /* istanbul ignore else */
      if (settings.journalMode) {
        this._addPragmaSchemaSettings(promises, 'journal_mode', settings.journalMode);
      }
      /* istanbul ignore else */
      if (settings.busyTimeout) {
        this._addPragmaSetting(promises, 'busy_timeout', settings.busyTimeout);
      }
      /* istanbul ignore else */
      if (settings.synchronous) {
        this._addPragmaSchemaSettings(promises, 'synchronous', settings.synchronous);
      }
      /* istanbul ignore else */
      if (settings.caseSensitiveLike) {
        this._addPragmaSetting(promises, 'case_sensitive_like', settings.caseSensitiveLike);
      }
      /* istanbul ignore else */
      if (settings.foreignKeys) {
        this._addPragmaSetting(promises, 'foreign_keys', settings.foreignKeys);
      }
      /* istanbul ignore else */
      if (settings.ignoreCheckConstraints) {
        this._addPragmaSetting(
          promises,
          'ignore_check_constraints',
          settings.ignoreCheckConstraints,
        );
      }
      /* istanbul ignore else */
      if (settings.queryOnly) {
        this._addPragmaSetting(promises, 'query_only', settings.queryOnly);
      }
      /* istanbul ignore else */
      if (settings.readUncommitted) {
        this._addPragmaSetting(promises, 'read_uncommitted', settings.readUncommitted);
      }
      /* istanbul ignore else */
      if (settings.recursiveTriggers) {
        this._addPragmaSetting(promises, 'recursive_triggers', settings.recursiveTriggers);
      }
      /* istanbul ignore else */
      if (settings.secureDelete) {
        this._addPragmaSchemaSettings(promises, 'secure_delete', settings.secureDelete);
      }
      if (settings.executionMode) {
        switch (settings.executionMode.toUpperCase()) {
          case 'SERIALIZE':
            this.serialize();
            break;
          case 'PARALLELIZE':
            this.parallelize();
            break;
          default:
            throw new Error(
              `failed to read executionMode setting: ${settings.executionMode.toString()}`,
            );
        }
      } else {
        this.parallelize();
      }
    } catch (err) {
      return Promise.reject(err);
    }
    if (promises.length) {
      return Promise.all(promises).then(() => {});
    }
    return Promise.resolve();
  }

  protected _addPragmaSchemaSettings(
    promises: Promise<void>[],
    pragma: string,
    setting: string | string[],
  ): void {
    if (Array.isArray(setting)) {
      setting.forEach((val) => {
        this._addPragmaSetting(promises, pragma, val, true);
      });
    } else {
      this._addPragmaSetting(promises, pragma, setting, true);
    }
  }

  protected _addPragmaSetting(
    promises: Promise<void>[],
    pragma: string,
    setting: string | number,
    schemaSupport: boolean = false,
  ): void {
    if (typeof setting === 'number') {
      promises.push(this.exec(`PRAGMA ${pragma} = ${setting}`));
      return;
    }
    if (schemaSupport) {
      const splitted = setting.split('.');
      switch (splitted.length) {
        case 1:
          promises.push(this.exec(`PRAGMA ${pragma} = ${setting.toUpperCase()}`));
          return;
        case 2:
          promises.push(
            this.exec(`PRAGMA ${splitted[0]}.${pragma} = ${splitted[1].toUpperCase()}`),
          );
          return;
      }
      throw new Error(`failed to read ${pragma} setting: ${setting.toString()}`);
    } else {
      promises.push(this.exec(`PRAGMA ${pragma} = ${setting}`));
    }
  }

  /**
   * Set the execution mode to verbose to produce long stack traces. There is no way to reset this.
   * See https://github.com/mapbox/node-sqlite3/wiki/Debugging
   *
   * @param newver
   */
  public static verbose(): void {
    sqlverbose();
  }
}
