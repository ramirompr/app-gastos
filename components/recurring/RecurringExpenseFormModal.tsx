'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Category, RecurringExpense } from '@/lib/types';

interface RecurringExpenseFormModalProps {
  recurring?: RecurringExpense;
  categories: Category[];
  onClose: () => void;
  onSaved: (recurring: RecurringExpense) => void;
}

export function RecurringExpenseFormModal({
  recurring,
  categories,
  onClose,
  onSaved,
}: RecurringExpenseFormModalProps) {
  const { user } = useAuth();
  const isEdit = !!recurring;

  const [description, setDescription] = useState(recurring?.description ?? '');
  const [amount, setAmount] = useState(recurring ? String(recurring.default_amount) : '');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>(recurring?.currency ?? 'ARS');
  const [categoryId, setCategoryId] = useState(recurring?.category_id ?? '');
  const [dayOfMonth, setDayOfMonth] = useState(recurring ? String(recurring.day_of_month) : '1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!description.trim()) {
      setError('Ingresá una descripción');
      return;
    }
    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) {
      setError('Ingresá un monto válido');
      return;
    }
    if (!categoryId) {
      setError('Elegí una categoría');
      return;
    }
    const day = parseInt(dayOfMonth, 10);
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      setError('El día del mes debe ser entre 1 y 28');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        description: description.trim(),
        default_amount: parsedAmount,
        currency,
        category_id: categoryId,
        day_of_month: day,
      };

      let data: RecurringExpense;
      if (isEdit) {
        const { data: updated, error: dbError } = await supabase
          .from('recurring_expenses')
          .update(payload)
          .eq('id', recurring.id)
          .select()
          .single();
        if (dbError) throw dbError;
        data = updated;
      } else {
        const { data: created, error: dbError } = await supabase
          .from('recurring_expenses')
          .insert({ user_id: user!.id, ...payload })
          .select()
          .single();
        if (dbError) throw dbError;
        data = created;
      }

      onSaved(data);
    } catch (err) {
      console.error(err);
      setError('Error al guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 rounded-t-2xl border-t border-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        <div className="px-6 pt-4 pb-10 flex flex-col gap-5">
          <h2 className="text-white font-semibold text-lg">
            {isEdit ? 'Editar gasto recurrente' : 'Nuevo gasto recurrente'}
          </h2>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
              Descripción
            </p>
            <input
              type="text"
              placeholder="Ej: Netflix, Alquiler, Expensas"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none transition"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">Monto</p>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none transition"
              />
            </div>
            <button
              onClick={() => setCurrency((c) => (c === 'ARS' ? 'USD' : 'ARS'))}
              className="px-4 py-3 mt-6 bg-slate-800 border border-slate-700 rounded-xl text-emerald-400 font-semibold"
            >
              {currency}
            </button>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
              Categoría
            </p>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 focus:outline-none transition"
            >
              <option value="">Elegí una categoría</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.parent_id ? `↳ ${cat.name}` : cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
              Día del mes en que se cobra
            </p>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:border-violet-500 focus:outline-none transition"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
          >
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear'}
          </button>
        </div>
      </div>
    </>
  );
}
