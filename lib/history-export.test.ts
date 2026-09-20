import { describe, it, expect, vi } from 'vitest';

// Estas funciones son puras y no tocan supabase, pero el módulo también
// exporta fetchAllExpensesForExport que sí lo importa a nivel de archivo —
// sin mockear, crear el cliente real explota en el entorno de test.
vi.mock('./supabase', () => ({ supabase: {} }));

import { buildHistoryCsv, escapeCsvField, historyExportFilename } from './history-export';
import { makeExpense, makeCategory, makePlan } from './test-utils/fixtures';

function dataRows(csv: string): string[][] {
  const lines = csv.split('\r\n');
  return lines.slice(1).map((line) => line.split(';'));
}

describe('escapeCsvField', () => {
  it('no toca campos simples', () => {
    expect(escapeCsvField('Supermercado')).toBe('Supermercado');
  });

  it('encierra entre comillas un campo que contiene el delimitador ";"', () => {
    expect(escapeCsvField('Café; medialunas')).toBe('"Café; medialunas"');
  });

  it('duplica comillas internas y encierra el campo', () => {
    expect(escapeCsvField('Dijo "hola"')).toBe('"Dijo ""hola"""');
  });

  it('encierra un campo con salto de línea', () => {
    expect(escapeCsvField('línea1\nlínea2')).toBe('"línea1\nlínea2"');
  });
});

describe('historyExportFilename', () => {
  it('arma el nombre con la fecha en formato yyyy-MM-dd', () => {
    expect(historyExportFilename(new Date(2026, 8, 20))).toBe('historial-mis-gastos-2026-09-20.csv');
  });
});

