import {quotedIdentifierName} from './utils';
import {Table} from './Table';
import {schema} from './Schema';

export class TableReference {
  constraintName: string;

  get quotedConstraintName(): string {
    return quotedIdentifierName(this.constraintName);
  }

  tableName: string;

  get table(): Table|undefined {
    return schema().hasTable(this.tableName);
  }

  constructor(constraintName: string, tableName: string) {
    this.constraintName = constraintName;
    this.tableName = tableName;
  }
}
