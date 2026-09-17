'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Expense, RecurringExpense } from '@/lib/types';
import { getTopLevelCategory } from '@/lib/categories';
import { Emoji } from '@/components/ui/Emoji';
import { Container } from '@/components/layout/Container';
import { useCurrencyDisplay } from '@/lib/currency-display-context';
import { pickAmount, formatMoney } from '@/lib/format-money';
import { resolvePendingExchangeRates } from '@/lib/expenses';
import { convertWithRate } from '@/lib/exchange-rates';
import { isRecurringDueInMonth } from '@/lib/recurring';
import {
  peekCategories,
  getCategoriesCached,
  peekHomeRange,
  getHomeRangeCached,
  peekRecurring,
  getRecurringCached,
  useCachedResource,
  invalidateAppData,
  prefetchAppData,
} from '@/lib/app-data';
import { ConfirmPaymentSheet } from '@/components/recurring/ConfirmPaymentSheet';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { AppMenu } from '@/components/layout/AppMenu';
import { PageHeader } from '@/components/layout/PageHeader';
import { SkeletonCircle, SkeletonList } from '@/components/ui/Skeleton';
import {
  Period,
  getRangeForPeriod,
  getPeriodLabel,
  shiftAnchor,
  canGoNext,
} from '@/lib/date-periods';
import { format } from 'date-fns';

interface RecurringStatus {
  recurring: RecurringExpense;
  isOverdue: boolean;
}

