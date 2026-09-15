import { supabase } from './supabase';
import { Expense } from './types';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Marca un gasto compartido como saldado: reduce el monto del gasto en la
 * parte que te devolvieron, manteniendo la proporción ARS/USD original
 * (misma cotización con la que se cargó, sin volver a consultarla).
 */
export async function settleSharedExpense(expense: Expense): Promise<Expense> {
  const partnerShare = expense.partner_share ?? 0;
  const scale = expense.amount > 0 ? (expense.amount - partnerShare) / expense.amount : 1;

  const { data, error } = await supabase
    .from('expenses')
    .update({
      is_settled: true,
      settled_at: new Date().toISOString(),
      amount: round2(expense.amount - partnerShare),
      amount_ars: round2(expense.amount_ars * scale),
      amount_usd: round2(expense.amount_usd * scale),
    })
    .eq('id', expense.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}
