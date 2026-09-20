import { describe, it, expect } from 'vitest';
import {
  pickAmount,
  formatMoney,
  formatExpenseAmount,
  partnerShareInArsUsd,
  formatPartnerShare,
  PENDING_RATE_LABEL,
} from './format-money';
import { makeExpense } from './test-utils/fixtures';

describe('pickAmount', () => {
  it('elige el monto en USD cuando showUsd es true', () => {
    expect(pickAmount(1000, 1, true)).toBe(1);
  });

  it('elige el monto en ARS cuando showUsd es false', () => {
    expect(pickAmount(1000, 1, false)).toBe(1000);
  });
});

describe('formatMoney', () => {
  it('en ARS redondea al entero y usa "." como separador de miles, sin decimales', () => {
    expect(formatMoney(12345.6, false)).toBe('$ 12.346');
  });

  it('en ARS antepone el símbolo $', () => {
    expect(formatMoney(500, false)).toBe('$ 500');
  });

  it('en USD siempre muestra 2 decimales con coma decimal', () => {
    expect(formatMoney(1234.5, true)).toBe('US$ 1.234,50');
  });

  it('en USD redondea a 2 decimales', () => {
    expect(formatMoney(1.005, true)).toBe('US$ 1,01');
  });
});

describe('formatExpenseAmount', () => {
  it('muestra el aviso de pendiente si exchange_rate_used es null, sin importar los montos', () => {
    const expense = makeExpense({ exchange_rate_used: null, amount_ars: 999, amount_usd: 999 });
    expect(formatExpenseAmount(expense, false)).toBe(PENDING_RATE_LABEL);
    expect(formatExpenseAmount(expense, true)).toBe(PENDING_RATE_LABEL);
  });

  it('formatea el monto en la moneda pedida cuando la cotización ya se resolvió', () => {
    const expense = makeExpense({ exchange_rate_used: 1000, amount_ars: 5000, amount_usd: 5 });
    expect(formatExpenseAmount(expense, false)).toBe('$ 5.000');
    expect(formatExpenseAmount(expense, true)).toBe('US$ 5,00');
  });
});

describe('partnerShareInArsUsd', () => {
  it('devuelve null si la cotización está pendiente', () => {
    const expense = makeExpense({ exchange_rate_used: null, partner_share: 100 });
    expect(partnerShareInArsUsd(expense)).toBeNull();
  });

  it('trata partner_share null como 0', () => {
    const expense = makeExpense({ exchange_rate_used: 1000, partner_share: null, currency: 'ARS' });
    expect(partnerShareInArsUsd(expense)).toEqual({ ars: 0, usd: 0 });
  });

  it('convierte partner_share en ARS a su equivalente en USD con la cotización guardada', () => {
    const expense = makeExpense({ currency: 'ARS', exchange_rate_used: 1000, partner_share: 2000 });
    expect(partnerShareInArsUsd(expense)).toEqual({ ars: 2000, usd: 2 });
  });

  it('convierte partner_share en USD a su equivalente en ARS con la cotización guardada', () => {
    const expense = makeExpense({ currency: 'USD', exchange_rate_used: 1000, partner_share: 2 });
    expect(partnerShareInArsUsd(expense)).toEqual({ ars: 2000, usd: 2 });
  });
});

describe('formatPartnerShare', () => {
  it('muestra el aviso de pendiente si la cotización no se resolvió', () => {
    const expense = makeExpense({ exchange_rate_used: null, partner_share: 100 });
    expect(formatPartnerShare(expense, false)).toBe(PENDING_RATE_LABEL);
  });

  it('formatea la parte del otro en la moneda pedida', () => {
    const expense = makeExpense({ currency: 'ARS', exchange_rate_used: 1000, partner_share: 3000 });
    expect(formatPartnerShare(expense, false)).toBe('$ 3.000');
    expect(formatPartnerShare(expense, true)).toBe('US$ 3,00');
  });
});
