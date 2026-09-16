import { supabase } from './supabase';
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

/** Trae todas las categorías (y subcategorías) del usuario. */
export async function fetchUserCategories(userId: string): Promise<Category[]> {
  const { data } = await supabase.from('categories').select('*').eq('user_id', userId);
  return data ?? [];
}
