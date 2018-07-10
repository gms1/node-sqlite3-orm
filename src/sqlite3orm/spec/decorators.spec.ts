// tslint:disable prefer-const max-classes-per-file no-unused-variable no-unnecessary-class
import {field, fk, id, index, table} from '../index';

// ---------------------------------------------

describe('test schema', () => {

  // ---------------------------------------------
  it('expect decorating static property as field to throw', (done) => {
    try {
      @table({name: 'TABLE_USING_STATIC_PROPERTY_FOR_FIELD', autoIncrement: true})
      class TableUsingStaticProperyForField {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'}) static id: number = 5;
        constructor() {}
      }
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });

  // ---------------------------------------------
  it('expect decorating static property as index to throw', (done) => {
    try {
      @table({name: 'TABLE_USING_STATIC_PROPERTY_FOR_INDEX', autoIncrement: true})
      class TableUsingStaticProperyForIndex {
        @index('PARENTIDX') static parentId?: number;

        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'}) id: number;

        constructor() {
          this.id = 0;
        }
      }
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });

  // ---------------------------------------------
  it('expect decorating static property as foreign key to throw', (done) => {
    try {
      @table({name: 'TABLE_USING_STATIC_PROPERTY_FOR_FK', autoIncrement: true})
      class TableUsingStaticProperyForFk {
        @fk('PARENTIDX', 'ANOTHER_TABLE', 'ANOTHER_FIELD') static parentId?: number;

        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'}) id: number;

        constructor() {
          this.id = 0;
        }
      }
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });


  // ---------------------------------------------
  it('expect decorating duplicate indexes to throw', (done) => {
    try {
      @table({name: 'TABLE_USING_DUPLICATE_INDEX_ON_FIELD', autoIncrement: true})
      class TableUsingDuplicateIndexOnField {
        @index('PARENTIDX') @index('PARENTIDX') @field({name: 'PARENTID', dbtype: 'INTEGER'})
        parentId?: number;

        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'}) id: number;

        constructor() {
          this.id = 0;
        }
      }
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });

  // ---------------------------------------------
  it('expect decorating class for different tables to throw', (done) => {
    try {
      @table({name: 'TABLE1_FOR_SAME_CLASS', autoIncrement: true})
      @table({name: 'TABLE2_FOR_SAME_CLASS', autoIncrement: true})
      class ClassUsingDifferentTables {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'}) id: number;

        constructor() {
          this.id = 0;
        }
      }
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });


  // ---------------------------------------------
  it('expect decorating duplicate foreign key constraint names to throw', (done) => {
    try {
      @table({name: 'PARENT_TABLE_FOR_DUPLICATE_FKS'})
      class ParentTableForDuplicateFKs {
        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'}) id: number;
        @id({name: 'ID2', dbtype: 'INTEGER NOT NULL'}) id2: number;

        constructor() {
          this.id = 0;
          this.id2 = 0;
        }
      }

      @table({name: 'TABLE_USING_DUPLICATE_FK', autoIncrement: true})
      class TableUsingDuplicateFKs {
        @fk('PARENTIDX', 'PARENT_TABLE_FOR_DUPLICATE_FKS', 'ID')
        @fk('PARENTIDX', 'PARENT_TABLE_FOR_DUPLICATE_FKS', 'ID2')
        @field({name: 'PARENTID1', dbtype: 'INTEGER'})
        parentId1?: number;

        @id({name: 'ID', dbtype: 'INTEGER NOT NULL'}) id: number;

        constructor() {
          this.id = 0;
        }
      }
      fail('should have thrown');
    } catch (err) {
    }
    done();
  });

});
