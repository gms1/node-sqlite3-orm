import {SQL_DEFAULT_SCHEMA} from '../SqlDatabase';


export function quoteSimpleIdentifier(name: string): string {
  return '"' + name.replace(/["]/g, '""') + '"';
}

export function quoteIdentifier(name: string): string {
  return name.split('.').map((value) => quoteSimpleIdentifier(value)).join('.');
}

export function unqualifyIdentifier(name: string): string {
  return name.split('.').pop() as string;
}

export function qualifiyIdentifier(name: string): string {
  if (name.indexOf('.') !== -1) {
    return name;
  }
  return SQL_DEFAULT_SCHEMA + '.' + name;
}

export function quoteAndUnqualiyIdentifier(name: string): string {
  return quoteSimpleIdentifier(unqualifyIdentifier(name));
}

/*

export function quoteAndQualifyIdentifier(name: string): string {
  return quoteIdentifier(qualifiyIdentifier(name));
}
*/
