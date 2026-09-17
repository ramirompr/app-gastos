import { RecurringExpense } from './types';
import { format, startOfMonth } from 'date-fns';

/** "2026-09-01" — clave de mes usada en recurring_confirmations.month. */
export function currentMonthKey(date: Date = new Date()): string {
  return format(startOfMonth(date), 'yyyy-MM-dd');
}

export const FREQUENCY_OPTIONS: { months: number; label: string }[] = [
  { months: 1, label: 'Mensual' },
  { months: 2, label: 'Bimestral' },
  { months: 3, label: 'Trimestral' },
  { months: 6, label: 'Semestral' },
  { months: 12, label: 'Anual' },
];

export function frequencyLabel(months: number): string {
  return FREQUENCY_OPTIONS.find((f) => f.months === months)?.label ?? `Cada ${months} meses`;
}

/**
 * Meses que faltan desde `fromMonth` hasta el próximo cobro de este
 * recurrente, según su frecuencia y el mes en que se creó (0 = corresponde
 * este mismo mes).
 */
export function monthsUntilNextDue(recurring: RecurringExpense, fromMonth: Date = new Date()): number {
  const anchor = new Date(recurring.created_at);
  const monthsSinceAnchor =
    (fromMonth.getFullYear() - anchor.getFullYear()) * 12 + (fromMonth.getMonth() - anchor.getMonth());
  const remainder =
    ((monthsSinceAnchor % recurring.frequency_months) + recurring.frequency_months) % recurring.frequency_months;
  return remainder === 0 ? 0 : recurring.frequency_months - remainder;
}

/** ¿Corresponde cobrar este recurrente durante `monthDate`? */
export function isRecurringDueInMonth(recurring: RecurringExpense, monthDate: Date = new Date()): boolean {
  return monthsUntilNextDue(recurring, monthDate) === 0;
}
