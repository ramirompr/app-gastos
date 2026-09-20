'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ExpenseInstallmentPlan } from '@/lib/types';
import { Emoji } from '@/components/ui/Emoji';
import { useCurrencyDisplay } from '@/lib/currency-display-context';
import { pickAmount, formatMoney } from '@/lib/format-money';
import { pluralize } from '@/lib/pluralize';
import {
  peekCategories,
  getCategoriesCached,
  peekPendingInstallments,
  getPendingInstallmentsCached,
  useCachedResource,
} from '@/lib/app-data';
import { AppMenu } from '@/components/layout/AppMenu';
import { PageHeader } from '@/components/layout/PageHeader';
import { Container } from '@/components/layout/Container';
import { SkeletonList } from '@/components/ui/Skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PlanProgress {
  plan: ExpenseInstallmentPlan;
  doneCount: number;
  remainingCount: number;
  remainingAmountArs: number;
  remainingAmountUsd: number;
  hasPendingRemaining: boolean;
  nextDate: string | null;
  nextAmountArs: number | null;
  nextAmountUsd: number | null;
}

export default function PendingInstallmentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showUsd } = useCurrencyDisplay();

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const { data: cachedCategories, loading: loadingCategories } = useCachedResource(
    peekCategories,
    () => (user ? getCategoriesCached(user.id) : null),
    [user?.id]
  );
  const { data: cachedInstallments, loading: loadingInstallments } = useCachedResource(
    peekPendingInstallments,
    () => (user ? getPendingInstallmentsCached(user.id) : null),
    [user?.id]
  );
  const categories = cachedCategories ?? [];
  const plans = cachedInstallments?.plans ?? [];
  const installmentExpenses = cachedInstallments?.expenses ?? [];
  const loading = loadingCategories || loadingInstallments;

  const activePlans = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const result: PlanProgress[] = [];

    for (const plan of plans) {
      const rows = installmentExpenses
        .filter((e) => e.installment_plan_id === plan.id)
        .sort((a, b) => (a.installment_number ?? 0) - (b.installment_number ?? 0));

      const done = rows.filter((r) => r.date <= today);
      const remaining = rows.filter((r) => r.date > today);

      if (remaining.length === 0) continue;

      result.push({
        plan,
        doneCount: done.length,
        remainingCount: remaining.length,
        remainingAmountArs: remaining.reduce((sum, r) => sum + (r.amount_ars ?? 0), 0),
        remainingAmountUsd: remaining.reduce((sum, r) => sum + (r.amount_usd ?? 0), 0),
        hasPendingRemaining: remaining.some((r) => r.exchange_rate_used == null),
        nextDate: remaining[0]?.date ?? null,
        nextAmountArs: remaining[0]?.amount_ars ?? null,
        nextAmountUsd: remaining[0]?.amount_usd ?? null,
      });
    }

    return result.sort((a, b) => (a.nextDate ?? '').localeCompare(b.nextDate ?? ''));
  }, [plans, installmentExpenses]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin h-8 w-8 border-2 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <PageHeader
        title="Cuotas pendientes"
        onBack={() => router.push('/dashboard')}
        onMenu={() => setMenuOpen(true)}
      />
      <Container className="pb-4">
        <p className="text-slate-500 text-sm text-center">
          {loading ? '' : `${activePlans.length} ${pluralize(activePlans.length, 'plan activo', 'planes activos')}`}
        </p>
      </Container>

      <Container className="flex flex-col gap-3">
        {loading && <SkeletonList count={3} />}
        {!loading && activePlans.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-16">
            No tenés gastos en cuotas corriendo actualmente.
          </p>
        )}
        {activePlans.map((planProgress) => {
          const {
            plan,
            doneCount,
            remainingCount,
            remainingAmountArs,
            remainingAmountUsd,
            hasPendingRemaining,
            nextDate,
            nextAmountArs,
            nextAmountUsd,
          } = planProgress;
          const cat = categories.find((c) => c.id === plan.category_id);
          const remainingAmount = pickAmount(remainingAmountArs, remainingAmountUsd, showUsd);
          const nextAmount =
            nextAmountArs !== null && nextAmountUsd !== null
              ? pickAmount(nextAmountArs, nextAmountUsd, showUsd)
              : null;
          return (
            <div key={plan.id} className="bg-slate-800/60 rounded-xl px-4 py-3 flex flex-col gap-2">
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
                  <p className="text-white text-sm font-medium">{plan.description}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Cuota {doneCount} de {plan.num_installments}
                    {cat ? ` · ${cat.name}` : ''}
                  </p>
                </div>
                {nextAmount !== null ? (
                  <p className="text-white text-sm font-semibold whitespace-nowrap">
                    {formatMoney(nextAmount, showUsd)}
                  </p>
                ) : (
                  <p className="text-amber-400 text-xs whitespace-nowrap">Cotización pendiente</p>
                )}
              </div>

              <div className="flex items-center justify-between bg-slate-900/50 rounded-lg px-3 py-2">
                <p className="text-xs text-slate-400">
                  Restan {remainingCount} {pluralize(remainingCount, 'cuota')} ·{' '}
                  {hasPendingRemaining
                    ? 'total con cotización pendiente'
                    : `${formatMoney(remainingAmount, showUsd)} en total`}
                </p>
                {nextDate && (
                  <p className="text-xs text-slate-500">
                    Próxima: {format(new Date(`${nextDate}T00:00:00`), 'd MMM', { locale: es })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </Container>

      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
