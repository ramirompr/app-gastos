'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Category, Expense } from '@/lib/types';
import { settleSharedExpense, deleteExpense } from '@/lib/expenses';
import { useCurrencyDisplay } from '@/lib/currency-display-context';
import { pickAmount, formatMoney, partnerShareInArsUsd } from '@/lib/format-money';
import { AppMenu } from '@/components/layout/AppMenu';
import { PageHeader } from '@/components/layout/PageHeader';
import { ExpenseRowMenu } from '@/components/expenses/ExpenseRowMenu';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function ExpensesListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { showUsd } = useCurrencyDisplay();

  const categoryId = searchParams.get('categoryId');
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    if (!user || !categoryId || !start || !end) return;
    setLoading(true);

    const [{ data: cat }, { data: subs }] = await Promise.all([
      supabase.from('categories').select('*').eq('id', categoryId).eq('user_id', user.id).single(),
      supabase.from('categories').select('*').eq('parent_id', categoryId),
    ]);
    setCategory(cat ?? null);
    setSubcategories(subs ?? []);

    const categoryIds = [categoryId, ...(subs ?? []).map((s) => s.id)];
    const { data: exps } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .in('category_id', categoryIds)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });
    setExpenses(exps ?? []);
    setLoading(false);
  }, [user, categoryId, start, end]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const categoryNameFor = (id: string) => {
    if (id === categoryId) return null;
    return subcategories.find((s) => s.id === id)?.name ?? null;
  };

  const markSettled = async (expense: Expense) => {
    setUpdatingId(expense.id);
    try {
      const updated = await settleSharedExpense(expense);
      setExpenses((prev) => prev.map((e) => (e.id === expense.id ? updated : e)));
    } catch (err) {
      console.error(err);
    }
    setUpdatingId(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin h-8 w-8 border-2 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !category) return null;

  const total = pickAmount(
    expenses.reduce((sum, e) => sum + e.amount_ars, 0),
    expenses.reduce((sum, e) => sum + e.amount_usd, 0),
    showUsd
  );
  const totalInvited = expenses
    .filter((e) => e.split_type === 'invited')
    .reduce((sum, e) => {
      const share = partnerShareInArsUsd(e);
      return sum + pickAmount(share.ars, share.usd, showUsd);
    }, 0);

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <PageHeader title="Gastos" onBack={() => router.push('/dashboard')} onMenu={() => setMenuOpen(true)} />
      <div className="px-4 pb-4">
        <div className="flex items-center gap-4 justify-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg flex-shrink-0"
            style={{ backgroundColor: category.color }}
          >
            {category.icon}
          </div>
          <div>
            <p className="text-white font-semibold">{category.name}</p>
            <p className="text-slate-500 text-sm">
              {expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'} · {formatMoney(total, showUsd)}
            </p>
            {totalInvited > 0 && (
              <p className="text-slate-500 text-xs mt-0.5">
                Invitado: {formatMoney(totalInvited, showUsd)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-3">
        {expenses.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-16">
            No hay gastos en esta categoría durante este período.
          </p>
        )}
        {expenses.map((exp) => {
          const subName = categoryNameFor(exp.category_id);
          const share = partnerShareInArsUsd(exp);
          const shareAmount = pickAmount(share.ars, share.usd, showUsd);
          return (
            <div key={exp.id} className="bg-slate-800/60 rounded-xl px-4 py-3 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{exp.description}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {format(new Date(`${exp.date}T00:00:00`), "d 'de' MMMM", { locale: es })}
                    {subName ? ` · ${subName}` : ''}
                  </p>
                </div>
                <p className="text-white text-sm font-semibold whitespace-nowrap">
                  {formatMoney(pickAmount(exp.amount_ars, exp.amount_usd, showUsd), showUsd)}
                </p>
                <ExpenseRowMenu
                  label={exp.description}
                  onEdit={() => router.push(`/dashboard/expenses/${exp.id}/edit`)}
                  onDelete={async () => {
                    await deleteExpense(exp.id);
                    setExpenses((prev) => prev.filter((e) => e.id !== exp.id));
                  }}
                />
              </div>

              {exp.split_type === 'shared' && (
                <div className="flex items-center justify-between bg-slate-900/50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs text-slate-400">
                      {exp.is_settled ? 'Te devolvieron ' : 'Te deben '}
                      {formatMoney(shareAmount, showUsd)}
                    </p>
                    {exp.shared_with && (
                      <p className="text-xs text-slate-500 mt-0.5">{exp.shared_with}</p>
                    )}
                  </div>
                  {!exp.is_settled && (
                    <button
                      onClick={() => markSettled(exp)}
                      disabled={updatingId === exp.id}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                    >
                      {updatingId === exp.id ? 'Guardando...' : 'Marcar como pagado'}
                    </button>
                  )}
                </div>
              )}

              {exp.split_type === 'invited' && (
                <p className="text-xs text-slate-500">Invitaste {formatMoney(shareAmount, showUsd)}</p>
              )}
            </div>
          );
        })}
      </div>

      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

export default function ExpensesListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="animate-spin h-8 w-8 border-2 border-violet-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <ExpensesListContent />
    </Suspense>
  );
}
