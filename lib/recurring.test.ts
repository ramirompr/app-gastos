import { describe, it, expect } from 'vitest';
import {
  currentMonthKey,
  frequencyLabel,
  monthsUntilNextDue,
  isRecurringDueInMonth,
} from './recurring';
import { RecurringExpense } from './types';

function makeRecurring(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: 'rec-1',
    user_id: 'user-1',
    category_id: 'cat-1',
    description: 'Netflix',
    default_amount: 5000,
    currency: 'ARS',
    day_of_month: 10,
    frequency_months: 1,
    active: true,
    created_at: new Date(2026, 0, 15).toISOString(),
    ...overrides,
  };
}

describe('currentMonthKey', () => {
  it('trunca la fecha al primer día del mes en formato yyyy-MM-dd', () => {
    expect(currentMonthKey(new Date(2026, 8, 15))).toBe('2026-09-01');
  });
});

describe('frequencyLabel', () => {
  it('usa las etiquetas conocidas', () => {
    expect(frequencyLabel(1)).toBe('Mensual');
    expect(frequencyLabel(2)).toBe('Bimestral');
    expect(frequencyLabel(3)).toBe('Trimestral');
    expect(frequencyLabel(6)).toBe('Semestral');
    expect(frequencyLabel(12)).toBe('Anual');
  });

  it('arma una etiqueta genérica para frecuencias no listadas', () => {
    expect(frequencyLabel(4)).toBe('Cada 4 meses');
  });
});

describe('monthsUntilNextDue / isRecurringDueInMonth', () => {
  it('un recurrente mensual siempre está "debido" (0 meses de espera)', () => {
    const rec = makeRecurring({ frequency_months: 1, created_at: new Date(2026, 0, 15).toISOString() });
    expect(monthsUntilNextDue(rec, new Date(2026, 8, 1))).toBe(0);
    expect(isRecurringDueInMonth(rec, new Date(2026, 8, 1))).toBe(true);
  });

  it('un recurrente trimestral creado en enero cae en abril, julio y octubre', () => {
    const rec = makeRecurring({ frequency_months: 3, created_at: new Date(2026, 0, 15).toISOString() });
    expect(isRecurringDueInMonth(rec, new Date(2026, 0, 1))).toBe(true); // enero
    expect(isRecurringDueInMonth(rec, new Date(2026, 1, 1))).toBe(false); // febrero
    expect(isRecurringDueInMonth(rec, new Date(2026, 2, 1))).toBe(false); // marzo
    expect(isRecurringDueInMonth(rec, new Date(2026, 3, 1))).toBe(true); // abril
    expect(isRecurringDueInMonth(rec, new Date(2026, 9, 1))).toBe(true); // octubre
  });

  it('cuenta cuántos meses faltan cuando no está debido este mes', () => {
    const rec = makeRecurring({ frequency_months: 3, created_at: new Date(2026, 0, 15).toISOString() });
    expect(monthsUntilNextDue(rec, new Date(2026, 1, 1))).toBe(2); // febrero: faltan 2 para abril
    expect(monthsUntilNextDue(rec, new Date(2026, 2, 1))).toBe(1); // marzo: falta 1 para abril
  });

  it('un recurrente anual solo está debido en el mismo mes de creación', () => {
    const rec = makeRecurring({ frequency_months: 12, created_at: new Date(2026, 5, 15).toISOString() });
    expect(isRecurringDueInMonth(rec, new Date(2027, 5, 1))).toBe(true);
    expect(isRecurringDueInMonth(rec, new Date(2027, 4, 1))).toBe(false);
    expect(isRecurringDueInMonth(rec, new Date(2027, 6, 1))).toBe(false);
  });
});