describe('buildHistoryCsv', () => {
  const categories = [
    makeCategory({ id: 'cat-parent', name: 'Comida', parent_id: null }),
    makeCategory({ id: 'cat-child', name: 'Delivery', parent_id: 'cat-parent' }),
  ];

  it('arma la fila de encabezados', () => {
    const csv = buildHistoryCsv([], categories, []);
    expect(csv.split('\r\n')[0]).toBe(
      [
        'Fecha',
        'Tipo',
        'Categoría',
        'Descripción',
        'Alcance',
        'Compartido/invitado con',
        'Moneda',
        'Monto',
        'Monto ARS',
        'Monto USD',
        'Cotización usada',
        'Parte del otro ARS',
        'Parte del otro USD',
        'Estado',
        'Cuota',
        'Recurrente',
      ].join(';')
    );
  });

  it('formatea un gasto personal simple', () => {
    const expense = makeExpense({
      category_id: 'cat-parent',
      date: '2026-09-15',
      description: 'Supermercado',
      currency: 'ARS',
      amount: 5000,
      amount_ars: 5000,
      amount_usd: 5,
      exchange_rate_used: 1000,
    });
    const [row] = dataRows(buildHistoryCsv([expense], categories, []));
    expect(row).toEqual([
      '15/09/2026',
      'Gasto',
      'Comida',
      'Supermercado',
      'Personal',
      '',
      'ARS',
      '5.000,00',
      '5.000,00',
      '5,00',
      '1.000,00',
      '',
      '',
      '',
      '',
      'No',
    ]);
  });

  it('muestra el path completo para una subcategoría', () => {
    const expense = makeExpense({ category_id: 'cat-child' });
    const [row] = dataRows(buildHistoryCsv([expense], categories, []));
    expect(row[2]).toBe('Comida > Delivery');
  });

  it('marca un ingreso como "Ingreso"', () => {
    const expense = makeExpense({ type: 'income' });
    const [row] = dataRows(buildHistoryCsv([expense], categories, []));
    expect(row[1]).toBe('Ingreso');
  });

  it('un gasto con cotización pendiente deja los montos ARS/USD vacíos y avisa en Cotización', () => {
    const expense = makeExpense({ exchange_rate_used: null, amount_ars: null, amount_usd: null });
    const [row] = dataRows(buildHistoryCsv([expense], categories, []));
    expect(row[8]).toBe(''); // Monto ARS
    expect(row[9]).toBe(''); // Monto USD
    expect(row[10]).toBe('Pendiente'); // Cotización usada
  });

  it('un gasto compartido saldado muestra la parte del otro y el estado', () => {
    const expense = makeExpense({
      split_type: 'shared',
      shared_with: 'Novia',
      currency: 'ARS',
      exchange_rate_used: 1000,
      partner_share: 2500,
      is_settled: true,
    });
    const [row] = dataRows(buildHistoryCsv([expense], categories, []));
    expect(row[4]).toBe('Compartido');
    expect(row[5]).toBe('Novia');
    expect(row[11]).toBe('2.500,00'); // Parte del otro ARS
    expect(row[12]).toBe('2,50'); // Parte del otro USD
    expect(row[13]).toBe('Saldado');
  });

  it('un gasto compartido sin saldar muestra estado "Pendiente"', () => {
    const expense = makeExpense({ split_type: 'shared', is_settled: false, partner_share: 1000 });
    const [row] = dataRows(buildHistoryCsv([expense], categories, []));
    expect(row[13]).toBe('Pendiente');
  });

  it('un gasto invitado no tiene columna de Estado (no es una deuda)', () => {
    const expense = makeExpense({ split_type: 'invited', partner_share: 1000 });
    const [row] = dataRows(buildHistoryCsv([expense], categories, []));
    expect(row[4]).toBe('Invitado');
    expect(row[13]).toBe('');
    expect(row[11]).toBe('1.000,00'); // igual muestra la parte del otro, informativa
  });

  it('un gasto personal deja en blanco la "parte del otro" aunque partner_share tuviera algo cargado', () => {
    const expense = makeExpense({ split_type: 'personal', partner_share: 999 });
    const [row] = dataRows(buildHistoryCsv([expense], categories, []));
    expect(row[11]).toBe('');
    expect(row[12]).toBe('');
  });

  it('marca una cuota con "número/total" usando el plan correspondiente', () => {
    const plan = makePlan({ id: 'plan-1', num_installments: 6 });
    const expense = makeExpense({ installment_plan_id: 'plan-1', installment_number: 3 });
    const [row] = dataRows(buildHistoryCsv([expense], categories, [plan]));
    expect(row[14]).toBe('3/6');
  });

  it('deja la cuota en blanco si el plan no se encuentra', () => {
    const expense = makeExpense({ installment_plan_id: 'plan-inexistente', installment_number: 2 });
    const [row] = dataRows(buildHistoryCsv([expense], categories, []));
    expect(row[14]).toBe('');
  });

  it('marca "Sí" cuando el gasto viene de un recurrente confirmado', () => {
    const expense = makeExpense({ recurring_expense_id: 'rec-1' });
    const [row] = dataRows(buildHistoryCsv([expense], categories, []));
    expect(row[15]).toBe('Sí');
  });

  it('escapa una descripción con el delimitador', () => {
    const expense = makeExpense({ description: 'Café; medialunas' });
    const csv = buildHistoryCsv([expense], categories, []);
    expect(csv).toContain('"Café; medialunas"');
  });

  it('ordena de más reciente a más antiguo por fecha, y por created_at como desempate', () => {
    const older = makeExpense({ id: 'e1', date: '2026-01-01', created_at: '2026-01-01T10:00:00.000Z', description: 'Viejo' });
    const newer = makeExpense({ id: 'e2', date: '2026-09-01', created_at: '2026-09-01T10:00:00.000Z', description: 'Nuevo' });
    const sameDateEarlier = makeExpense({
      id: 'e3',
      date: '2026-05-01',
      created_at: '2026-05-01T08:00:00.000Z',
      description: 'MismoDíaTemprano',
    });
    const sameDateLater = makeExpense({
      id: 'e4',
      date: '2026-05-01',
      created_at: '2026-05-01T20:00:00.000Z',
      description: 'MismoDíaTarde',
    });
    const rows = dataRows(buildHistoryCsv([older, newer, sameDateEarlier, sameDateLater], categories, []));
    expect(rows.map((r) => r[3])).toEqual(['Nuevo', 'MismoDíaTarde', 'MismoDíaTemprano', 'Viejo']);
  });

  it('deja la categoría en blanco si no se encuentra (dato huérfano)', () => {
    const expense = makeExpense({ category_id: 'no-existe' });
    const [row] = dataRows(buildHistoryCsv([expense], categories, []));
    expect(row[2]).toBe('');
  });
});
