import {SQL_DEFAULT_SCHEMA} from '../core/SqlDatabase';

// -----------------------------------------------------------------

export function quoteSimpleIdentifier(name: string): string {
  return '"' + name.replace(/\"/g, '""') + '"';
}

export function backtickQuoteSimpleIdentifier(name: string): string {
  return '`' + name.replace(/\`/g, '``') + '`';
}

// -----------------------------------------------------------------

export function quoteIdentifiers(name: string): string[] {
  return name.split('.').map((value) => quoteSimpleIdentifier(value));
}

export function quoteIdentifier(name: string): string {
  return quoteIdentifiers(name).join('.');
}

// -----------------------------------------------------------------

export function unqualifyIdentifier(name: string): string {
  return name.split('.').pop() as string;
}

export function quoteAndUnqualifyIdentifier(name: string): string {
  return quoteSimpleIdentifier(unqualifyIdentifier(name));
}

// -----------------------------------------------------------------

export function qualifiySchemaIdentifier(name: string, schema?: string): string {
  if (name.indexOf('.') !== -1) {
    /* istanbul ignore if */
    if (schema && name.split('.').shift() !== schema) {
      throw new Error(`failed to qualify '${name}' by '${schema}`);
    }
    return name;
  }
  schema = schema || SQL_DEFAULT_SCHEMA;
  return `${schema}.${name}`;
}


export function splitSchemaIdentifier(name: string): {identName: string, identSchema?: string} {
  const identifiers = name.split('.');

  if (identifiers.length >= 2) {
    return {identSchema: identifiers.shift(), identName: identifiers.join('.')};
  } else {
    return {identName: identifiers[0]};
  }
}
