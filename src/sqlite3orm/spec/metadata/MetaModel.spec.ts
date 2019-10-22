// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class
import {
  field,
  fk,
  getModelMetadata,
  id,
  index,
  METADATA_MODEL_KEY,
  MetaModel,
  schema,
  table,
} from '../..';

// ---------------------------------------------

describe('test metaModels', () => {
  // ---------------------------------------------
  it('both models using all options', async (done) => {
    try {
      @table({ name: 'MPT1:T1', withoutRowId: false, autoIncrement: true })
      class Model1 {
        @id({ name: 'MPT1:ID', dbtype: 'INTEGER NOT NULL', isJson: false })
        id!: number;

        @index('MPT1:IDX1', false)
        @fk('MPT1:FK1', 'MPT1:T1', 'MPT1:ID')
        @field({ name: 'MPT1:COL', dbtype: 'INTEGER', isJson: false, dateInMilliSeconds: false })
        col?: Date;
      }
      @table({ name: 'MPT1:T1', withoutRowId: false, autoIncrement: true })
      class Model2 {
        @id({ name: 'MPT1:ID', dbtype: 'INTEGER NOT NULL', isJson: false })
        id!: number;

        @index('MPT1:IDX1', false)
        @fk('MPT1:FK1', 'MPT1:T1', 'MPT1:ID')
        @field({ name: 'MPT1:COL', dbtype: 'INTEGER', isJson: false, dateInMilliSeconds: false })
        col?: Date;
      }
    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('first model using default options, second model all options', async (done) => {
    try {
      @table({ name: 'MPT2:T1' })
      class Model1 {
        @id({ name: 'MPT2:ID' })
        id!: number;

        @field({ name: 'MPT2:COL' })
        col?: Date;
      }
      @table({ name: 'MPT2:T1', withoutRowId: false, autoIncrement: true })
      class Model2 {
        @id({ name: 'MPT2:ID', dbtype: 'INTEGER NOT NULL', isJson: false })
        id!: number;

        @index('MPT2:IDX1', false)
        @fk('MPT2:FK1', 'MPT2:T1', 'MPT2:ID')
        @field({ name: 'MPT2:COL', dbtype: 'INTEGER', isJson: false, dateInMilliSeconds: false })
        col?: Date;
      }
    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('first model using all options, second model default options', async (done) => {
    try {
      @table({ name: 'MPT3:T1', withoutRowId: false, autoIncrement: true })
      class Model1 {
        @id({ name: 'MPT3:ID', dbtype: 'INTEGER NOT NULL', isJson: false })
        id!: number;

        @index('MPT3:IDX1', false)
        @fk('MPT3:FK1', 'MPT3:T1', 'MPT3:ID')
        @field({ dbtype: 'INTEGER', isJson: false, dateInMilliSeconds: false })
        col?: Date;
      }
      @table({ name: 'MPT3:T1' })
      class Model2 {
        @id({ name: 'MPT3:ID' })
        id!: number;

        @index('MPT3:IDX1')
        col?: Date;
      }
    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('both models using default options', async (done) => {
    try {
      @table({ name: 'MPT4A:T1' })
      class Model1 {
        @id({ name: 'MPT4A:ID' })
        id!: number;

        @field({ name: 'MPT4A:COL' })
        @index('MPT4A:IDX1')
        col?: Date;
      }
      @table({ name: 'MPT4A:T1' })
      class Model2 {
        @id({ name: 'MPT4A:ID' })
        id!: number;

        @field({ name: 'MPT4A:COL' })
        @index('MPT4A:IDX1')
        col?: Date;
      }
      let testTable = schema().getTable('MPT4A:T1');
      let sqlCreateTable = testTable.getCreateTableStatement(true);
      let sqlCreateIndex = testTable.getCreateIndexStatement('MPT4A:IDX1');
      let testModel = getModelMetadata(Model1);
    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('conflicting withoutRowId-table option', async (done) => {
    try {
      @table({ name: 'MPT4:T1', withoutRowId: false })
      class Model1 {
        @id({ name: 'MPT4:ID' })
        id!: number;
      }
      @table({ name: 'MPT4:T1', withoutRowId: true })
      class Model2 {
        @id({ name: 'MPT4:ID' })
        id!: number;
      }
      fail('should have thrown');
    } catch (err) {
      expect((err.message as string).indexOf('withoutRowId')).not.toBe(-1);
    }
    done();
  });

  // ---------------------------------------------
  it('conflicting autoincrement-table option', async (done) => {
    try {
      @table({ name: 'MPT5:T1', autoIncrement: false })
      class Model1 {
        @id({ name: 'MPT5:ID' })
        id!: number;
      }
      @table({ name: 'MPT5:T1', autoIncrement: true })
      class Model2 {
        @id({ name: 'MPT5:ID' })
        id!: number;
      }
      fail('should have thrown');
    } catch (err) {
      expect((err.message as string).indexOf('autoIncrement')).not.toBe(-1);
    }
    done();
  });

  // ---------------------------------------------
  it('conflicting identity-field option', async (done) => {
    try {
      @table({ name: 'MPT6:T1' })
      class Model1 {
        @id({ name: 'MPT6:ID' })
        id!: number;
      }
      @table({ name: 'MPT6:T1' })
      class Model2 {
        @field({ name: 'MPT6:ID' })
        id!: number;
      }
      fail('should have thrown');
    } catch (err) {
      expect((err.message as string).indexOf('identity')).not.toBe(-1);
    }
    done();
  });

  // ---------------------------------------------
  it('conflicting dbtype-field option', async (done) => {
    try {
      @table({ name: 'MPT7:T1' })
      class Model1 {
        @field({ name: 'COL', dbtype: 'INTEGER' })
        col!: number;
      }
      @table({ name: 'MPT7:T1' })
      class Model2 {
        @field({ name: 'COL', dbtype: 'TEXT' })
        col!: number;
      }
      fail('should have thrown');
    } catch (err) {
      expect((err.message as string).indexOf('dbtype')).not.toBe(-1);
    }
    done();
  });

  // ---------------------------------------------
  it('conflicting isJson-field option', async (done) => {
    try {
      @table({ name: 'MPT8:T1' })
      class Model1 {
        @field({ name: 'MPT8:COL', isJson: true })
        col!: number;
      }
      @table({ name: 'MPT8:T1' })
      class Model2 {
        @field({ name: 'MPT8:COL', isJson: false })
        col!: number;
      }
      fail('should have thrown');
    } catch (err) {
      expect((err.message as string).indexOf('json')).not.toBe(-1);
    }
    done();
  });

  // ---------------------------------------------
  it('conflicting dateInMilliSeconds-field option', async (done) => {
    try {
      @table({ name: 'MPT8A:T1' })
      class Model1 {
        @field({ name: 'MPT8A:COL', dateInMilliSeconds: true })
        col!: Date;
      }
      @table({ name: 'MPT8A:T1' })
      class Model2 {
        @field({ name: 'MPT8A:COL', dateInMilliSeconds: false })
        col!: Date;
      }
      fail('should have thrown');
    } catch (err) {
      expect((err.message as string).indexOf('dateInMilliSeconds')).not.toBe(-1);
    }
    done();
  });

  // ---------------------------------------------
  it('conflicting index options (single model)', async (done) => {
    try {
      @table({ name: 'MPT9:T1' })
      class Model1 {
        @id({ name: 'MPT9:ID' })
        id!: number;

        @index('MPT9:IDX1', false)
        @field({ name: 'MPT9:COL' })
        col?: number;

        @index('MPT9:IDX1', true)
        col2?: number;
      }
    } catch (err) {
      expect((err.message as string).indexOf('index')).not.toBe(-1);
    }
    done();
  });

  // ---------------------------------------------
  it('non-conflicting index options (single model)', async (done) => {
    try {
      @table({ name: 'MPT9A:T1' })
      class Model1 {
        @id({ name: 'MPT9A:ID' })
        id!: number;

        @index('MPT9A:IDX1')
        @field({ name: 'MPT9A:COL' })
        col?: number;

        @index('MPT9A:IDX1', true)
        col2?: number;
      }
    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('conflicting index options (multi model)', async (done) => {
    try {
      @table({ name: 'MPT9B:T1' })
      class Model1 {
        @id({ name: 'MPT9B:ID' })
        id!: number;

        @index('MPT9B:IDX1', false)
        @field({ name: 'MPT9B:COL' })
        col?: number;
      }
      @table({ name: 'MPT9B:T1' })
      class Model2 {
        @id({ name: 'MPT9B:ID' })
        id!: number;

        @index('MPT9B:IDX1', true)
        @field({ name: 'MPT9B:COL' })
        col?: number;
      }
      fail('should have thrown');
    } catch (err) {
      expect((err.message as string).indexOf('index')).not.toBe(-1);
    }
    done();
  });

  it('non conflicting index options (multi model)', async (done) => {
    try {
      @table({ name: 'MPT9C:T1' })
      class Model1 {
        @id({ name: 'MPT9C:ID' })
        id!: number;

        @index('MPT9C:IDX1', false)
        @field({ name: 'MPT9C:COL' })
        col?: number;
      }
      @table({ name: 'MPT9C:T1' })
      class Model2 {
        @id({ name: 'MPT9C:ID' })
        id!: number;

        @index('MPT9C:IDX1', false)
        @field({ name: 'MPT9C:COL' })
        col?: number;
      }
    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('conflicting foreign key options (single model)', async (done) => {
    try {
      @table({ name: 'MPT10:T1' })
      class Model1 {
        @id({ name: 'MPT10:ID' })
        id!: number;

        @fk('MPT10:FK1', 'MPT10:T2', 'MPT10:ID')
        @field({ name: 'MPT10:COL' })
        col?: number;

        @fk('MPT10:FK1', 'MPT10:T1', 'MPT10:ID')
        col2?: number;
      }
    } catch (err) {
      expect((err.message as string).indexOf('foreign')).not.toBe(-1);
    }
    done();
  });

  // ---------------------------------------------
  it('conflicting foreign key options (multi model)', async (done) => {
    try {
      @table({ name: 'MPT10:T1' })
      class Model1 {
        @id({ name: 'MPT10:ID' })
        id!: number;

        @fk('MPT10:FK1', 'MPT10:T1', 'MPT10:ID2')
        @field({ name: 'MPT10:COL' })
        col?: number;
      }
      @table({ name: 'MPT10:T1' })
      class Model2 {
        @id({ name: 'MPT10:ID' })
        id!: number;

        @fk('MPT10:FK1', 'MPT10:T1', 'MPT10:ID')
        @field({ name: 'MPT10:COL' })
        col?: number;
      }
      fail('should have thrown');
    } catch (err) {
      expect((err.message as string).indexOf('foreign')).not.toBe(-1);
    }
    done();
  });

  // ---------------------------------------------
  it('model destroy', async (done) => {
    try {
      @table({ name: 'MPT11:T1' })
      class Model1 {
        @id({ name: 'MPT11:ID' })
        id!: number;

        @field({ name: 'MPT11:COL' })
        col?: number;
      }
      @table({ name: 'MPT11:T1' })
      class Model2 {
        @id({ name: 'MPT11:ID' })
        id!: number;

        @field({ name: 'MPT11:COL' })
        col?: number;
      }
      expect(schema().hasTable('MPT11:T1')).toBeTruthy(`table not found`);
      const metaModel1 = Reflect.getMetadata(METADATA_MODEL_KEY, Model1.prototype) as MetaModel;
      const metaModel2 = Reflect.getMetadata(METADATA_MODEL_KEY, Model2.prototype) as MetaModel;
      metaModel1.destroy();
      metaModel2.destroy();
      expect(schema().hasTable('MPT11:T1')).toBeFalsy(`table found`);
      metaModel1.destroy();
    } catch (err) {
      fail(`should not throw: ${err.message}`);
    }

    done();
  });

  // ---------------------------------------------
  it('model default types', async (done) => {
    try {
      @table({ name: 'MPT12:T1' })
      class Model {
        @id({ name: 'MPT12:ID' })
        id!: number;

        @field({ name: 'MPT12:COLNUM' })
        colNum?: number;

        @field({ name: 'MPT12:COLNUM_NN', notNull: true })
        colNumNN!: number;

        @field({ name: 'MPT12:COLSTR' })
        colString?: string;

        @field({ name: 'MPT12:COLSTR_NN', notNull: true })
        colStringNN!: string;

        @field({ name: 'MPT12:COLBOOL' })
        colBool?: boolean;

        @field({ name: 'MPT12:COLBOOL_NN', notNull: true })
        colBoolNN!: boolean;

        @field({ name: 'MPT12:COLDATE' })
        colDate?: boolean;

        @field({ name: 'MPT12:COLDATE_NN', notNull: true })
        colDateNN!: boolean;
      }
      expect(schema().hasTable('MPT12:T1')).toBeTruthy(`table not found`);
      const metaModel1 = Reflect.getMetadata(METADATA_MODEL_KEY, Model.prototype) as MetaModel;

      expect(metaModel1.table.fields.length).toBe(9);

      expect(metaModel1.table.fields[0].name).toBe('MPT12:ID');
      expect(metaModel1.table.fields[0].dbtype).toBe('INTEGER NOT NULL');

      expect(metaModel1.table.fields[1].name).toBe('MPT12:COLNUM');
      expect(metaModel1.table.fields[1].dbtype).toBe('REAL');

      expect(metaModel1.table.fields[2].name).toBe('MPT12:COLNUM_NN');
      expect(metaModel1.table.fields[2].dbtype).toBe('REAL NOT NULL');

      expect(metaModel1.table.fields[3].name).toBe('MPT12:COLSTR');
      expect(metaModel1.table.fields[3].dbtype).toBe('TEXT');

      expect(metaModel1.table.fields[4].name).toBe('MPT12:COLSTR_NN');
      expect(metaModel1.table.fields[4].dbtype).toBe('TEXT NOT NULL');

      expect(metaModel1.table.fields[5].name).toBe('MPT12:COLBOOL');
      expect(metaModel1.table.fields[5].dbtype).toBe('INTEGER');

      expect(metaModel1.table.fields[6].name).toBe('MPT12:COLBOOL_NN');
      expect(metaModel1.table.fields[6].dbtype).toBe('INTEGER NOT NULL');

      expect(metaModel1.table.fields[7].name).toBe('MPT12:COLDATE');
      expect(metaModel1.table.fields[7].dbtype).toBe('INTEGER');

      expect(metaModel1.table.fields[8].name).toBe('MPT12:COLDATE_NN');
      expect(metaModel1.table.fields[8].dbtype).toBe('INTEGER NOT NULL');
    } catch (err) {
      fail(`should not throw: ${err.message}`);
    }

    done();
  });

  // ---------------------------------------------
  it('model type affinity', async (done) => {
    try {
      @table({ name: 'MPT13:T1' })
      class Model1 {
        @id()
        col!: number;

        @field()
        b?: boolean;

        @field()
        d?: Date;

        @field()
        n?: number;

        @field()
        s?: string;
      }

      const metaModel1 = Reflect.getMetadata(METADATA_MODEL_KEY, Model1.prototype) as MetaModel;

      expect(metaModel1.table.fields.length).toBe(5);
      expect(metaModel1.table.fields[0].dbTypeInfo.typeAffinity).toBe('INTEGER'); // number (id)
      expect(metaModel1.table.fields[1].dbTypeInfo.typeAffinity).toBe('INTEGER'); // boolean
      expect(metaModel1.table.fields[2].dbTypeInfo.typeAffinity).toBe('INTEGER'); // date
      expect(metaModel1.table.fields[3].dbTypeInfo.typeAffinity).toBe('REAL'); // number (no-id)
      expect(metaModel1.table.fields[4].dbTypeInfo.typeAffinity).toBe('TEXT'); // string
    } catch (err) {
      fail('err');
    }
    done();
  });
});
