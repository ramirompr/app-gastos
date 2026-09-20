'use client';

import { useState } from 'react';
import { Expense } from '@/lib/types';
import { settleSharedExpense } from '@/lib/expenses';
import { partnerShareInArsUsd, formatMoney } from '@/lib/format-money';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MoneyInput } from '@/components/ui/MoneyInput';

interface SettlePaymentSheetProps {
  expense: Expense;
  onClose: () => void;
  onSettled: (expense: Expense) => void;
}

/**
 * BottomSheet para marcar un gasto compartido como pagado, con la
 * posibilidad de editar cuánto te devolvieron realmente si terminó siendo
 * distinto al monto esperado (partner_share). Compartido entre historial,
 * pagos pendientes y el listado de gastos por categoría.
 */
export function SettlePaymentSheet({ expense, onClose, onSettled }: SettlePaymentSheetProps) {
  const expectedShare = expense.partner_share ?? 0;
  const [amount, setAmount] = useState(String(expectedShare));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const share = partnerShareInArsUsd(expense);

  const handleConfirm = async () => {
    setError('');
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setError('Ingresá un monto válido');
      return;
    }
    if (parsedAmount > expense.amount) {
      setError('No puede ser mayor al total del gasto');
      return;
    }

    setSaving(true);
    try {
      const updated = await settleSharedExpense(expense, parsedAmount);
      onSettled(updated);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'No se pudo marcar como pagado. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    // Mientras `settleSharedExpense` está en vuelo, ni el backdrop ni
    // "Cancelar" deben cerrar la hoja: si el usuario la cierra igual, la
    // promesa sigue viva y, al resolver, onSettled se dispara sobre un padre
    // que ya cree que se canceló (o el error de un fallo queda mudo, porque
    // cae en un componente ya desmontado).
    <BottomSheet onClose={onClose} preventClose={saving}>
      <div className="flex flex-col gap-4">
        <p className="text-white font-semibold text-lg">Marcar &quot;{expense.description}&quot; como pagado</p>
        <p className="text-slate-400 text-sm -mt-2">
          {share
            ? `Se esperaba ${formatMoney(share.ars, false)} (${formatMoney(share.usd, true)}). Editá el monto si te devolvieron algo distinto.`
            : '¿Cuánto te devolvieron en total?'}
        </p>
        <div className="flex items-center gap-3">
          <MoneyInput
            value={amount}
            onChange={setAmount}
            className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 focus:outline-none transition text-lg font-semibold"
            autoFocus
          />
          <span className="text-emerald-400 font-semibold">{expense.currency}</span>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
          >
            {saving ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
