'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Category, Expense, RecurringExpense } from '@/lib/types';
import { getTopLevelCategory, fetchUserCategories } from '@/lib/categories';
import { Emoji } from '@/components/ui/Emoji';
import { useCurrencyDisplay } from '@/lib/currency-display-context';
import { pickAmount, formatMoney } from '@/lib/format-money';
import { resolvePendingExchangeRates } from '@/lib/expenses';
import { getExchangeRate, convertWithRate } from '@/lib/exchange-rates';
import { isRecurringDueInMonth } from '@/lib/recurring';
import { ConfirmPaymentSheet } from '@/components/recurring/ConfirmPaymentSheet';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { AppMenu } from '@/components/layout/AppMenu';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Period,
  getRangeForPeriod,
  getPeriodLabel,
  shiftAnchor,
  canGoNext,
} from '@/lib/date-periods';
import { format, startOfMonth, endOfMonth } from 'date-fns';

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

  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCustomRange, setIsCustomRange] = useState(false);
  const [period, setPeriod] = useState<Period>('month');
  const [anchor, setAnchor] = useState(new Date());
  const [customStart, setCustomStart] = useState(format(new Date(), 'yyyy-MM-01'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [menuOpen, setMenuOpen] = useState(false);

  const [recurringStatuses, setRecurringStatuses] = useState<RecurringStatus[]>([]);
  const [recurringRate, setRecurringRate] = useState<number | null>(null);
  const [loadingRecurring, setLoadingRecurring] = useState(true);
  const [payingRecurring, setPayingRecurring] = useState<RecurringExpense | null>(null);

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

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [cats, { data: exps }] = await Promise.all([
      fetchUserCategories(user.id),
      supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(range.start, 'yyyy-MM-dd'))
        .lte('date', format(range.end, 'yyyy-MM-dd')),
    ]);
    setCategories(cats);
    setExpenses(exps ?? []);
    setLoading(false);
  }, [user, range]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  useEffect(() => {
    if (!user) return;
    resolvePendingExchangeRates(user.id).then((count) => {
      if (count > 0) fetchData();
    });
    // Solo una vez por apertura del dashboard, no hace falta repetirlo por cada refetch de rango.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchRecurring = useCallback(async () => {
    if (!user) return;
    setLoadingRecurring(true);
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const [{ data: recs }, { data: confirmed }, rate] = await Promise.all([
      supabase.from('recurring_expenses').select('*').eq('user_id', user.id).eq('active', true),
      supabase
        .from('expenses')
        .select('recurring_expense_id')
        .eq('user_id', user.id)
        .not('recurring_expense_id', 'is', null)
        .gte('date', monthStart)
        .lte('date', monthEnd),
      getExchangeRate(new Date()).catch(() => null),
    ]);

    const confirmedIds = new Set((confirmed ?? []).map((e) => e.recurring_expense_id));
    const currentDay = new Date().getDate();
    const statuses = (recs ?? [])
      .filter((r) => isRecurringDueInMonth(r) && !confirmedIds.has(r.id))
      .map((r) => ({ recurring: r, isOverdue: r.day_of_month <= currentDay }))
      .sort((a, b) =>
        a.isOverdue === b.isOverdue
          ? a.recurring.day_of_month - b.recurring.day_of_month
          : a.isOverdue
          ? -1
          : 1
      );

    setRecurringStatuses(statuses);
    setRecurringRate(rate);
    setLoadingRecurring(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchRecurring();
  }, [user, fetchRecurring]);

  const pendingCount = useMemo(
    () => expenses.filter((e) => e.exchange_rate_used == null).length,
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
      <div className="px-4 flex gap-2 justify-center mb-4">
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
      </div>

      {/* Period navigation */}
      {isCustomRange ? (
        <div className="px-4 flex items-center gap-2 mb-6">
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
        </div>
      ) : (
        <div
          className="relative flex items-center justify-between px-8 mb-6 h-10 select-none touch-pan-y"
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
        {loading ? (
          <div className="w-[220px] h-[220px] flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-violet-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <DonutChart
            slices={breakdown.map((b) => ({ color: b.category.color, value: b.amount }))}
            centerLabel={formatMoney(total, showUsd)}
            onAddClick={() => router.push('/dashboard/expenses/new')}
          />
        )}
      </div>

      {/* Category breakdown */}
      <div className="px-4 flex flex-col gap-3">
        {!loading && pendingCount > 0 && (
          <p className="text-amber-400 text-xs text-center bg-amber-400/10 rounded-lg px-3 py-2">
            {pendingCount} {pendingCount === 1 ? 'gasto' : 'gastos'} con cotización del dólar
            pendiente — no {pendingCount === 1 ? 'está incluido' : 'están incluidos'} en el total
            todavía.
          </p>
        )}
        {!loading && breakdown.length === 0 && (
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
      </div>

      {/* Gastos recurrentes de este mes, sin confirmar todavía */}
      {!loadingRecurring && recurringStatuses.length > 0 && (
        <div className="px-4 flex flex-col gap-3 mt-6">
          <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold px-1">
            Recurrentes de este mes
          </p>
          {recurringStatuses.map(({ recurring, isOverdue }) => {
            const cat = categories.find((c) => c.id === recurring.category_id);
            const topCat = getTopLevelCategory(categories, recurring.category_id);
            const displayCurrency = showUsd ? 'USD' : 'ARS';
            const needsConversion = recurring.currency !== displayCurrency;
            const amount =
              !needsConversion || recurringRate !== null
                ? convertWithRate(recurring.default_amount, recurring.currency, displayCurrency, recurringRate ?? 1)
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
        </div>
      )}

      {payingRecurring && (
        <ConfirmPaymentSheet
          recurring={payingRecurring}
          onClose={() => setPayingRecurring(null)}
          onPaid={() => {
            setPayingRecurring(null);
            fetchRecurring();
          }}
        />
      )}

      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
