import {MetaProperty} from './MetaProperty';
import {AutoMap} from './utils/AutoMap';
import {TableOpts} from './decorators';
import {Table} from './Table';
import {schema} from './Schema';

export class MetaModel {
  public readonly properties: AutoMap<string|symbol, MetaProperty>;
  public readonly table: Table;

  constructor(public readonly name: string) {
    this.properties = new AutoMap<string|symbol, MetaProperty>(
        `meta model '${this.name}'`, 'property', (propKey) => new MetaProperty(this.name, propKey));
    this.table = new Table(this.name);
  }

  buildTableDefinition(opts: TableOpts): void {
    const newTableName = opts.name || this.name;

    if (!!this.table.name && newTableName !== this.table.name) {
      throw new Error(
          `failed to map class '${
                                  this.name
                                }' to table name '${
                                                    newTableName
                                                  }': This class is already mapped to the table '${this.table.name}'`);
    }


    this.table.name = newTableName;
    if (!!opts.withoutRowId) {
      this.table.withoutRowId = true;
    }
    if (!!opts.autoIncrement) {
      this.table.autoIncrement = true;
    }
    this.properties.map.forEach((prop) => {
      prop.buildFieldDefinition(this.table);
    });
    schema().addTable(this.table);
  }
}
