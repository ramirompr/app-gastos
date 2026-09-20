import { describe, it, expect, vi } from 'vitest';

// getTopLevelCategory no usa supabase, pero ./categories lo importa a nivel
// de módulo (fetchUserCategories) — sin mockear, crear el cliente real
// explota en el entorno de test (env vars dummy, sin WebSocket en Node 18).
vi.mock('./supabase', () => ({ supabase: {} }));

import { getTopLevelCategory } from './categories';
import { makeCategory } from './test-utils/fixtures';

describe('getTopLevelCategory', () => {
  const parent = makeCategory({ id: 'parent', name: 'Comida', parent_id: null });
  const child = makeCategory({ id: 'child', name: 'Delivery', parent_id: 'parent' });
  const categories = [parent, child];

  it('devuelve la propia categoría si ya es de nivel superior', () => {
    expect(getTopLevelCategory(categories, 'parent')).toBe(parent);
  });

  it('devuelve el padre si la categoría es una subcategoría', () => {
    expect(getTopLevelCategory(categories, 'child')).toBe(parent);
  });

  it('devuelve undefined si el id no existe', () => {
    expect(getTopLevelCategory(categories, 'nope')).toBeUndefined();
  });

  it('devuelve la propia subcategoría si su padre no está en la lista', () => {
    const orphan = makeCategory({ id: 'orphan', name: 'Huérfana', parent_id: 'missing-parent' });
    expect(getTopLevelCategory([orphan], 'orphan')).toBe(orphan);
  });
});
