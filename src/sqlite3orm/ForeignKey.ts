import {Field} from './Field';

/**
 * Class holding a foreign key definition
 *
 * @export
 * @class Table
 */
export class ForeignKey {
  name: string;
  refTableName: string;
  refColumns: string[] = [];
  fields: Field[] = [];
  selectCondition?: string;

  public constructor(name: string, refTableName: string) {
    this.name = name;
    this.refTableName = refTableName;
  }
}
