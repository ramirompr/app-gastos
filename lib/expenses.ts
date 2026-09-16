import { supabase } from './supabase';
import { Expense } from './types';
import { calculateAmountsInBothCurrencies } from './exchange-rates';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Marca un gasto compartido como saldado: reduce el monto del gasto en la
 * parte que te devolvieron, manteniendo la proporción ARS/USD original
 * (misma cotización con la que se cargó, sin volver a consultarla).
 */
export async function settleSharedExpense(expense: Expense): Promise<Expense> {
  if (expense.amount_ars == null || expense.amount_usd == null) {
    throw new Error(
      'Este gasto todavía tiene la cotización pendiente, no se puede liquidar hasta que se resuelva.'
    );
  }

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

/**
 * Busca gastos del usuario con la cotización pendiente (exchange_rate_used
 * null, porque la API del dólar falló al cargarlos) y reintenta resolverla.
 * Pensado para llamarse en segundo plano al abrir el dashboard. Devuelve
 * cuántos se pudieron resolver.
 */
export async function resolvePendingExchangeRates(userId: string): Promise<number> {
  const { data: pending } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .is('exchange_rate_used', null);

  if (!pending || pending.length === 0) return 0;

  const results = await Promise.allSettled(
    pending.map(async (expense) => {
      const { amount_ars, amount_usd, exchange_rate_used } = await calculateAmountsInBothCurrencies(
        expense.amount,
        expense.currency,
        new Date(`${expense.date}T00:00:00`)
      );
      const { error } = await supabase
        .from('expenses')
        .update({ amount_ars, amount_usd, exchange_rate_used })
        .eq('id', expense.id);
      if (error) throw error;
    })
  );
  // Los que fallan (rejected) siguen pendientes y se reintentan la próxima
  // vez que se abra el dashboard.
  return results.filter((r) => r.status === 'fulfilled').length;
}
