'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Expense, RecurringExpense } from '@/lib/types';
import { tryCalculateAmountsInBothCurrencies } from '@/lib/exchange-rates';
import { currentMonthKey } from '@/lib/recurring';
import { invalidateAppData } from '@/lib/app-data';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { format } from 'date-fns';

interface ConfirmPaymentSheetProps {
  recurring: RecurringExpense;
  onClose: () => void;
  onPaid: (expense: Expense) => void;
  /** Se marcó como pagado este mes sin crear ningún gasto. */
  onMarkedPaidWithoutExpense: () => void;
}

/**
 * BottomSheet para marcar un gasto recurrente como pagado este mes. Se puede
 * pagar en cualquier momento del mes, no solo cuando ya llegó (o pasó) el día
 * estipulado de cobro. Compartido entre la pantalla de recurrentes y el
 * resumen del dashboard.
 */
export function ConfirmPaymentSheet({ recurring, onClose, onPaid, onMarkedPaidWithoutExpense }: ConfirmPaymentSheetProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState(String(recurring.default_amount));
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    if (!user) return;
    setError('');
    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) {
      setError('Ingresá un monto válido');
      return;
    }

    setSaving(true);
    try {
      const today = new Date();
      const date = new Date(today.getFullYear(), today.getMonth(), recurring.day_of_month);
      const { amount_ars, amount_usd, exchange_rate_used } = await tryCalculateAmountsInBothCurrencies(
        parsedAmount,
        recurring.currency,
        date
      );

      const { data: created, error: dbError } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          category_id: recurring.category_id,
          description: recurring.description,
          amount: parsedAmount,
          currency: recurring.currency,
          amount_ars,
          amount_usd,
          exchange_rate_used,
          date: format(date, 'yyyy-MM-dd'),
          split_type: 'personal',
          recurring_expense_id: recurring.id,
        })
        .select()
        .single();
      if (dbError) throw dbError;

      invalidateAppData();
      onPaid(created);
    } catch (err) {
      console.error(err);
      setError('Error al guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // Marca el mes como pagado sin crear ningún gasto (ej. porque ya se cargó
  // por otro lado, o simplemente no se quiere trackear el monto).
  const handleMarkPaid = async () => {
    if (!user) return;
    setError('');
    setMarking(true);
    try {
      const { error: dbError } = await supabase.from('recurring_confirmations').insert({
        user_id: user.id,
        recurring_expense_id: recurring.id,
        month: currentMonthKey(),
      });
      if (dbError) throw dbError;

      invalidateAppData();
      onMarkedPaidWithoutExpense();
    } catch (err) {
      console.error(err);
      setError('Error al guardar. Intentá de nuevo.');
    } finally {
      setMarking(false);
    }
  };

  return (
    <BottomSheet onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-white font-semibold text-lg">Pagar &quot;{recurring.description}&quot;</p>
        <p className="text-slate-400 text-sm -mt-2">
          ¿Confirmás que el monto de este mes es este? Podés editarlo antes de pagar.
        </p>
        <div className="flex items-center gap-3">
          <MoneyInput
            value={amount}
            onChange={setAmount}
            className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 focus:outline-none transition text-lg font-semibold"
            autoFocus
          />
          <span className="text-emerald-400 font-semibold">{recurring.currency}</span>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={handlePay}
            disabled={saving || marking}
            className="flex-1 py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
          >
            {saving ? 'Guardando...' : 'Pagar'}
          </button>
        </div>

        <button
          onClick={handleMarkPaid}
          disabled={saving || marking}
          className="text-sm font-semibold text-slate-400 hover:text-slate-300 disabled:opacity-50 -mt-1"
        >
          {marking ? 'Guardando...' : 'Marcar como pagada, sin sumar ningún gasto'}
        </button>
      </div>
    </BottomSheet>
  );
}
