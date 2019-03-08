/*
 *  for a description of the pragma setting see: https://www.sqlite.org/pragma.html
 *  for a description of the execution mode see: https://github.com/mapbox/node-sqlite3/wiki/Control-Flow
 */

export interface SqlDatabaseSettings {
  /*
   * PRAGMA schema.journal_mode = DELETE | TRUNCATE | PERSIST | MEMORY | WAL | OFF
   */
  journalMode?: string | string[];
  /*
   * PRAGMA busy_timeout = milliseconds
   */
  busyTimeout?: number;
  /*
   * PRAGMA schema.synchronous = OFF | NORMAL | FULL | EXTRA;
   */
  synchronous?: string | string[];
  /*
   * PRAGMA case_sensitive_like = TRUE | FALSE
   */
  caseSensitiveLike?: string;

  /*
   * PRAGMA foreign_keys = TRUE | FALSE
   */
  foreignKeys?: string;

  /*
   * PRAGMA ignore_check_constraints = TRUE | FALSE
   */
  ignoreCheckConstraints?: string;

  /*
   * PRAGMA query_only = TRUE | FALSE
   */
  queryOnly?: string;

  /*
   * PRAGMA read_uncommitted = TRUE | FALSE
   */
  readUncommitted?: string;

  /*
   * PRAGMA recursive_triggers = TRUE | FALSE
   */
  recursiveTriggers?: string;

  /*
   * PRAGMA schema.secure_delete = TRUE | FALSE | FAST
   */
  secureDelete?: string | string[];

  /*
   *  SERIALIZE | PARALLELIZE
   */
  executionMode?: string;
}
