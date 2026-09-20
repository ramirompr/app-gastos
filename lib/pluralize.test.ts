import { describe, it, expect } from 'vitest';
import { pluralize, movementNoun } from './pluralize';

describe('pluralize', () => {
  it('usa el singular cuando count es 1', () => {
    expect(pluralize(1, 'gasto')).toBe('gasto');
  });

  it('usa singular + "s" por defecto para cualquier otro count', () => {
    expect(pluralize(0, 'gasto')).toBe('gastos');
    expect(pluralize(2, 'gasto')).toBe('gastos');
    expect(pluralize(-1, 'gasto')).toBe('gastos');
  });

  it('usa el plural explícito cuando no alcanza con agregar "s"', () => {
    expect(pluralize(1, 'está incluido', 'están incluidos')).toBe('está incluido');
    expect(pluralize(3, 'está incluido', 'están incluidos')).toBe('están incluidos');
  });
});

describe('movementNoun', () => {
  it('elige entre gasto/gastos e ingreso/ingresos según count e isIncome', () => {
    expect(movementNoun(1, false)).toBe('gasto');
    expect(movementNoun(2, false)).toBe('gastos');
    expect(movementNoun(1, true)).toBe('ingreso');
    expect(movementNoun(2, true)).toBe('ingresos');
  });
});
