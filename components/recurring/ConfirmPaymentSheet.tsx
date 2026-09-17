'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Expense, RecurringExpense } from '@/lib/types';
import { tryCalculateAmountsInBothCurrencies } from '@/lib/exchange-rates';
import { invalidateAppData } from '@/lib/app-data';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { format } from 'date-fns';

interface ConfirmPaymentSheetProps {
  recurring: RecurringExpense;
  onClose: () => void;
  onPaid: (expense: Expense) => void;
}

/**
 * BottomSheet para marcar un gasto recurrente como pagado este mes. Se puede
 * pagar en cualquier momento del mes, no solo cuando ya llegó (o pasó) el día
 * estipulado de cobro. Compartido entre la pantalla de recurrentes y el
 * resumen del dashboard.
 */
export function ConfirmPaymentSheet({ recurring, onClose, onPaid }: ConfirmPaymentSheetProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState(String(recurring.default_amount));
  const [alreadyLoaded, setAlreadyLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    if (!user) return;
    setError('');
    // Si ya se cargó este gasto por otro lado este mes (ej. como gasto
    // suelto), no lo sumamos de nuevo al total: guardamos el pago en $0 para
    // que quede marcado como "pagado" (sin doble contar) y no siga apareciendo
    // como pendiente/vencido.
    const parsedAmount = alreadyLoaded ? 0 : parseFloat(amount) || 0;
    if (!alreadyLoaded && parsedAmount <= 0) {
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
          description: alreadyLoaded ? `${recurring.description} (ya cargado aparte)` : recurring.description,
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

  return (
    <BottomSheet onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-white font-semibold text-lg">Pagar &quot;{recurring.description}&quot;</p>

        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
            ¿Ya cargaste este gasto este mes?
          </p>
          <div className="flex gap-2 bg-slate-800/60 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setAlreadyLoaded(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                !alreadyLoaded ? 'bg-violet-600 text-white' : 'text-slate-400'
              }`}
            >
              No, cargarlo ahora
            </button>
            <button
              type="button"
              onClick={() => setAlreadyLoaded(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                alreadyLoaded ? 'bg-violet-600 text-white' : 'text-slate-400'
              }`}
            >
              Sí, ya lo cargué
            </button>
          </div>
        </div>

        {alreadyLoaded ? (
          <p className="text-slate-400 text-sm">
            No lo vamos a sumar de nuevo al total del mes — solo se marca como pagado para que deje de
            figurar como pendiente.
          </p>
        ) : (
          <>
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
          </>
        )}

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
            disabled={saving}
            className="flex-1 py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
          >
            {saving ? 'Guardando...' : alreadyLoaded ? 'Marcar como pagado' : 'Pagar'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
