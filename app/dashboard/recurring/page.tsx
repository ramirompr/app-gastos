'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Category, Expense, RecurringExpense } from '@/lib/types';
import { calculateAmountsInBothCurrencies } from '@/lib/exchange-rates';
import { RecurringExpenseFormModal } from '@/components/recurring/RecurringExpenseFormModal';
import { AppMenu } from '@/components/layout/AppMenu';
import { PageHeader } from '@/components/layout/PageHeader';
import { PlusIcon } from '@/components/icons/PlusIcon';
import { format, startOfMonth, endOfMonth } from 'date-fns';

type ActionSheet =
  | { type: 'menu'; recurring: RecurringExpense }
  | { type: 'deleteConfirm'; recurring: RecurringExpense };

function formatByCurrency(amount: number, currency: 'ARS' | 'USD'): string {
  if (currency === 'USD') {
    return `US$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${Math.round(amount).toLocaleString('es-AR')} $`;
}

export default function RecurringExpensesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [recurrings, setRecurrings] = useState<RecurringExpense[]>([]);
  const [confirmedThisMonth, setConfirmedThisMonth] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);
  const [actionSheet, setActionSheet] = useState<ActionSheet | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [confirmingRecurring, setConfirmingRecurring] = useState<RecurringExpense | null>(null);
  const [confirmAmount, setConfirmAmount] = useState('');
  const [confirmSaving, setConfirmSaving] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const [{ data: cats }, { data: recs }, { data: confirmed }] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', user.id),
      supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('day_of_month', { ascending: true }),
      supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .not('recurring_expense_id', 'is', null)
        .gte('date', monthStart)
        .lte('date', monthEnd),
    ]);
    setCategories(cats ?? []);
    setRecurrings(recs ?? []);
    setConfirmedThisMonth(confirmed ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const today = new Date();
  const currentDay = today.getDate();

  const statuses = useMemo(() => {
    return recurrings.map((r) => {
      const confirmedExpense = confirmedThisMonth.find((e) => e.recurring_expense_id === r.id) ?? null;
      const isDue = !confirmedExpense && r.day_of_month <= currentDay;
      return { recurring: r, confirmedExpense, isDue };
    });
  }, [recurrings, confirmedThisMonth, currentDay]);

  const openConfirm = (recurring: RecurringExpense) => {
    setConfirmingRecurring(recurring);
    setConfirmAmount(String(recurring.default_amount));
    setConfirmError('');
  };

  const handleConfirm = async () => {
    if (!confirmingRecurring || !user) return;
    setConfirmError('');
    const parsedAmount = parseFloat(confirmAmount) || 0;
    if (parsedAmount <= 0) {
      setConfirmError('Ingresá un monto válido');
      return;
    }

    setConfirmSaving(true);
    try {
      const date = new Date(today.getFullYear(), today.getMonth(), confirmingRecurring.day_of_month);
      const { amount_ars, amount_usd, exchange_rate_used } = await calculateAmountsInBothCurrencies(
        parsedAmount,
        confirmingRecurring.currency,
        date
      );

      const { data: created, error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          category_id: confirmingRecurring.category_id,
          description: confirmingRecurring.description,
          amount: parsedAmount,
          currency: confirmingRecurring.currency,
          amount_ars,
          amount_usd,
          exchange_rate_used,
          date: format(date, 'yyyy-MM-dd'),
          split_type: 'personal',
          recurring_expense_id: confirmingRecurring.id,
        })
        .select()
        .single();
      if (error) throw error;

      setConfirmedThisMonth((prev) => [...prev, created]);
      setConfirmingRecurring(null);
    } catch (err) {
      console.error(err);
      setConfirmError('Error al confirmar. Intentá de nuevo.');
    } finally {
      setConfirmSaving(false);
    }
  };

  const handleSaved = (saved: RecurringExpense) => {
    setRecurrings((prev) => {
      const exists = prev.find((r) => r.id === saved.id);
      const next = exists ? prev.map((r) => (r.id === saved.id ? saved : r)) : [...prev, saved];
      return [...next].sort((a, b) => a.day_of_month - b.day_of_month);
    });
    setShowCreate(false);
    setEditingRecurring(null);
  };

  const handleDelete = async (recurring: RecurringExpense) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('recurring_expenses').delete().eq('id', recurring.id);
      if (error) throw error;
      setRecurrings((prev) => prev.filter((r) => r.id !== recurring.id));
      setActionSheet(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
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

      <div className="px-4 flex flex-col gap-3">
        {statuses.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-16">
            No tenés gastos recurrentes cargados. Tocá el + para agregar uno.
          </p>
        )}
        {statuses.map(({ recurring, confirmedExpense, isDue }) => {
          const cat = categories.find((c) => c.id === recurring.category_id);
          return (
            <div
              key={recurring.id}
              className="bg-slate-800/60 rounded-xl px-4 py-3 flex items-center gap-3"
            >
              {cat && (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{recurring.description}</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Día {recurring.day_of_month} ·{' '}
                  {formatByCurrency(recurring.default_amount, recurring.currency)}
                </p>
              </div>

              {confirmedExpense ? (
                <span className="text-xs font-medium text-emerald-400 whitespace-nowrap">
                  ✓ Cargado
                </span>
              ) : isDue ? (
                <button
                  onClick={() => openConfirm(recurring)}
                  className="text-xs font-semibold text-violet-400 hover:text-violet-300 whitespace-nowrap"
                >
                  Confirmar
                </button>
              ) : (
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  Próx. día {recurring.day_of_month}
                </span>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActionSheet({ type: 'menu', recurring });
                }}
                aria-label="Opciones"
                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-700 transition text-lg leading-none flex-shrink-0"
              >
                ⋮
              </button>
            </div>
          );
        })}
      </div>

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
        />
      )}

      {/* Confirm sheet */}
      {confirmingRecurring && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setConfirmingRecurring(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 rounded-t-2xl border-t border-slate-800">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-slate-700 rounded-full" />
            </div>
            <div className="px-6 pt-3 pb-10 flex flex-col gap-4">
              <p className="text-white font-semibold text-lg">
                Confirmar &quot;{confirmingRecurring.description}&quot;
              </p>
              <p className="text-slate-400 text-sm -mt-2">
                ¿Confirmás que el monto de este mes es este? Podés editarlo antes de confirmar.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  inputMode="decimal"
                  value={confirmAmount}
                  onChange={(e) => setConfirmAmount(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 focus:outline-none transition text-lg font-semibold"
                  autoFocus
                />
                <span className="text-emerald-400 font-semibold">{confirmingRecurring.currency}</span>
              </div>
              {confirmError && <p className="text-red-400 text-sm">{confirmError}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmingRecurring(null)}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={confirmSaving}
                  className="flex-1 py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
                >
                  {confirmSaving ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Action sheet backdrop */}
      {actionSheet && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setActionSheet(null)} />
      )}

      {actionSheet?.type === 'menu' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 rounded-t-2xl border-t border-slate-800">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-slate-700 rounded-full" />
          </div>
          <div className="px-6 pt-3 pb-10">
            <button
              onClick={() => {
                setEditingRecurring(actionSheet.recurring);
                setActionSheet(null);
              }}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-slate-800 transition text-left"
            >
              <span className="text-xl">✏️</span>
              <span className="text-white font-medium">Editar</span>
            </button>
            <button
              onClick={() => setActionSheet({ type: 'deleteConfirm', recurring: actionSheet.recurring })}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-slate-800 transition text-left"
            >
              <span className="text-xl">🗑️</span>
              <span className="text-red-400 font-medium">Eliminar</span>
            </button>
          </div>
        </div>
      )}

      {actionSheet?.type === 'deleteConfirm' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 rounded-t-2xl border-t border-slate-800">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-slate-700 rounded-full" />
          </div>
          <div className="px-6 pt-3 pb-10">
            <p className="text-white font-semibold text-lg mb-2">
              ¿Eliminar &quot;{actionSheet.recurring.description}&quot;?
            </p>
            <p className="text-slate-400 text-sm mb-6">
              Los gastos ya cargados de este recurrente no se borran, pero dejará de pedir confirmación
              todos los meses.
            </p>
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
          </div>
        </div>
      )}

      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
