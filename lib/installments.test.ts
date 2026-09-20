import { describe, it, expect } from 'vitest';
import { computeInstallments } from './installments';

describe('computeInstallments', () => {
  it('reparte un monto exacto en partes iguales', () => {
    const items = computeInstallments(1200, 12, new Date(2026, 0, 1));
    expect(items).toHaveLength(12);
    expect(items.every((i) => i.amount === 100)).toBe(true);
  });

  it('la primera cuota absorbe el resto de un reparto no exacto, y la suma da el total', () => {
    const items = computeInstallments(1000, 3, new Date(2026, 0, 15));
    expect(items[0].amount).toBe(333.34);
    expect(items[1].amount).toBe(333.33);
    expect(items[2].amount).toBe(333.33);
    const sum = items.reduce((acc, i) => acc + i.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(1000);
  });

  it('numera las cuotas desde 1', () => {
    const items = computeInstallments(300, 3, new Date(2026, 0, 1));
    expect(items.map((i) => i.installmentNumber)).toEqual([1, 2, 3]);
  });

  it('la primera cuota usa firstDate tal cual; las siguientes caen el día 1 de cada mes siguiente', () => {
    const firstDate = new Date(2026, 0, 15);
    const items = computeInstallments(300, 3, firstDate);
    expect(items[0].date).toEqual(firstDate);
    expect(items[1].date).toEqual(new Date(2026, 1, 1));
    expect(items[2].date).toEqual(new Date(2026, 2, 1));
  });

  it('cruza el fin de año correctamente', () => {
    const items = computeInstallments(200, 2, new Date(2026, 11, 15));
    expect(items[1].date).toEqual(new Date(2027, 0, 1));
  });
});
