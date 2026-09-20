import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getRangeForPeriod, shiftAnchor, canGoNext, getPeriodLabel, capitalize } from './date-periods';

describe('getRangeForPeriod', () => {
  it('semana: arranca lunes y termina domingo (weekStartsOn: 1)', () => {
    // 2026-09-16 es miércoles
    const { start, end } = getRangeForPeriod('week', new Date(2026, 8, 16));
    expect(start).toEqual(new Date(2026, 8, 14));
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(8);
    expect(end.getDate()).toBe(20);
  });

  it('mes: primer y último día del mes del anchor', () => {
    const { start, end } = getRangeForPeriod('month', new Date(2026, 8, 16));
    expect(start).toEqual(new Date(2026, 8, 1));
    expect(end.getMonth()).toBe(8);
    expect(end.getDate()).toBe(30);
  });

  it('año: 1 de enero a 31 de diciembre del año del anchor', () => {
    const { start, end } = getRangeForPeriod('year', new Date(2026, 8, 16));
    expect(start).toEqual(new Date(2026, 0, 1));
    expect(end.getMonth()).toBe(11);
    expect(end.getDate()).toBe(31);
  });
});

describe('shiftAnchor', () => {
  it('mueve una semana hacia adelante y hacia atrás', () => {
    const anchor = new Date(2026, 8, 16);
    expect(shiftAnchor('week', anchor, 1)).toEqual(new Date(2026, 8, 23));
    expect(shiftAnchor('week', anchor, -1)).toEqual(new Date(2026, 8, 9));
  });

  it('mueve un mes hacia adelante y hacia atrás', () => {
    const anchor = new Date(2026, 8, 16);
    expect(shiftAnchor('month', anchor, 1)).toEqual(new Date(2026, 9, 16));
    expect(shiftAnchor('month', anchor, -1)).toEqual(new Date(2026, 7, 16));
  });

  it('mueve un año hacia adelante y hacia atrás', () => {
    const anchor = new Date(2026, 8, 16);
    expect(shiftAnchor('year', anchor, 1)).toEqual(new Date(2027, 8, 16));
    expect(shiftAnchor('year', anchor, -1)).toEqual(new Date(2025, 8, 16));
  });
});

describe('canGoNext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 20, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no permite avanzar al mes siguiente si todavía no llegó', () => {
    expect(canGoNext('month', new Date(2026, 8, 1))).toBe(false);
  });

  it('permite avanzar si el período siguiente ya empezó', () => {
    expect(canGoNext('month', new Date(2026, 7, 1))).toBe(true);
  });

  it('no permite avanzar al año que viene', () => {
    expect(canGoNext('year', new Date(2026, 0, 1))).toBe(false);
  });

  it('permite avanzar de un año pasado al actual', () => {
    expect(canGoNext('year', new Date(2025, 0, 1))).toBe(true);
  });
});

describe('getPeriodLabel', () => {
  it('semana: "D al D MMM"', () => {
    expect(getPeriodLabel('week', new Date(2026, 8, 16))).toBe('14 al 20 sep');
  });

  it('mes: "Mes de año", capitalizado', () => {
    expect(getPeriodLabel('month', new Date(2026, 8, 16))).toBe('Septiembre de 2026');
  });

  it('año: solo el número de año', () => {
    expect(getPeriodLabel('year', new Date(2026, 8, 16))).toBe('2026');
  });
});

describe('capitalize', () => {
  it('pone en mayúscula solo la primera letra', () => {
    expect(capitalize('septiembre de 2026')).toBe('Septiembre de 2026');
  });

  it('no rompe con un string vacío', () => {
    expect(capitalize('')).toBe('');
  });
});
