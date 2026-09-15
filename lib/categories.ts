import { Category } from './types';

/**
 * Devuelve la categoría de nivel superior de un gasto: la propia categoría si
 * ya es de nivel superior, o su padre si es una subcategoría.
 */
export function getTopLevelCategory(categories: Category[], categoryId: string): Category | undefined {
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return undefined;
  if (!cat.parent_id) return cat;
  return categories.find((c) => c.id === cat.parent_id) ?? cat;
}
