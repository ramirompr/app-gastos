import { Expense } from './types';

export const PENDING_RATE_LABEL = 'Cotización pendiente';

/** Elige el monto en ARS o en USD según el modo de visualización activo. */
export function pickAmount(amountArs: number, amountUsd: number, showUsd: boolean): number {
  return showUsd ? amountUsd : amountArs;
}

/** Formatea un monto ya elegido (ARS o USD) para mostrar en pantalla. */
export function formatMoney(amount: number, showUsd: boolean): string {
  if (showUsd) {
    return `US$ ${amount.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `$ ${Math.round(amount).toLocaleString('es-AR')}`;
}

/**
 * Formatea el monto principal de un gasto. Si todavía no se pudo dolarizar
 * (exchange_rate_used null), muestra un aviso en vez de un monto.
 */
export function formatExpenseAmount(
  expense: Pick<Expense, 'amount_ars' | 'amount_usd' | 'exchange_rate_used'>,
  showUsd: boolean
): string {
  if (expense.exchange_rate_used == null) return PENDING_RATE_LABEL;
  return formatMoney(pickAmount(expense.amount_ars ?? 0, expense.amount_usd ?? 0, showUsd), showUsd);
}

/**
 * Convierte partner_share (guardado en la moneda original del gasto) a su
 * equivalente en ARS y USD, usando la cotización con la que se cargó ese
 * gasto. Devuelve null si ese gasto todavía tiene la cotización pendiente.
 */
export function partnerShareInArsUsd(expense: Expense): { ars: number; usd: number } | null {
  if (expense.exchange_rate_used == null) return null;
  const share = expense.partner_share ?? 0;
  if (expense.currency === 'ARS') {
    return { ars: share, usd: share / expense.exchange_rate_used };
  }
  return { ars: share * expense.exchange_rate_used, usd: share };
}

/** Formatea la parte de partner_share en ARS/USD, o el aviso de pendiente. */
export function formatPartnerShare(expense: Expense, showUsd: boolean): string {
  const share = partnerShareInArsUsd(expense);
  if (!share) return PENDING_RATE_LABEL;
  return formatMoney(pickAmount(share.ars, share.usd, showUsd), showUsd);
}
