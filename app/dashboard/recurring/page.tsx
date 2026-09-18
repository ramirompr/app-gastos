'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Expense, RecurringConfirmation, RecurringExpense } from '@/lib/types';
import { getTopLevelCategory } from '@/lib/categories';
import { Emoji } from '@/components/ui/Emoji';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { convertWithRate } from '@/lib/exchange-rates';
import { isRecurringDueInMonth, monthsUntilNextDue, frequencyLabel, currentMonthKey } from '@/lib/recurring';
import { useCurrencyDisplay } from '@/lib/currency-display-context';
import { formatMoney } from '@/lib/format-money';
import {
  peekCategories,
  getCategoriesCached,
  peekRecurring,
  getRecurringCached,
  useCachedResource,
  invalidateAppData,
} from '@/lib/app-data';
import { RecurringExpenseFormModal } from '@/components/recurring/RecurringExpenseFormModal';
import { ConfirmPaymentSheet } from '@/components/recurring/ConfirmPaymentSheet';
import { AppMenu } from '@/components/layout/AppMenu';
import { PageHeader } from '@/components/layout/PageHeader';
import { Container } from '@/components/layout/Container';
import { PlusIcon } from '@/components/icons/PlusIcon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { capitalize } from '@/lib/date-periods';

type ActionSheet =
  | { type: 'menu'; recurring: RecurringExpense }
  | { type: 'deleteConfirm'; recurring: RecurringExpense };

