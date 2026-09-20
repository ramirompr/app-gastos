import { supabase } from './supabase';
import { Category, Expense, ExpenseInstallmentPlan } from './types';
import { partnerShareInArsUsd } from './format-money';
import { format } from 'date-fns';

const CSV_DELIMITER = ';';

const SPLIT_LABEL: Record<Expense['split_type'], string> = {
  personal: 'Personal',
  invited: 'Invitado',
  shared: 'Compartido',
};

/**
 * Trae TODOS los gastos/ingresos del usuario, sin el límite de 500 que usa
 * la pantalla de historial (HISTORY_FETCH_CAP en lib/app-data.ts) — la
 * descarga tiene que ser siempre completa, no importa cuánto haya cargado.
 */
export async function fetchAllExpensesForExport(
  userId: string
): Promise<{ expenses: Expense[]; plans: ExpenseInstallmentPlan[] }> {
  const [
    { data: expenses, error: expensesError },
    { data: plans, error: plansError },
  ] = await Promise.all([
    supabase.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('expense_installment_plans').select('*').eq('user_id', userId),
  ]);

  if (expensesError) throw expensesError;
  if (plansError) throw plansError;
  return { expenses: expenses ?? [], plans: plans ?? [] };
}

function categoryLabel(categories: Category[], categoryId: string): string {
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return '';
  if (!cat.parent_id) return cat.name;
  const parent = categories.find((c) => c.id === cat.parent_id);
  return parent ? `${parent.name} > ${cat.name}` : cat.name;
}

function formatCsvNumber(n: number | null | undefined): string {
  if (n == null) return '';
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function escapeCsvField(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function historyExportFilename(date: Date = new Date()): string {
  return `historial-mis-gastos-${format(date, 'yyyy-MM-dd')}.csv`;
}

/**
 * Arma el CSV completo del historial. Cada fila es una transacción real de
 * la tabla `expenses` (las cuotas de un plan quedan una por fila, igual que
 * en la base) — así el archivo sirve para sumar/filtrar en una planilla sin
 * tener que reconstruir nada. Separador `;` y decimales con coma para que
 * Excel en español lo interprete como números de una, no como texto.
 */
export function buildHistoryCsv(
  expenses: Expense[],
  categories: Category[],
  plans: ExpenseInstallmentPlan[]
): string {
  const planById = new Map(plans.map((p) => [p.id, p]));

  const headers = [
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
  ];

  const sorted = [...expenses].sort(
    (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
  );

  const rows = sorted.map((expense) => {
    const isPending = expense.exchange_rate_used == null;
    const share = expense.split_type === 'personal' ? null : partnerShareInArsUsd(expense);
    const plan = expense.installment_plan_id ? planById.get(expense.installment_plan_id) : undefined;

    return [
      format(new Date(`${expense.date}T00:00:00`), 'dd/MM/yyyy'),
      expense.type === 'income' ? 'Ingreso' : 'Gasto',
      categoryLabel(categories, expense.category_id),
      expense.description,
      SPLIT_LABEL[expense.split_type],
      expense.shared_with ?? '',
      expense.currency,
      formatCsvNumber(expense.amount),
      isPending ? '' : formatCsvNumber(expense.amount_ars),
      isPending ? '' : formatCsvNumber(expense.amount_usd),
      isPending ? 'Pendiente' : formatCsvNumber(expense.exchange_rate_used),
      share ? formatCsvNumber(share.ars) : '',
      share ? formatCsvNumber(share.usd) : '',
      expense.split_type === 'shared' ? (expense.is_settled ? 'Saldado' : 'Pendiente') : '',
      plan ? `${expense.installment_number ?? ''}/${plan.num_installments}` : '',
      expense.recurring_expense_id ? 'Sí' : 'No',
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map((field) => escapeCsvField(String(field))).join(CSV_DELIMITER))
    .join('\r\n');
}

/** Dispara la descarga del CSV en el navegador (con BOM UTF-8 para que Excel en español no rompa los acentos). */
export function triggerCsvDownload(csv: string, filename: string): void {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportHistoryToCsv(userId: string, categories: Category[]): Promise<void> {
  const { expenses, plans } = await fetchAllExpensesForExport(userId);
  const csv = buildHistoryCsv(expenses, categories, plans);
  triggerCsvDownload(csv, historyExportFilename());
}
