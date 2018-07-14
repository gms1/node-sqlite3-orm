
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
