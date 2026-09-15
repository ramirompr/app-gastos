import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addWeeks,
  addMonths,
  addYears,
  format,
  isAfter,
} from 'date-fns';
import { es } from 'date-fns/locale';

export type Period = 'week' | 'month' | 'year';

export interface DateRange {
  start: Date;
  end: Date;
}

export function getRangeForPeriod(period: Period, anchor: Date): DateRange {
  switch (period) {
    case 'week':
      return {
        start: startOfWeek(anchor, { weekStartsOn: 1 }),
        end: endOfWeek(anchor, { weekStartsOn: 1 }),
      };
    case 'month':
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
    case 'year':
      return { start: startOfYear(anchor), end: endOfYear(anchor) };
  }
}

export function shiftAnchor(period: Period, anchor: Date, direction: 1 | -1): Date {
  switch (period) {
    case 'week':
      return addWeeks(anchor, direction);
    case 'month':
      return addMonths(anchor, direction);
    case 'year':
      return addYears(anchor, direction);
  }
}

export function canGoNext(period: Period, anchor: Date): boolean {
  const next = shiftAnchor(period, anchor, 1);
  const { start } = getRangeForPeriod(period, next);
  return !isAfter(start, new Date());
}

export function getPeriodLabel(period: Period, anchor: Date): string {
  const { start, end } = getRangeForPeriod(period, anchor);
  switch (period) {
    case 'week':
      return `${format(start, 'd')} al ${format(end, 'd MMM', { locale: es })}`;
    case 'month':
      return capitalize(format(anchor, 'MMMM \'de\' yyyy', { locale: es }));
    case 'year':
      return format(anchor, 'yyyy');
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