const PERIOD_TABS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showUsd } = useCurrencyDisplay();

  const [isCustomRange, setIsCustomRange] = useState(false);
  const [period, setPeriod] = useState<Period>('month');
  const [anchor, setAnchor] = useState(new Date());
  const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-01'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [menuOpen, setMenuOpen] = useState(false);
  const [payingRecurring, setPayingRecurring] = useState<RecurringExpense | null>(null);

  // Se incrementa cuando se resuelven cotizaciones que estaban pendientes,
  // para forzar un refetch de categorías/gastos (invalidamos el cache justo
  // antes).
  const [refreshTick, setRefreshTick] = useState(0);

  const pointerStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const range = useMemo(() => {
    if (isCustomRange) {
      return { start: new Date(`${customStart}T00:00:00`), end: new Date(`${customEnd}T23:59:59`) };
    }
    return getRangeForPeriod(period, anchor);
  }, [isCustomRange, period, anchor, customStart, customEnd]);

  const { data: categoriesData, loading: loadingCategories } = useCachedResource(
    peekCategories,
    () => (user ? getCategoriesCached(user.id) : null),
    [user?.id, refreshTick]
  );
  const { data: expensesData, loading: loadingExpenses } = useCachedResource(
    () => peekHomeRange(range),
    () => (user ? getHomeRangeCached(user.id, range) : null),
    [user?.id, range, refreshTick]
  );
  const categories = categoriesData ?? [];
  const expenses = expensesData ?? [];

  // A diferencia de `loading`, que vuelve a true cada vez que se navega a un
  // período todavía no cacheado, este flag queda en true para siempre apenas
  // se resuelve la primera carga: así la estructura de la pantalla nunca más
  // se reemplaza por un esqueleto, aunque el período que se esté mirando
  // todavía esté cargando (mientras tanto se sigue viendo el período
  // anterior, hasta que llega la data nueva).
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  useEffect(() => {
    if (!loadingCategories && !loadingExpenses) setHasLoadedOnce(true);
  }, [loadingCategories, loadingExpenses]);

  // Apenas termina la primerísima carga de Home, precargamos en segundo
  // plano el resto de las pantallas del menú para que abran al instante.
  const prefetchedRef = useRef(false);
  useEffect(() => {
    if (!user || prefetchedRef.current || !hasLoadedOnce) return;
    prefetchedRef.current = true;
    prefetchAppData(user.id);
  }, [user, hasLoadedOnce]);

  // Precarga en segundo plano el período anterior y el siguiente, para que
  // al navegar con las flechas (o el swipe) ya estén en cache y aparezcan al
  // instante en vez de tener que ir a consultar la base en ese momento.
  useEffect(() => {
    if (!user || isCustomRange) return;
    const neighborAnchors = [shiftAnchor(period, anchor, -1)];
    if (canGoNext(period, anchor)) neighborAnchors.push(shiftAnchor(period, anchor, 1));
    neighborAnchors.forEach((a) => {
      getHomeRangeCached(user.id, getRangeForPeriod(period, a)).catch(() => {});
    });
  }, [user, period, anchor, isCustomRange]);

  useEffect(() => {
    if (!user) return;
    resolvePendingExchangeRates(user.id).then((count) => {
      if (count > 0) {
        invalidateAppData();
        setRefreshTick((t) => t + 1);
      }
    });
    // Solo una vez por apertura del dashboard, no hace falta repetirlo por cada refetch de rango.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const { data: recurringData } = useCachedResource(
    peekRecurring,
    () => (user ? getRecurringCached(user.id) : null),
    [user?.id, refreshTick]
  );

  const recurringStatuses = useMemo<RecurringStatus[]>(() => {
    if (!recurringData) return [];
    const confirmedIds = new Set(recurringData.confirmedThisMonth.map((e) => e.recurring_expense_id));
    const currentDay = new Date().getDate();
    return recurringData.recurrings
      .filter((r) => isRecurringDueInMonth(r) && !confirmedIds.has(r.id))
      .map((r) => ({ recurring: r, isOverdue: r.day_of_month <= currentDay }))
      .sort((a, b) =>
        a.isOverdue === b.isOverdue
          ? a.recurring.day_of_month - b.recurring.day_of_month
          : a.isOverdue
          ? -1
          : 1
      );
  }, [recurringData]);

  const pendingCount = useMemo(
    () => expenses.filter((e: Expense) => e.exchange_rate_used == null).length,
    [expenses]
  );

  const breakdown = useMemo(() => {
    const totals = new Map<string, { ars: number; usd: number }>();
    for (const exp of expenses) {
      const top = getTopLevelCategory(categories, exp.category_id);
      if (!top) continue;
      const prev = totals.get(top.id) ?? { ars: 0, usd: 0 };
      totals.set(top.id, { ars: prev.ars + (exp.amount_ars ?? 0), usd: prev.usd + (exp.amount_usd ?? 0) });
    }
    const total = Array.from(totals.values()).reduce(
      (sum, t) => sum + pickAmount(t.ars, t.usd, showUsd),
      0
    );
    return Array.from(totals.entries())
      .map(([categoryId, t]) => {
        const cat = categories.find((c) => c.id === categoryId)!;
        const amount = pickAmount(t.ars, t.usd, showUsd);
        return {
          category: cat,
          amount,
          percent: total > 0 ? Math.round((amount / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, categories, showUsd]);

  const total = breakdown.reduce((sum, b) => sum + b.amount, 0);

  const handlePrev = () => setAnchor((a) => shiftAnchor(period, a, -1));
  const handleNext = () => {
    if (canGoNext(period, anchor)) setAnchor((a) => shiftAnchor(period, a, 1));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isCustomRange) return;
    pointerStartX.current = e.clientX;
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerStartX.current === null) return;
    const deltaX = e.clientX - pointerStartX.current;
    pointerStartX.current = null;
    if (Math.abs(deltaX) < 40) return;
    if (deltaX > 0) handlePrev();
    else handleNext();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin h-8 w-8 border-2 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <PageHeader title="Mis Gastos" onMenu={() => setMenuOpen(true)} />

      {/* Period tabs */}
      <Container className="flex gap-2 justify-center mb-4">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setIsCustomRange(false);
              setPeriod(tab.value);
              setAnchor(new Date());
            }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              !isCustomRange && period === tab.value
                ? 'bg-violet-600 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setIsCustomRange(true)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
            isCustomRange ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          Período
        </button>
      </Container>

      {/* Period navigation */}
      {isCustomRange ? (
        <Container className="flex items-center gap-2 mb-6">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-violet-500 focus:outline-none"
          />
          <span className="text-slate-500">–</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-violet-500 focus:outline-none"
          />
        </Container>
      ) : (
        <div
          className="relative flex items-center justify-between max-w-2xl mx-auto px-8 mb-6 h-10 select-none touch-pan-y"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
        >
          <button
            onClick={handlePrev}
            className="text-slate-400 hover:text-white p-2 text-lg z-10"
          >
            ‹
          </button>
          <p className="absolute inset-0 flex items-center justify-center text-white font-medium underline underline-offset-4 pointer-events-none">
            {getPeriodLabel(period, anchor)}
          </p>
          <button
            onClick={handleNext}
            disabled={!canGoNext(period, anchor)}
            className="text-slate-400 hover:text-white disabled:opacity-0 p-2 text-lg z-10"
          >
            ›
          </button>
        </div>
      )}

      {/* Donut chart */}
      <div
        className="flex justify-center mb-6 touch-pan-y select-none"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {!hasLoadedOnce ? (
          <SkeletonCircle />
        ) : (
          <DonutChart
            slices={breakdown.map((b) => ({ color: b.category.color, value: b.amount }))}
            centerLabel={formatMoney(total, showUsd)}
            onAddClick={() => router.push('/dashboard/expenses/new')}
          />
        )}
      </div>

      {/* Category breakdown */}
      <Container className="flex flex-col gap-3">
        {!hasLoadedOnce ? (
          <SkeletonList count={4} />
        ) : (
          <>
            {pendingCount > 0 && (
              <p className="text-amber-400 text-xs text-center bg-amber-400/10 rounded-lg px-3 py-2">
                {pendingCount} {pendingCount === 1 ? 'gasto' : 'gastos'} con cotización del dólar
                pendiente — no {pendingCount === 1 ? 'está incluido' : 'están incluidos'} en el total
                todavía.
              </p>
            )}
            {breakdown.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-12">
                No hay gastos cargados en este período.
              </p>
            )}
            {breakdown.map(({ category, amount, percent }) => (
              <div
                key={category.id}
                onClick={() =>
                  router.push(
                    `/dashboard/expenses?categoryId=${category.id}&start=${format(range.start, 'yyyy-MM-dd')}&end=${format(range.end, 'yyyy-MM-dd')}`
                  )
                }
                className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-800 active:scale-[0.98] transition-all"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                >
                  <Emoji emoji={category.icon} size={18} />
                </div>
                <p className="flex-1 text-white text-sm font-medium">{category.name}</p>
                <p className="text-slate-500 text-sm w-10 text-right">{percent} %</p>
                <p className="text-white text-sm font-medium w-28 text-right">{formatMoney(amount, showUsd)}</p>
              </div>
            ))}
          </>
        )}
      </Container>

      {/* Gastos recurrentes de este mes, sin confirmar todavía */}
      {recurringStatuses.length > 0 && (
        <Container className="flex flex-col gap-3 mt-6">
          <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold px-1">
            Recurrentes de este mes
          </p>
          {recurringStatuses.map(({ recurring, isOverdue }) => {
            const cat = categories.find((c) => c.id === recurring.category_id);
            const topCat = getTopLevelCategory(categories, recurring.category_id);
            const displayCurrency = showUsd ? 'USD' : 'ARS';
            const needsConversion = recurring.currency !== displayCurrency;
            const amount =
              !needsConversion || recurringData?.rate != null
                ? convertWithRate(recurring.default_amount, recurring.currency, displayCurrency, recurringData?.rate ?? 1)
                : null;
            return (
              <div
                key={recurring.id}
                onClick={() => router.push('/dashboard/recurring')}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer active:scale-[0.98] transition-all border ${
                  isOverdue
                    ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15'
                    : 'bg-amber-400/10 border-amber-400/30 hover:bg-amber-400/15'
                }`}
              >
                {topCat && (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: topCat.color }}
                  >
                    <Emoji emoji={topCat.icon} size={16} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{recurring.description}</p>
                  <p className="text-slate-500 text-xs mt-0.5 truncate">
                    {cat && (cat.parent_id ? `${topCat?.name} › ${cat.name}` : cat.name)}
                  </p>
                  <p className={`text-xs mt-0.5 font-medium ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                    {isOverdue ? 'Vencido' : 'Pendiente'} · día {recurring.day_of_month}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="text-white text-sm font-semibold whitespace-nowrap">
                    {amount !== null ? formatMoney(amount, showUsd) : 'Cotización pendiente'}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPayingRecurring(recurring);
                    }}
                    className="text-xs font-semibold text-violet-400 hover:text-violet-300 whitespace-nowrap"
                  >
                    Pagar
                  </button>
                </div>
              </div>
            );
          })}
        </Container>
      )}

      {payingRecurring && (
        <ConfirmPaymentSheet
          recurring={payingRecurring}
          onClose={() => setPayingRecurring(null)}
          onPaid={() => {
            setPayingRecurring(null);
            setRefreshTick((t) => t + 1);
          }}
        />
      )}

      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
