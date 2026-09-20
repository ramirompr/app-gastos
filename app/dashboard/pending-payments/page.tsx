'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Expense } from '@/lib/types';
import { Emoji } from '@/components/ui/Emoji';
import { SettlePaymentSheet } from '@/components/expenses/SettlePaymentSheet';
import { useCurrencyDisplay } from '@/lib/currency-display-context';
import { pickAmount, formatMoney, formatExpenseAmount, formatPartnerShare, partnerShareInArsUsd } from '@/lib/format-money';
import { pluralize } from '@/lib/pluralize';
import {
  peekCategories,
  getCategoriesCached,
  peekPendingPayments,
  getPendingPaymentsCached,
  useCachedResource,
  useOptimisticExclude,
} from '@/lib/app-data';
import { AppMenu } from '@/components/layout/AppMenu';
import { PageHeader } from '@/components/layout/PageHeader';
import { Container } from '@/components/layout/Container';
import { SkeletonList } from '@/components/ui/Skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PendingPaymentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showUsd } = useCurrencyDisplay();

  const [settlingExpense, setSettlingExpense] = useState<Expense | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const { data: cachedCategories, loading: loadingCategories } = useCachedResource(
    peekCategories,
    () => (user ? getCategoriesCached(user.id) : null),
    [user?.id]
  );
  const { data: cachedExpenses, loading: loadingExpenses } = useCachedResource(
    peekPendingPayments,
    () => (user ? getPendingPaymentsCached(user.id) : null),
    [user?.id]
  );
  const categories = cachedCategories ?? [];
  const { visible: expenses, exclude: excludeSettled } = useOptimisticExclude(cachedExpenses);
  const loading = loadingCategories || loadingExpenses;

  if (authLoading) {
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
      <Container className="pb-4">
        <p className="text-slate-500 text-sm text-center">
          {loading
            ? ''
            : `${expenses.length} ${pluralize(expenses.length, 'gasto')} · Te deben ${formatMoney(totalOwed, showUsd)}`}
        </p>
      </Container>

      <Container className="flex flex-col gap-3">
        {loading && <SkeletonList count={3} />}
        {!loading && expenses.length === 0 && (
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
                </div>
                <button
                  onClick={() => setSettlingExpense(exp)}
                  disabled={isPending}
                  title={isPending ? 'Esperá a que se resuelva la cotización pendiente' : undefined}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                >
                  Marcar como pagado
                </button>
              </div>
            </div>
          );
        })}
      </Container>

      {settlingExpense && (
        <SettlePaymentSheet
          expense={settlingExpense}
          onClose={() => setSettlingExpense(null)}
          onSettled={() => {
            excludeSettled(settlingExpense.id);
            setSettlingExpense(null);
          }}
        />
      )}

      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
