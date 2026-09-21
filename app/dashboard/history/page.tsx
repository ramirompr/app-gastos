'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Category, Expense, ExpenseInstallmentPlan } from '@/lib/types';
import { Emoji } from '@/components/ui/Emoji';
import { ChevronUp, ChevronDown, Repeat, Download } from 'lucide-react';
import { deleteExpense } from '@/lib/expenses';
import { exportHistoryToCsv } from '@/lib/history-export';
import { SettlePaymentSheet } from '@/components/expenses/SettlePaymentSheet';
import { useCurrencyDisplay } from '@/lib/currency-display-context';
import { pickAmount, formatMoney, formatExpenseAmount, formatPartnerShare } from '@/lib/format-money';
import {
  peekCategories,
  getCategoriesCached,
  peekHistory,
  getHistoryCached,
  useCachedResource,
} from '@/lib/app-data';
import { AppMenu } from '@/components/layout/AppMenu';
import { PageHeader } from '@/components/layout/PageHeader';
import { Container } from '@/components/layout/Container';
import { ExpenseRowMenu } from '@/components/expenses/ExpenseRowMenu';
import { SkeletonList } from '@/components/ui/Skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PAGE_SIZE = 30;

type HistoryItem =
  | { kind: 'expense'; sortKey: string; expense: Expense }
  | { kind: 'plan'; sortKey: string; plan: ExpenseInstallmentPlan; installments: Expense[] };

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showUsd } = useCurrencyDisplay();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [settlingExpense, setSettlingExpense] = useState<Expense | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // Ediciones optimistas locales (saldar/borrar), todavía no reflejadas en
  // el cache compartido (ya invalidado, pero recién se relee en la próxima
  // visita a esta pantalla).
  const [localPlainExpenses, setLocalPlainExpenses] = useState<Expense[] | null>(null);
  const [localInstallmentExpenses, setLocalInstallmentExpenses] = useState<Expense[] | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const { data: cachedCategories, loading: loadingCategories } = useCachedResource(
    peekCategories,
    () => (user ? getCategoriesCached(user.id) : null),
    [user?.id]
  );
  const { data: cachedHistory, loading: loadingHistory } = useCachedResource(
    peekHistory,
    () => (user ? getHistoryCached(user.id) : null),
    [user?.id]
  );
  const categories = cachedCategories ?? [];
  const plainExpenses = localPlainExpenses ?? cachedHistory?.plainExpenses ?? [];
  const plans = cachedHistory?.plans ?? [];
  const installmentExpenses = localInstallmentExpenses ?? cachedHistory?.installmentExpenses ?? [];
  const loading = loadingCategories || loadingHistory;

  const items = useMemo(() => {
    const list: HistoryItem[] = plainExpenses.map((expense) => ({
      kind: 'expense',
      sortKey: expense.created_at,
      expense,
    }));

    for (const plan of plans) {
      const installments = installmentExpenses
        .filter((e) => e.installment_plan_id === plan.id)
        .sort((a, b) => (a.installment_number ?? 0) - (b.installment_number ?? 0));
      if (installments.length === 0) continue;
      list.push({ kind: 'plan', sortKey: plan.created_at, plan, installments });
    }

    return list.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [plainExpenses, plans, installmentExpenses]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!user || exporting) return;
    setExportError(null);
    setExporting(true);
    try {
      await exportHistoryToCsv(user.id, categories);
    } catch (err) {
      console.error(err);
      setExportError('No se pudo descargar el historial. Intentá de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  const applySettled = (updated: Expense) => {
    setLocalPlainExpenses((prev) =>
      (prev ?? cachedHistory?.plainExpenses ?? []).map((e) => (e.id === updated.id ? updated : e))
    );
    setLocalInstallmentExpenses((prev) =>
      (prev ?? cachedHistory?.installmentExpenses ?? []).map((e) => (e.id === updated.id ? updated : e))
    );
    setSettlingExpense(null);
  };

  const handleDeleteExpense = async (id: string) => {
    setRowError(null);
    try {
      await deleteExpense(id);
      setLocalPlainExpenses((prev) => (prev ?? cachedHistory?.plainExpenses ?? []).filter((e) => e.id !== id));
      setLocalInstallmentExpenses((prev) =>
        (prev ?? cachedHistory?.installmentExpenses ?? []).filter((e) => e.id !== id)
      );
    } catch (err) {
      console.error(err);
      setRowError({ id, message: 'No se pudo eliminar. Intentá de nuevo.' });
      throw err;
    }
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
    <div className="min-h-screen bg-slate-950 pb-16">
      <PageHeader
        title="Historial"
        onBack={() => router.push('/dashboard')}
        onMenu={() => setMenuOpen(true)}
        actions={
          <button
            onClick={handleExport}
            disabled={exporting || (!loading && items.length === 0)}
            aria-label="Descargar historial"
            title="Descargar historial (CSV)"
            className="text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <div className="w-[22px] h-[22px] animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Download size={22} strokeWidth={2} />
            )}
          </button>
        }
      />

      <Container className="flex flex-col gap-3">
        {exportError && <p className="text-xs text-red-400">{exportError}</p>}
        {loading && <SkeletonList count={6} />}
        {!loading && items.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-16">No hay movimientos cargados todavía.</p>
        )}

        {visibleItems.map((item) => {
          if (item.kind === 'expense') {
            const cat = categories.find((c) => c.id === item.expense.category_id);
            return (
              <ExpenseRow
                key={item.expense.id}
                expense={item.expense}
                category={cat}
                showUsd={showUsd}
                errorMessage={rowError?.id === item.expense.id ? rowError.message : null}
                onEdit={() => router.push(`/dashboard/expenses/${item.expense.id}/edit`)}
                onDelete={() => handleDeleteExpense(item.expense.id)}
                onSettle={() => setSettlingExpense(item.expense)}
              />
            );
          }

          const { plan, installments } = item;
          const cat = categories.find((c) => c.id === plan.category_id);
          const totalArs = installments.reduce((sum, e) => sum + (e.amount_ars ?? 0), 0);
          const totalUsd = installments.reduce((sum, e) => sum + (e.amount_usd ?? 0), 0);
          const hasPendingInstallment = installments.some((e) => e.exchange_rate_used == null);
          const isExpanded = expandedPlanId === plan.id;

          return (
            <div key={plan.id} className="flex flex-col gap-2">
              <button
                onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                className="w-full bg-slate-800/60 rounded-xl px-4 py-3 flex items-center gap-3 text-left"
              >
                {cat && (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  >
                    <Emoji emoji={cat.icon} size={16} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{plan.description}</p>
                  <p className="text-slate-500 text-xs mt-0.5 inline-flex items-center gap-1">
                    <Repeat size={12} /> En {plan.num_installments} cuotas
                    {cat ? ` · ${cat.name}` : ''}
                  </p>
                </div>
                <p className="text-white text-sm font-semibold whitespace-nowrap">
                  {hasPendingInstallment
                    ? 'Cotización pendiente'
                    : formatMoney(pickAmount(totalArs, totalUsd, showUsd), showUsd)}
                </p>
                <span className="text-slate-500 flex-shrink-0">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>

              {isExpanded && (
                <div className="flex flex-col gap-2 pl-4 border-l-2 border-slate-800 ml-2">
                  {installments.map((exp) => (
                    <ExpenseRow
                      key={exp.id}
                      expense={exp}
                      category={cat}
                      showUsd={showUsd}
                      errorMessage={rowError?.id === exp.id ? rowError.message : null}
                      onEdit={() => router.push(`/dashboard/expenses/${exp.id}/edit`)}
                      onDelete={() => handleDeleteExpense(exp.id)}
                      onSettle={() => setSettlingExpense(exp)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {hasMore && (
          <button
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="w-full py-3 mt-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition text-sm"
          >
            Cargar más
          </button>
        )}
      </Container>

      {settlingExpense && (
        <SettlePaymentSheet
          expense={settlingExpense}
          onClose={() => setSettlingExpense(null)}
          onSettled={applySettled}
        />
      )}

      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

interface ExpenseRowProps {
  expense: Expense;
  category?: Category;
  showUsd: boolean;
  errorMessage?: string | null;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onSettle: () => void;
}

function ExpenseRow({
  expense,
  category,
  showUsd,
  errorMessage,
  onEdit,
  onDelete,
  onSettle,
}: ExpenseRowProps) {
  const isPending = expense.exchange_rate_used == null;
  const isIncome = expense.type === 'income';

  return (
    <div
      onClick={onEdit}
      className="bg-slate-800/60 rounded-xl px-4 py-3 flex flex-col gap-2 cursor-pointer hover:bg-slate-800 active:scale-[0.98] transition-all"
    >
      <div className="flex items-center gap-3">
        {category && (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: category.color }}
          >
            <Emoji emoji={category.icon} size={16} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{expense.description}</p>
          <p className="text-slate-500 text-xs mt-0.5">
            {format(new Date(`${expense.date}T00:00:00`), "d 'de' MMMM", { locale: es })}
            {category ? ` · ${category.name}` : ''}
          </p>
        </div>
        <p
          className={`text-sm font-semibold whitespace-nowrap ${
            isIncome ? 'text-emerald-400' : 'text-white'
          }`}
        >
          {isIncome && !isPending ? '+' : ''}
          {formatExpenseAmount(expense, showUsd)}
        </p>
        <ExpenseRowMenu label={expense.description} onEdit={onEdit} onDelete={onDelete} />
      </div>

      {expense.split_type === 'shared' && (
        <div className="flex items-center justify-between bg-slate-900/50 rounded-lg px-3 py-2">
          <div>
            <p className="text-xs text-slate-400">
              {expense.is_settled ? 'Te devolvieron ' : 'Te deben '}
              {formatPartnerShare(expense, showUsd)}
            </p>
            {expense.shared_with && (
              <p className="text-xs text-slate-500 mt-0.5">{expense.shared_with}</p>
            )}
            {errorMessage && <p className="text-xs text-red-400 mt-0.5">{errorMessage}</p>}
          </div>
          {!expense.is_settled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSettle();
              }}
              disabled={isPending}
              title={isPending ? 'Esperá a que se resuelva la cotización pendiente' : undefined}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
            >
              Marcar como pagado
            </button>
          )}
        </div>
      )}

      {expense.split_type === 'invited' && (
        <p className="text-xs text-slate-500">Invitaste {formatPartnerShare(expense, showUsd)}</p>
      )}
      {errorMessage && expense.split_type !== 'shared' && (
        <p className="text-xs text-red-400">{errorMessage}</p>
      )}
    </div>
  );
}
