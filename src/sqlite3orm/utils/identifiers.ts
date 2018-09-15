import {SQL_DEFAULT_SCHEMA} from '../core/SqlDatabase';

export function backtickQuoteSimpleIdentifier(name: string): string {
  return '`' + name.replace(/\`/g, '``') + '`';
}

export function quoteSimpleIdentifier(name: string): string {
  return '"' + name.replace(/\"/g, '""') + '"';
}

export function quoteIdentifiers(name: string): string[] {
  return name.split('.').map((value) => quoteSimpleIdentifier(value));
}

export function quoteIdentifier(name: string): string {
  return quoteIdentifiers(name).join('.');
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

export function splitIdentifiers(name: string): {identName: string, identSchema?: string} {
  const identifiers = name.split('.');

  if (identifiers.length === 2) {
    return {identSchema: identifiers[0], identName: identifiers[1]};
  } else {
    return {identName: identifiers[0]};
  }
}
