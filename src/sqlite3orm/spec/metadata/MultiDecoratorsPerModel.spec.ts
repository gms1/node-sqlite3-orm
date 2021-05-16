/* eslint-disable @typescript-eslint/no-unused-vars */
import { field, fk, id, index, table } from '../..';

// ---------------------------------------------

describe('test multiple decorators per model', () => {
  // ---------------------------------------------
  it('two table decorators', async () => {
    try {
      @table({ name: 'MDM1:T' })
      @table({ name: 'MDM1:T' })
      class Model {
        @id({ name: 'MDM1:ID' })
        id!: number;

        @field({ name: 'MDM1:COL' })
        col?: number;
      }
      fail('should have thrown');
    } catch (err) {
      expect((err.message as string).indexOf('already')).not.toBe(-1);
    }
  });

  // ---------------------------------------------
  it('two field decorators', async () => {
    try {
      @table({ name: 'MDM2:T' })
      class Model {
        @id({ name: 'MDM2:ID' })
        id!: number;

        @field({ name: 'MDM2:COL' })
        @field({ name: 'MDM2:COL2' })
        col?: number;
      }
      fail('should have thrown');
    } catch (err) {
      expect((err.message as string).indexOf('already')).not.toBe(-1);
    }
  });

  // ---------------------------------------------
  it('two index decorators', async () => {
    try {
      @table({ name: 'MDM3:T' })
      class Model {
        @id({ name: 'MDM3:ID' })
        id!: number;

        @field({ name: 'MDM3:COL' })
        @index('MPT3:IDX1')
        @index('MPT3:IDX1')
        col?: number;
      }
      fail('should have thrown');
    } catch (err) {
      expect((err.message as string).indexOf('already')).not.toBe(-1);
    }
  });

  // ---------------------------------------------
  it('conflicting foreign key decorators', async () => {
    try {
      @table({ name: 'MDM4:T' })
      class Model {
        @id({ name: 'MDM4:ID' })
        id!: number;

        @field({ name: 'MDM4:COL' })
        @fk('MDM4:FK1', 'MDM4:T1', 'MDM4:ID')
        @fk('MDM4:FK1', 'MDM4:T1', 'MDM4:ID')
        col?: number;
      }
      fail('should have thrown');
    } catch (err) {
      expect((err.message as string).indexOf('already')).not.toBe(-1);
    }
  });
});
