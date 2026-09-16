'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Category, RecurringExpense } from '@/lib/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MoneyInput } from '@/components/ui/MoneyInput';

interface RecurringExpenseFormModalProps {
  recurring?: RecurringExpense;
  categories: Category[];
  onClose: () => void;
  onSaved: (recurring: RecurringExpense) => void;
}

interface FieldErrors {
  description?: string;
  amount?: string;
  category?: string;
  dayOfMonth?: string;
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleSubmit = async () => {
    setError('');

    const parsedAmount = parseFloat(amount) || 0;
    const day = parseInt(dayOfMonth, 10);
    const errors: FieldErrors = {};

    if (!description.trim()) {
      errors.description = 'Ingresá una descripción';
    }
    if (parsedAmount <= 0) {
      errors.amount = 'Ingresá un monto válido';
    }
    if (!categoryId) {
      errors.category = 'Elegí una categoría';
    }
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      errors.dayOfMonth = 'El día del mes debe ser entre 1 y 28';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

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
    <BottomSheet onClose={onClose} panelClassName="max-h-[90vh] overflow-y-auto">
      <div className="flex flex-col gap-5">
        <h2 className="text-white font-semibold text-lg">
          {isEdit ? 'Editar gasto recurrente' : 'Nuevo gasto recurrente'}
        </h2>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
              Descripción
            </p>
            {fieldErrors.description && (
              <p className="text-red-400 text-xs font-medium">{fieldErrors.description}</p>
            )}
          </div>
          <input
            type="text"
            placeholder="Ej: Netflix, Alquiler, Expensas"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clearFieldError('description');
            }}
            className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition ${
              fieldErrors.description ? 'border-red-500' : 'border-slate-700 focus:border-violet-500'
            }`}
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Monto</p>
              {fieldErrors.amount && (
                <p className="text-red-400 text-xs font-medium">{fieldErrors.amount}</p>
              )}
            </div>
            <MoneyInput
              placeholder="0"
              value={amount}
              onChange={(raw) => {
                setAmount(raw);
                clearFieldError('amount');
              }}
              className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition ${
                fieldErrors.amount ? 'border-red-500' : 'border-slate-700 focus:border-violet-500'
              }`}
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
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
              Categoría
            </p>
            {fieldErrors.category && (
              <p className="text-red-400 text-xs font-medium">{fieldErrors.category}</p>
            )}
          </div>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              clearFieldError('category');
            }}
            className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white focus:outline-none transition ${
              fieldErrors.category ? 'border-red-500' : 'border-slate-700 focus:border-violet-500'
            }`}
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
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
              Día del mes en que se cobra
            </p>
            {fieldErrors.dayOfMonth && (
              <p className="text-red-400 text-xs font-medium">{fieldErrors.dayOfMonth}</p>
            )}
          </div>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={28}
            value={dayOfMonth}
            onChange={(e) => {
              setDayOfMonth(e.target.value);
              clearFieldError('dayOfMonth');
            }}
            className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white focus:outline-none transition ${
              fieldErrors.dayOfMonth ? 'border-red-500' : 'border-slate-700 focus:border-violet-500'
            }`}
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
    </BottomSheet>
  );
}
