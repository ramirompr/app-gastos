'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Category, Expense } from '@/lib/types';
import { fetchUserCategories } from '@/lib/categories';
import { Emoji } from '@/components/ui/Emoji';
import { settleSharedExpense } from '@/lib/expenses';
import { useCurrencyDisplay } from '@/lib/currency-display-context';
import { pickAmount, formatMoney, formatExpenseAmount, formatPartnerShare, partnerShareInArsUsd } from '@/lib/format-money';
import { AppMenu } from '@/components/layout/AppMenu';
import { PageHeader } from '@/components/layout/PageHeader';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PendingPaymentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showUsd } = useCurrencyDisplay();

  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [settleError, setSettleError] = useState<{ id: string; message: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [cats, { data: exps }] = await Promise.all([
      fetchUserCategories(user.id),
      supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('split_type', 'shared')
        .eq('is_settled', false)
        .order('date', { ascending: true }),
    ]);
    setCategories(cats);
    setExpenses(exps ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const markSettled = async (expense: Expense) => {
    setUpdatingId(expense.id);
    setSettleError(null);
    try {
      await settleSharedExpense(expense);
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
    } catch (err) {
      console.error(err);
      setSettleError({
        id: expense.id,
        message: err instanceof Error ? err.message : 'No se pudo marcar como pagado. Intentá de nuevo.',
      });
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

  if (!user) return null;

  const totalOwed = expenses.reduce((sum, e) => {
    const share = partnerShareInArsUsd(e);
    return share ? sum + pickAmount(share.ars, share.usd, showUsd) : sum;
  }, 0);

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <PageHeader
        title="Pagos pendientes"
        onBack={() => router.push('/dashboard')}
        onMenu={() => setMenuOpen(true)}
      />
      <div className="px-4 pb-4">
        <p className="text-slate-500 text-sm text-center">
          {expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'} · Te deben{' '}
          {formatMoney(totalOwed, showUsd)}
        </p>
      </div>

      <div className="px-4 flex flex-col gap-3">
        {expenses.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-16">
            No tenés gastos compartidos pendientes de devolución.
          </p>
        )}
        {expenses.map((exp) => {
          const cat = categories.find((c) => c.id === exp.category_id);
          const isPending = exp.exchange_rate_used == null;
          return (
            <div key={exp.id} className="bg-slate-800/60 rounded-xl px-4 py-3 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                {cat && (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  >
                    <Emoji emoji={cat.icon} size={16} />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{exp.description}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {format(new Date(`${exp.date}T00:00:00`), "d 'de' MMMM", { locale: es })}
                    {cat ? ` · ${cat.name}` : ''}
                  </p>
                </div>
                <p className="text-white text-sm font-semibold whitespace-nowrap">
                  {formatExpenseAmount(exp, showUsd)}
                </p>
              </div>

              <div className="flex items-center justify-between bg-slate-900/50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-xs text-slate-400">Te deben {formatPartnerShare(exp, showUsd)}</p>
                  {exp.shared_with && (
                    <p className="text-xs text-slate-500 mt-0.5">{exp.shared_with}</p>
                  )}
                  {settleError?.id === exp.id && (
                    <p className="text-xs text-red-400 mt-0.5">{settleError.message}</p>
                  )}
                </div>
                <button
                  onClick={() => markSettled(exp)}
                  disabled={updatingId === exp.id || isPending}
                  title={isPending ? 'Esperá a que se resuelva la cotización pendiente' : undefined}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                >
                  {updatingId === exp.id ? 'Guardando...' : 'Marcar como pagado'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
