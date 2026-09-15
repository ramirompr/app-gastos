import { Expense } from './types';

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
  return `${Math.round(amount).toLocaleString('es-AR')} $`;
}

/**
 * Convierte partner_share (guardado en la moneda original del gasto) a su
 * equivalente en ARS y USD, usando la cotización con la que se cargó ese gasto.
 */
export function partnerShareInArsUsd(expense: Expense): { ars: number; usd: number } {
  const share = expense.partner_share ?? 0;
  if (expense.currency === 'ARS') {
    return { ars: share, usd: share / expense.exchange_rate_used };
  }
  return { ars: share * expense.exchange_rate_used, usd: share };
}
