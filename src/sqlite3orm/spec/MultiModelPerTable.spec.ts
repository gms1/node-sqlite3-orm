// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class
import {table, id, index, fk, field, schema, getModelMetadata} from '..';

// ---------------------------------------------

describe('test multiple models per table', () => {

  // ---------------------------------------------
  it('both models using all options', async (done) => {
    try {
      @table({name: 'MPT1:T1', withoutRowId: false, autoIncrement: true})
      class Model1 {
        @id({name: 'MPT1:ID', dbtype: 'INTEGER NOT NULL', isJson: false})
        id!: number;

        @index('MPT1:IDX1', false)
        @fk('MPT1:FK1', 'MPT1:T1', 'MPT1:ID')
        @field({name: 'MPT1:COL', dbtype: 'INTEGER', isJson: false})
        col?: number;
      }
      @table({name: 'MPT1:T1', withoutRowId: false, autoIncrement: true})
      class Model2 {
        @id({name: 'MPT1:ID', dbtype: 'INTEGER NOT NULL', isJson: false})
        id!: number;

        @index('MPT1:IDX1', false)
        @fk('MPT1:FK1', 'MPT1:T1', 'MPT1:ID')
        @field({name: 'MPT1:COL', dbtype: 'INTEGER', isJson: false})
        col?: number;
      }
    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('first model using default options, second model all options', async (done) => {
    try {
      @table({name: 'MPT2:T1'})
      class Model1 {
        @id({name: 'MPT2:ID'})
        id!: number;

        @field({name: 'MPT2:COL'})
        col?: number;
      }
      @table({name: 'MPT2:T1', withoutRowId: false, autoIncrement: true})
      class Model2 {
        @id({name: 'MPT2:ID', dbtype: 'INTEGER NOT NULL', isJson: false})
        id!: number;

        @index('MPT2:IDX1', false)
        @fk('MPT2:FK1', 'MPT2:T1', 'MPT2:ID')
        @field({name: 'MPT2:COL', dbtype: 'INTEGER', isJson: false})
        col?: number;
      }
    } catch (err) {
      fail(err);
    }
    done();
  });

  // ---------------------------------------------
  it('first model using all options, second model default options', async (done) => {
    try {
      @table({name: 'MPT3:T1', withoutRowId: false, autoIncrement: true})
      class Model1 {
        @id({name: 'MPT3:ID', dbtype: 'INTEGER NOT NULL', isJson: false})
        id!: number;

        @index('MPT3:IDX1', false)
        @fk('MPT3:FK1', 'MPT3:T1', 'MPT3:ID')
        @field({name: 'MPT3:COL', dbtype: 'INTEGER', isJson: false})
        col?: number;
      }
      @table({name: 'MPT3:T1'})
      class Model2 {
        @id({name: 'MPT3:ID'})
        id!: number;

        @index('MPT3:IDX1')
        col?: number;
      }
    } catch (err) {
      fail(err);
    }
    done();
  });


  // ---------------------------------------------
  it('both models using default options', async (done) => {
    try {
      @table({name: 'MPT4A:T1'})
      class Model1 {
        @id({name: 'MPT4A:ID'})
        id!: number;

        @field({name: 'MPT4A:COL'}) @index('MPT4A:IDX1')
        col?: number;
      }
      @table({name: 'MPT4A:T1'})
      class Model2 {
        @id({name: 'MPT4A:ID'})
        id!: number;

        @field({name: 'MPT4A:COL'}) @index('MPT4A:IDX1')
        col?: number;
      }
      let testTable = schema().getTable('MPT4A:T1');
      let sqlCreateTable = testTable.getCreateTableStatement();
      let sqlCreateIndex = testTable.getCreateIndexStatement('MPT4A:IDX1');
      let testModel = getModelMetadata(Model1);
      let stmts = testModel.statementsText;
    } catch (err) {
      fail(err);
    }
    done();
  });
  // ---------------------------------------------
  it('conflicting withoutRowId-table option', async (done) => {
    try {
      @table({name: 'MPT4:T1', withoutRowId: false})
      class Model1 {
        @id({name: 'MPT4:ID'})
        id!: number;
      }
      @table({name: 'MPT4:T1', withoutRowId: true})
      class Model2 {
        @id({name: 'MPT4:ID'})
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
      @table({name: 'MPT5:T1', autoIncrement: false})
      class Model1 {
        @id({name: 'MPT5:ID'})
        id!: number;
      }
      @table({name: 'MPT5:T1', autoIncrement: true})
      class Model2 {
        @id({name: 'MPT5:ID'})
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
      @table({name: 'MPT6:T1'})
      class Model1 {
        @id({name: 'MPT6:ID'})
        id!: number;
      }
      @table({name: 'MPT6:T1'})
      class Model2 {
        @field({name: 'MPT6:ID'})
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
      @table({name: 'MPT7:T1'})
      class Model1 {
        @field({name: 'COL', dbtype: 'INTEGER'})
        col!: number;
      }
      @table({name: 'MPT7:T1'})
      class Model2 {
        @field({name: 'COL', dbtype: 'TEXT'})
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
      @table({name: 'MPT8:T1'})
      class Model1 {
        @field({name: 'MPT8:COL', isJson: true})
        col!: number;
      }
      @table({name: 'MPT8:T1'})
      class Model2 {
        @field({name: 'MPT8:COL', isJson: false})
        col!: number;
      }
      fail('should have thrown');
    } catch (err) {
      expect((err.message as string).indexOf('json')).not.toBe(-1);
    }
    done();
  });

  // ---------------------------------------------
  it('conflicting index options', async (done) => {
    try {
      @table({name: 'MPT9:T1'})
      class Model1 {
        @id({name: 'MPT9:ID'})
        id!: number;

        @index('MPT9:IDX1', false) @field({name: 'MPT9:COL'})
        col?: number;
      }
      @table({name: 'MPT9:T1'})
      class Model2 {
        @id({name: 'MPT9:ID'})
        id!: number;

        @index('MPT9:IDX1', true) @field({name: 'MPT9:COL'})
        col?: number;
      }
      fail('should have thrown');
    } catch (err) {
      expect((err.message as string).indexOf('index')).not.toBe(-1);
    }
    done();
  });

  // ---------------------------------------------
  it('conflicting foreign key options', async (done) => {
    try {
      @table({name: 'MPT10:T1'})
      class Model1 {
        @id({name: 'MPT10:ID'})
        id!: number;

        @fk('MPT10:FK1', 'MPT10:T1', 'MPT10:ID2') @field({name: 'MPT10:COL'})
        col?: number;
      }
      @table({name: 'MPT10:T1'})
      class Model2 {
        @id({name: 'MPT10:ID'})
        id!: number;

        @fk('MPT10:FK1', 'MPT10:T1', 'MPT10:ID') @field({name: 'MPT10:COL'})
        col?: number;
      }
      fail('should have thrown');
    } catch (err) {
      expect((err.message as string).indexOf('foreign')).not.toBe(-1);
    }
    done();
  });

});
