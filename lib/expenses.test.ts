import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createQueryBuilder } from './test-utils/supabase-mock';
import { makeExpense } from './test-utils/fixtures';

const { fromMock, invalidateAppDataMock, calculateAmountsMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  invalidateAppDataMock: vi.fn(),
  calculateAmountsMock: vi.fn(),
}));
vi.mock('./supabase', () => ({ supabase: { from: fromMock } }));
vi.mock('./app-data', () => ({ invalidateAppData: invalidateAppDataMock }));
vi.mock('./exchange-rates', () => ({ calculateAmountsInBothCurrencies: calculateAmountsMock }));

import { settleSharedExpense, deleteExpense, resolvePendingExchangeRates } from './expenses';

beforeEach(() => {
  fromMock.mockReset();
  invalidateAppDataMock.mockReset();
  calculateAmountsMock.mockReset();
});

describe('settleSharedExpense', () => {
  it('rechaza si el gasto todavía tiene la cotización pendiente', async () => {
    const expense = makeExpense({ amount_ars: null, amount_usd: null });
    await expect(settleSharedExpense(expense)).rejects.toThrow(/cotización pendiente/);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('usa partner_share como monto devuelto por defecto', async () => {
    const expense = makeExpense({ amount: 1000, amount_ars: 1000, amount_usd: 1, partner_share: 400 });
    const builder = createQueryBuilder({ data: { ...expense, is_settled: true }, error: null });
    fromMock.mockReturnValueOnce(builder);

    await settleSharedExpense(expense);

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_settled: true,
        partner_share: 400,
        amount: 600,
        amount_ars: 600,
        amount_usd: 0.6,
      })
    );
  });

  it('usa actualReturnedAmount en vez del partner_share esperado cuando se pasa', async () => {
    const expense = makeExpense({ amount: 1000, amount_ars: 1000, amount_usd: 1, partner_share: 400 });
    const builder = createQueryBuilder({ data: expense, error: null });
    fromMock.mockReturnValueOnce(builder);

    await settleSharedExpense(expense, 250);

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ partner_share: 250, amount: 750, amount_ars: 750, amount_usd: 0.75 })
    );
  });

  it('permite un monto devuelto de 0 sin reducir el gasto (queda saldado en $0 devueltos)', async () => {
    const expense = makeExpense({ amount: 1000, amount_ars: 1000, amount_usd: 1, partner_share: 800 });
    const builder = createQueryBuilder({ data: expense, error: null });
    fromMock.mockReturnValueOnce(builder);

    await settleSharedExpense(expense, 0);

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ partner_share: 0, amount: 1000, amount_ars: 1000, amount_usd: 1 })
    );
  });

  it('rechaza un monto devuelto negativo sin llamar a supabase', async () => {
    const expense = makeExpense({ amount: 1000, amount_ars: 1000, amount_usd: 1 });
    await expect(settleSharedExpense(expense, -1)).rejects.toThrow(/no puede ser negativo/);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('rechaza un monto devuelto mayor al total del gasto', async () => {
    const expense = makeExpense({ amount: 1000, amount_ars: 1000, amount_usd: 1 });
    await expect(settleSharedExpense(expense, 1500)).rejects.toThrow(/mayor al total/);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('invalida el cache después de guardar', async () => {
    const expense = makeExpense({ amount: 1000, amount_ars: 1000, amount_usd: 1, partner_share: 400 });
    fromMock.mockReturnValueOnce(createQueryBuilder({ data: expense, error: null }));

    await settleSharedExpense(expense);

    expect(invalidateAppDataMock).toHaveBeenCalledTimes(1);
  });

  it('si supabase devuelve error, lo relanza y no invalida el cache', async () => {
    const expense = makeExpense({ amount: 1000, amount_ars: 1000, amount_usd: 1, partner_share: 400 });
    const dbError = new Error('db down');
    fromMock.mockReturnValueOnce(createQueryBuilder({ data: null, error: dbError }));

    await expect(settleSharedExpense(expense)).rejects.toThrow('db down');
    expect(invalidateAppDataMock).not.toHaveBeenCalled();
  });
});

describe('deleteExpense', () => {
  it('borra por id e invalida el cache', async () => {
    const builder = createQueryBuilder({ data: null, error: null });
    fromMock.mockReturnValueOnce(builder);

    await deleteExpense('exp-1');

    expect(fromMock).toHaveBeenCalledWith('expenses');
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'exp-1');
    expect(invalidateAppDataMock).toHaveBeenCalledTimes(1);
  });

  it('lanza el error de supabase y no invalida el cache', async () => {
    const dbError = new Error('boom');
    fromMock.mockReturnValueOnce(createQueryBuilder({ data: null, error: dbError }));

    await expect(deleteExpense('exp-1')).rejects.toThrow('boom');
    expect(invalidateAppDataMock).not.toHaveBeenCalled();
  });
});

describe('resolvePendingExchangeRates', () => {
  it('devuelve 0 si no hay gastos pendientes', async () => {
    fromMock.mockReturnValueOnce(createQueryBuilder({ data: [], error: null }));

    const count = await resolvePendingExchangeRates('user-1');

    expect(count).toBe(0);
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it('resuelve todos los pendientes y devuelve cuántos se pudieron actualizar', async () => {
    const pending = [
      makeExpense({ id: 'e1', amount: 100, currency: 'ARS', date: '2026-09-01' }),
      makeExpense({ id: 'e2', amount: 200, currency: 'USD', date: '2026-09-02' }),
    ];
    fromMock.mockReturnValueOnce(createQueryBuilder({ data: pending, error: null }));
    fromMock.mockImplementation(() => createQueryBuilder({ data: null, error: null }));
    calculateAmountsMock.mockResolvedValue({ amount_ars: 1000, amount_usd: 1, exchange_rate_used: 1000 });

    const count = await resolvePendingExchangeRates('user-1');

    expect(count).toBe(2);
    expect(calculateAmountsMock).toHaveBeenCalledWith(100, 'ARS', new Date('2026-09-01T00:00:00'));
    expect(calculateAmountsMock).toHaveBeenCalledWith(200, 'USD', new Date('2026-09-02T00:00:00'));
  });

  it('un gasto que sigue sin poder dolarizarse no cuenta como resuelto, pero no frena a los demás', async () => {
    const pending = [
      makeExpense({ id: 'e1', amount: 555, currency: 'ARS', date: '2026-09-01' }),
      makeExpense({ id: 'e2', amount: 100, currency: 'ARS', date: '2026-09-02' }),
    ];
    fromMock.mockReturnValueOnce(createQueryBuilder({ data: pending, error: null }));
    fromMock.mockImplementation(() => createQueryBuilder({ data: null, error: null }));
    calculateAmountsMock.mockImplementation((amount: number) =>
      amount === 555
        ? Promise.reject(new Error('API caída'))
        : Promise.resolve({ amount_ars: 1000, amount_usd: 1, exchange_rate_used: 1000 })
    );

    const count = await resolvePendingExchangeRates('user-1');

    expect(count).toBe(1);
  });

  it('si el update a supabase falla, ese gasto tampoco cuenta como resuelto', async () => {
    const pending = [makeExpense({ id: 'e1', amount: 100, currency: 'ARS', date: '2026-09-01' })];
    fromMock.mockReturnValueOnce(createQueryBuilder({ data: pending, error: null }));
    fromMock.mockImplementation(() => createQueryBuilder({ data: null, error: new Error('update falló') }));
    calculateAmountsMock.mockResolvedValue({ amount_ars: 1000, amount_usd: 1, exchange_rate_used: 1000 });

    const count = await resolvePendingExchangeRates('user-1');

    expect(count).toBe(0);
  });
});
