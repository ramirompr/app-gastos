import { vi } from 'vitest';

export interface QueryResult<T = unknown> {
  data: T;
  error: unknown;
}

const CHAINABLE_METHODS = [
  'select',
  'insert',
  'update',
  'delete',
  'upsert',
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'is',
  'in',
  'not',
  'order',
  'limit',
  'range',
] as const;

/**
 * Imita la cadena fluida de un query builder de supabase-js: cada método
 * encadenable devuelve el mismo objeto, y el objeto entero es "thenable"
 * (awaitable) resolviendo al resultado fijo que le pasamos. `single` y
 * `maybeSingle` también resuelven ahí porque en el código real son el
 * último eslabón de la cadena antes del await.
 */
export function createQueryBuilder<T = unknown>(result: QueryResult<T>) {
  const builder: Record<string, unknown> = {};
  for (const method of CHAINABLE_METHODS) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (onFulfilled: (r: QueryResult<T>) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}

/**
 * Mock de `supabase.from(table)` que devuelve, para cada tabla, un
 * resultado fijo o una cola de resultados (uno por llamada sucesiva a la
 * misma tabla, útil cuando un mismo test hace más de un query a la tabla).
 */
export function createSupabaseMock(fromResults: Record<string, QueryResult | QueryResult[]>) {
  const callCounts: Record<string, number> = {};
  const from = vi.fn((table: string) => {
    const entry = fromResults[table];
    if (entry === undefined) {
      throw new Error(`createSupabaseMock: no hay resultado configurado para la tabla "${table}"`);
    }
    let result: QueryResult;
    if (Array.isArray(entry)) {
      const i = callCounts[table] ?? 0;
      result = entry[Math.min(i, entry.length - 1)];
      callCounts[table] = i + 1;
    } else {
      result = entry;
    }
    return createQueryBuilder(result);
  });
  return { from };
}
