# TODOs

## connection options to enable certain settings so be set automatically on login

* pragma settings:

  e.g. to enable foreign keys by default if a connection has been opened
  PRAGMA foreign_keys = boolean;

  [see pragma](https://www.sqlite.org/pragma.html)

  list of interesting pragmas:

  * case_sensitive_like
  * defer_foreign_keys
  * ignore_check_constraints
  * query_only
  * read_uncommitted
  * recursive_triggers
  * reverse_unordered_selects
  * schema.secure_delete = boolean|FAST

  * other?

* configure(option: "busyTimeout", value: number): void;

## run "PRAGMA optimize"

recommendation:

* timer for long running applications
* before closing a database connection

## implement additional options for @fk decorator

* ON DELETE/UPDATE
  * NO ACTION
  * RESTRICT
  * SET NULL
  * SET DEFAULT
  * CASCADE

## support for sqlite3 expressions for @field and @index decorators

## implement a @view decorator?

## other todo?