export default function RecurringExpensesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showUsd } = useCurrencyDisplay();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);
  const [actionSheet, setActionSheet] = useState<ActionSheet | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [payingRecurring, setPayingRecurring] = useState<RecurringExpense | null>(null);

  // Ediciones optimistas locales, todavía no reflejadas en el cache
  // compartido (que ya se invalidó, pero recién se relee en la próxima
  // visita a esta pantalla).
  const [localRecurrings, setLocalRecurrings] = useState<RecurringExpense[] | null>(null);
  const [localConfirmed, setLocalConfirmed] = useState<Expense[] | null>(null);
  const [localConfirmedWithoutExpense, setLocalConfirmedWithoutExpense] = useState<RecurringConfirmation[] | null>(
    null
  );

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const { data: cachedCategories, loading: loadingCategories } = useCachedResource(
    peekCategories,
    () => (user ? getCategoriesCached(user.id) : null),
    [user?.id]
  );
  const categories = cachedCategories ?? [];

  const { data: cachedRecurring, loading: loadingRecurring } = useCachedResource(
    peekRecurring,
    () => (user ? getRecurringCached(user.id) : null),
    [user?.id]
  );
  const recurrings = localRecurrings ?? cachedRecurring?.recurrings ?? [];
  const confirmedThisMonth = localConfirmed ?? cachedRecurring?.confirmedThisMonth ?? [];
  const confirmedWithoutExpense = localConfirmedWithoutExpense ?? cachedRecurring?.confirmedWithoutExpense ?? [];
  const todayRate = cachedRecurring?.rate ?? null;
  const loading = loadingCategories || loadingRecurring;

  const statuses = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const withStatus = recurrings.map((r) => {
      const dueThisMonth = isRecurringDueInMonth(r, now);
      const confirmedExpense = dueThisMonth
        ? confirmedThisMonth.find((e) => e.recurring_expense_id === r.id) ?? null
        : null;
      const confirmedNoExpense = dueThisMonth
        ? confirmedWithoutExpense.some((c) => c.recurring_expense_id === r.id)
        : false;
      const isPaid = !!confirmedExpense || confirmedNoExpense;
      const isOverdue = dueThisMonth && !isPaid && r.day_of_month < currentDay;
      const isDueToday = dueThisMonth && !isPaid && r.day_of_month === currentDay;
      return { recurring: r, confirmedExpense, isPaid, isOverdue, isDueToday, dueThisMonth };
    });
    // Semáforo: vencidos primero, después los que vencen hoy, pendientes,
    // pagados, y al final los que este mes no corresponden por su
    // frecuencia; cada grupo ordenado por día de cobro.
    const statusRank = (s: (typeof withStatus)[number]) =>
      !s.dueThisMonth ? 4 : s.isOverdue ? 0 : s.isDueToday ? 1 : s.isPaid ? 3 : 2;
    return withStatus.sort((a, b) => {
      const rankDiff = statusRank(a) - statusRank(b);
      return rankDiff !== 0 ? rankDiff : a.recurring.day_of_month - b.recurring.day_of_month;
    });
  }, [recurrings, confirmedThisMonth, confirmedWithoutExpense]);

  const handleSaved = (saved: RecurringExpense) => {
    setLocalRecurrings((prev) => {
      const base = prev ?? cachedRecurring?.recurrings ?? [];
      const exists = base.find((r) => r.id === saved.id);
      const next = exists ? base.map((r) => (r.id === saved.id ? saved : r)) : [...base, saved];
      return [...next].sort((a, b) => a.day_of_month - b.day_of_month);
    });
    setShowCreate(false);
    setEditingRecurring(null);
  };

  const handleDelete = async (recurring: RecurringExpense) => {
    setDeleting(true);
    setDeleteError('');
    try {
      const { error } = await supabase.from('recurring_expenses').delete().eq('id', recurring.id);
      if (error) throw error;
      setLocalRecurrings((prev) => (prev ?? cachedRecurring?.recurrings ?? []).filter((r) => r.id !== recurring.id));
      invalidateAppData();
      setActionSheet(null);
    } catch (err) {
      console.error(err);
      setDeleteError('No se pudo eliminar. Intentá de nuevo.');
    } finally {
      setDeleting(false);
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
    <div className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Gastos recurrentes"
        onBack={() => router.push('/dashboard')}
        onMenu={() => setMenuOpen(true)}
      />

      <Container className="flex flex-col gap-3">
        {loading && <SkeletonList count={4} />}
        {!loading && statuses.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-16">
            No tenés gastos recurrentes cargados. Tocá el + para agregar uno.
          </p>
        )}
        {statuses.map(({ recurring, confirmedExpense, isPaid, isOverdue, isDueToday, dueThisMonth }) => {
          const cat = categories.find((c) => c.id === recurring.category_id);
          const topCat = getTopLevelCategory(categories, recurring.category_id);
          const displayCurrency = showUsd ? 'USD' : 'ARS';
          const needsConversion = recurring.currency !== displayCurrency;
          const templateAmount =
            !needsConversion || todayRate !== null
              ? convertWithRate(recurring.default_amount, recurring.currency, displayCurrency, todayRate ?? 1)
              : null;
          const statusColor = !dueThisMonth
            ? 'slate'
            : isPaid
            ? 'emerald'
            : isOverdue
            ? 'red'
            : isDueToday
            ? 'orange'
            : 'amber';
          const cardClass = {
            slate: 'bg-slate-800/40 border-slate-700/50',
            emerald: 'bg-emerald-500/10 border-emerald-500/30',
            red: 'bg-red-500/10 border-red-500/30',
            orange: 'bg-orange-400/10 border-orange-400/30',
            amber: 'bg-amber-400/10 border-amber-400/30',
          }[statusColor];
          const textClass = {
            slate: 'text-slate-500',
            emerald: 'text-emerald-400',
            red: 'text-red-400',
            orange: 'text-orange-400',
            amber: 'text-amber-400',
          }[statusColor];
          return (
            <div key={recurring.id} className={`rounded-xl px-4 py-3 flex items-center gap-3 border ${cardClass}`}>
              {topCat && (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: topCat.color }}
                >
                  <Emoji emoji={topCat.icon} size={18} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{recurring.description}</p>
                <p className="text-slate-500 text-xs mt-0.5 truncate">
                  {cat && (cat.parent_id ? `${topCat?.name} › ${cat.name}` : cat.name)} · Día{' '}
                  {recurring.day_of_month}
                  {recurring.frequency_months !== 1 && ` · ${frequencyLabel(recurring.frequency_months)}`} ·{' '}
                  {templateAmount !== null ? formatMoney(templateAmount, showUsd) : 'Cotización pendiente'}
                </p>
                <p className={`text-xs mt-0.5 font-medium ${textClass}`}>
                  {!dueThisMonth
                    ? `No corresponde este mes · próximo cobro en ${capitalize(
                        format(addMonths(new Date(), monthsUntilNextDue(recurring)), 'MMMM', { locale: es })
                      )}`
                    : isPaid
                    ? confirmedExpense && confirmedExpense.exchange_rate_used == null
                      ? 'Pagado (cotización pendiente)'
                      : 'Pagado'
                    : isOverdue
                    ? 'Vencido'
                    : isDueToday
                    ? 'Vence hoy'
                    : 'Pendiente'}
                </p>
              </div>

              {dueThisMonth && !isPaid && (
                <button
                  onClick={() => setPayingRecurring(recurring)}
                  className="text-xs font-semibold text-violet-400 hover:text-violet-300 whitespace-nowrap"
                >
                  Pagar
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActionSheet({ type: 'menu', recurring });
                }}
                aria-label="Opciones"
                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-700 transition flex-shrink-0"
              >
                <MoreVertical size={18} />
              </button>
            </div>
          );
        })}
      </Container>

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-violet-600 hover:bg-violet-700 rounded-full flex items-center justify-center text-white shadow-xl active:scale-90 transition-all"
        aria-label="Nuevo gasto recurrente"
      >
        <PlusIcon size={26} />
      </button>

      {/* Create/Edit modal */}
      {(showCreate || editingRecurring) && (
        <RecurringExpenseFormModal
          recurring={editingRecurring ?? undefined}
          categories={categories}
          onClose={() => {
            setShowCreate(false);
            setEditingRecurring(null);
          }}
          onSaved={handleSaved}
          onConfirmedThisMonth={(recurringId) => {
            setLocalConfirmedWithoutExpense((prev) => [
              ...(prev ?? cachedRecurring?.confirmedWithoutExpense ?? []),
              {
                id: `local-${recurringId}`,
                user_id: user!.id,
                recurring_expense_id: recurringId,
                month: currentMonthKey(),
                created_at: new Date().toISOString(),
              },
            ]);
          }}
        />
      )}

      {/* Pay sheet */}
      {payingRecurring && (
        <ConfirmPaymentSheet
          recurring={payingRecurring}
          onClose={() => setPayingRecurring(null)}
          onPaid={(created) => {
            setLocalConfirmed((prev) => [...(prev ?? cachedRecurring?.confirmedThisMonth ?? []), created]);
            setPayingRecurring(null);
          }}
          onMarkedPaidWithoutExpense={() => {
            setLocalConfirmedWithoutExpense((prev) => [
              ...(prev ?? cachedRecurring?.confirmedWithoutExpense ?? []),
              {
                id: `local-${payingRecurring.id}`,
                user_id: user!.id,
                recurring_expense_id: payingRecurring.id,
                month: currentMonthKey(),
                created_at: new Date().toISOString(),
              },
            ]);
            setPayingRecurring(null);
          }}
        />
      )}

      {actionSheet?.type === 'menu' && (
        <BottomSheet onClose={() => setActionSheet(null)}>
          <button
            onClick={() => {
              setEditingRecurring(actionSheet.recurring);
              setActionSheet(null);
            }}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-slate-800 transition text-left"
          >
            <Pencil size={20} strokeWidth={1.75} className="text-slate-400" />
            <span className="text-white font-medium">Editar</span>
          </button>
          <button
            onClick={() => {
              setDeleteError('');
              setActionSheet({ type: 'deleteConfirm', recurring: actionSheet.recurring });
            }}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-slate-800 transition text-left"
          >
            <Trash2 size={20} strokeWidth={1.75} className="text-red-400" />
            <span className="text-red-400 font-medium">Eliminar</span>
          </button>
        </BottomSheet>
      )}

      {actionSheet?.type === 'deleteConfirm' && (
        <BottomSheet onClose={() => setActionSheet(null)}>
          <p className="text-white font-semibold text-lg mb-2">
            ¿Eliminar &quot;{actionSheet.recurring.description}&quot;?
          </p>
          <p className="text-slate-400 text-sm mb-2">
            Los gastos ya cargados de este recurrente no se borran, pero dejará de pedir confirmación
            todos los meses.
          </p>
          {deleteError && <p className="text-red-400 text-sm mb-4">{deleteError}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => setActionSheet(null)}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleDelete(actionSheet.recurring)}
              disabled={deleting}
              className="flex-1 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </BottomSheet>
      )}

      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
