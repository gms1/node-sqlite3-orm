import {SQL_DEFAULT_SCHEMA} from './SqlDatabase';

export function getQualifiedIdentifierName(name: string): string {
  if (name.indexOf('.') >= 0) {
    return name;
  }
  return SQL_DEFAULT_SCHEMA + '.' + name;
}


export function quotedIdentifierName(name: string): string {
  return '"' + name.replace(/["]/g, '""') + '"';
}

export function quotedQualifiedIdentifierName(name: string): string {
  return name.split('.').map((value) => quotedIdentifierName(value)).join('.');
}

export function unqualifiedIdentifierName(name: string): string {
  return name.split('.').pop() as string;
}

export function quotedUnqualifiedIdentifierName(name: string): string {
  const identifier = name.split('.').pop();
  return quotedIdentifierName(identifier as string);
}
