'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Category } from '@/lib/types';
import { getTopLevelCategory } from '@/lib/categories';
import { Emoji } from '@/components/ui/Emoji';
import { niceAxis } from '@/lib/chart-scale';
import { useCurrencyDisplay } from '@/lib/currency-display-context';
import { pickAmount, formatMoney } from '@/lib/format-money';
import {
  peekCategories,
  getCategoriesCached,
  peekAnalysisRange,
  getAnalysisRangeCached,
  useCachedResource,
} from '@/lib/app-data';
import { StackedBarChart, MonthBar } from '@/components/analysis/StackedBarChart';
import { MiniProportionBar } from '@/components/analysis/MiniProportionBar';
import { AppMenu } from '@/components/layout/AppMenu';
import { PageHeader } from '@/components/layout/PageHeader';
import { SkeletonBlock, SkeletonList } from '@/components/ui/Skeleton';
import { format, startOfMonth, endOfMonth, subMonths, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { capitalize } from '@/lib/date-periods';

const MONTH_OPTIONS = [3, 6, 12] as const;

interface MonthlyDetailRow {
  category: Category;
  amount: number;
  percent: number;
}

interface MonthlyDetail {
  label: string;
  rows: MonthlyDetailRow[];
}

export default function AnalysisPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showUsd } = useCurrencyDisplay();

  const [numMonths, setNumMonths] = useState<3 | 6 | 12>(6);
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
    () => peekAnalysisRange(numMonths),
    () => (user ? getAnalysisRangeCached(user.id, numMonths) : null),
    [user?.id, numMonths]
  );
  const categories = cachedCategories ?? [];
  const expenses = cachedExpenses ?? [];
  const loading = loadingCategories || loadingExpenses;

  const { months, axisMax, ticks, legend, monthlyDetail } = useMemo(() => {
    const monthDates = Array.from({ length: numMonths }, (_, i) =>
      subMonths(new Date(), numMonths - 1 - i)
    );

    // Total por categoría de nivel superior en todo el rango, para fijar un
    // orden de apilado y de leyenda consistente entre barras.
    const overallTotals = new Map<string, { ars: number; usd: number }>();
    for (const exp of expenses) {
      const top = getTopLevelCategory(categories, exp.category_id);
      if (!top) continue;
      const prev = overallTotals.get(top.id) ?? { ars: 0, usd: 0 };
      overallTotals.set(top.id, {
        ars: prev.ars + (exp.amount_ars ?? 0),
        usd: prev.usd + (exp.amount_usd ?? 0),
      });
    }
    const orderedCategoryIds = Array.from(overallTotals.entries())
      .sort((a, b) => pickAmount(b[1].ars, b[1].usd, showUsd) - pickAmount(a[1].ars, a[1].usd, showUsd))
      .map(([id]) => id);

    const monthBars: MonthBar[] = [];
    const monthlyDetail: MonthlyDetail[] = [];

    for (const monthDate of monthDates) {
      const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');
      const monthTotals = new Map<string, { ars: number; usd: number }>();

      for (const exp of expenses) {
        if (exp.date < monthStart || exp.date > monthEnd) continue;
        const top = getTopLevelCategory(categories, exp.category_id);
        if (!top) continue;
        const prev = monthTotals.get(top.id) ?? { ars: 0, usd: 0 };
        monthTotals.set(top.id, {
          ars: prev.ars + (exp.amount_ars ?? 0),
          usd: prev.usd + (exp.amount_usd ?? 0),
        });
      }

      const segments = orderedCategoryIds
        .filter((id) => monthTotals.has(id))
        .map((id) => {
          const t = monthTotals.get(id)!;
          return { color: categories.find((c) => c.id === id)!.color, value: pickAmount(t.ars, t.usd, showUsd) };
        })
        .filter((s) => s.value > 0);

      const total = segments.reduce((sum, s) => sum + s.value, 0);

      monthBars.push({
        label: capitalize(format(monthDate, 'MMM', { locale: es })),
        isCurrent: isSameMonth(monthDate, new Date()),
        total,
        segments,
      });

      const rows: MonthlyDetailRow[] = orderedCategoryIds
        .filter((id) => monthTotals.has(id))
        .map((id) => {
          const cat = categories.find((c) => c.id === id)!;
          const t = monthTotals.get(id)!;
          const amount = pickAmount(t.ars, t.usd, showUsd);
          return { category: cat, amount, percent: total > 0 ? Math.round((amount / total) * 100) : 0 };
        })
        .filter((r) => r.amount > 0)
        .sort((a, b) => b.amount - a.amount);

      monthlyDetail.push({
        label: capitalize(format(monthDate, 'MMMM yyyy', { locale: es })),
        rows,
      });
    }

    const maxTotal = Math.max(...monthBars.map((m) => m.total), 0);
    const { max, ticks } = niceAxis(maxTotal);

    const legend = orderedCategoryIds
      .map((id) => categories.find((c) => c.id === id))
      .filter((c): c is Category => !!c);

    return { months: monthBars, axisMax: max, ticks, legend, monthlyDetail };
  }, [expenses, categories, numMonths, showUsd]);

  const pendingCount = useMemo(
    () => expenses.filter((e) => e.exchange_rate_used == null).length,
    [expenses]
  );

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
      <PageHeader title="Análisis" onBack={() => router.push('/dashboard')} onMenu={() => setMenuOpen(true)} />

      <div className="px-4 flex flex-col gap-6">
        <div className="flex gap-2 justify-center">
          {MONTH_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setNumMonths(n)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                numMonths === n ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {n}M
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-6">
            <SkeletonBlock className="h-[220px] w-full" />
            <SkeletonList count={4} />
          </div>
        ) : (
          <>
            {pendingCount > 0 && (
              <p className="text-amber-400 text-xs text-center bg-amber-400/10 rounded-lg px-3 py-2">
                {pendingCount} {pendingCount === 1 ? 'gasto' : 'gastos'} con cotización pendiente, no
                {pendingCount === 1 ? ' está incluido' : ' están incluidos'} en este análisis todavía.
              </p>
            )}
            <StackedBarChart months={months} axisMax={axisMax} ticks={ticks} isUsd={showUsd} />

            {legend.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-4">
                No hay gastos cargados en este período.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
                  {legend.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <p className="text-xs text-slate-300">{cat.name}</p>
                    </div>
                  ))}
                </div>

                {/* Resumen mes a mes por categoría */}
                <div className="flex flex-col gap-5">
                  {[...monthlyDetail].reverse().map((month) => (
                    <div key={month.label} className="flex flex-col gap-2">
                      <p className="text-white font-semibold text-sm">{month.label}</p>
                      {month.rows.length === 0 ? (
                        <p className="text-slate-500 text-xs">Sin gastos este mes.</p>
                      ) : (
                        <>
                          <MiniProportionBar
                            segments={month.rows.map((r) => ({
                              color: r.category.color,
                              value: r.amount,
                            }))}
                          />
                          {month.rows.map((row) => (
                            <div
                              key={row.category.id}
                              className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-3 py-2"
                            >
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: row.category.color }}
                              >
                                <Emoji emoji={row.category.icon} size={14} />
                              </div>
                              <p className="flex-1 text-white text-xs font-medium truncate">
                                {row.category.name}
                              </p>
                              <p className="text-slate-500 text-xs w-9 text-right">{row.percent}%</p>
                              <p className="text-white text-xs font-medium w-24 text-right">
                                {formatMoney(row.amount, showUsd)}
                              </p>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
