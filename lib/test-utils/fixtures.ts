import { Category, Expense, ExpenseInstallmentPlan } from '@/lib/types';

export function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp-1',
    user_id: 'user-1',
    category_id: 'cat-1',
    description: 'Gasto de prueba',
    amount: 1000,
    currency: 'ARS',
    amount_ars: 1000,
    amount_usd: 1,
    exchange_rate_used: 1000,
    date: '2026-09-15',
    type: 'expense',
    split_type: 'personal',
    partner_share: null,
    shared_with: null,
    is_settled: false,
    settled_at: null,
    installment_plan_id: null,
    installment_number: null,
    recurring_expense_id: null,
    created_at: '2026-09-15T12:00:00.000Z',
    ...overrides,
  };
}

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    user_id: 'user-1',
    name: 'Comida',
    icon: '🍔',
    color: '#ff6b6b',
    parent_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makePlan(overrides: Partial<ExpenseInstallmentPlan> = {}): ExpenseInstallmentPlan {
  return {
    id: 'plan-1',
    user_id: 'user-1',
    category_id: 'cat-1',
    description: 'Plan de prueba',
    total_amount: 1200,
    currency: 'ARS',
    num_installments: 12,
    split_type: 'personal',
    partner_share: null,
    shared_with: null,
    start_date: '2026-01-01',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
