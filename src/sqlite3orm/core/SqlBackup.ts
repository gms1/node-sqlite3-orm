/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

// online backup
// https://github.com/mapbox/node-sqlite3/pull/1116
// TODO(Backup API): typings not yet available
import * as _dbg from 'debug';
const debug = _dbg('sqlite3orm:backup');

export class SqlBackup {
  private readonly backup: any;

  get idle(): boolean {
    return this.backup.idle;
  }

  get completed(): boolean {
    return this.backup.completed;
  }

  get failed(): boolean {
    return this.backup.failed;
  }

  /**
   * Returns an integer with the remaining number of pages left to copy
   * Returns -1 if `step` not yet called
   *
   */
  get remaining(): number {
    return this.backup.remaining;
  }

  /**
   * Returns an integer with the total number of pages
   * Returns -1 if `step` not yet called
   *
   */
  get pageCount(): number {
    return this.backup.pageCount;
  }

  /**
   * Returns the progress (percentage completion)
   *
   */
  get progress(): number {
    const pageCount = this.pageCount;
    const remaining = this.remaining;
    if (pageCount === -1 || remaining === -1) {
      return 0;
    }
    return pageCount === 0 ? 100 : ((pageCount - remaining) / pageCount) * 100;
  }

  /**
   * Creates an instance of SqlBackup.
   *
   * @param backup
   */
  constructor(backup: any) {
    this.backup = backup;
    debug(`backup initialized: page count: ${this.pageCount}`);
  }

  step(pages: number = -1): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      /* istanbul ignore if */
      if (!this.backup) {
        const err = new Error('backup handle not open');
        debug(`step '${pages}' failed: ${err.message}`);
        reject(err);
        return;
      }
      this.backup.step(pages, (err: any) => {
        /* istanbul ignore if */
        if (err) {
          debug(`step '${pages}' failed: ${err.message}`);
          reject(err);
        }
        debug(`step '${pages}' succeeded`);
        resolve();
      });
    });
  }

  finish(): void {
    debug(`finished`);
    this.backup.finish();
  }
}
