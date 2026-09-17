'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Category, RecurringExpense } from '@/lib/types';
import { FREQUENCY_OPTIONS } from '@/lib/recurring';
import { invalidateAppData } from '@/lib/app-data';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Emoji } from '@/components/ui/Emoji';

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
  const [subcategoryPicker, setSubcategoryPicker] = useState<Category | null>(null);
  const [dayOfMonth, setDayOfMonth] = useState(recurring ? String(recurring.day_of_month) : '1');
  const [frequencyMonths, setFrequencyMonths] = useState(recurring?.frequency_months ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const topLevel = categories.filter((c) => !c.parent_id);
  const subsOf = (id: string) => categories.filter((c) => c.parent_id === id);
  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;

  const handleCategoryTap = (cat: Category) => {
    const subs = subsOf(cat.id);
    if (subs.length > 0) {
      setSubcategoryPicker(cat);
    } else {
      setCategoryId(cat.id);
      clearFieldError('category');
    }
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
        frequency_months: frequencyMonths,
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

      invalidateAppData();
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
          <div className="flex items-center justify-between mb-3">
            <p
              className={`text-xs uppercase tracking-wider font-semibold ${
                fieldErrors.category ? 'text-red-400' : 'text-slate-500'
              }`}
            >
              Categoría
            </p>
            {fieldErrors.category && (
              <p className="text-red-400 text-xs font-medium">{fieldErrors.category}</p>
            )}
          </div>
          <div className="grid grid-cols-5 gap-3">
            {topLevel.map((cat) => {
              const isSelected = categoryId === cat.id || selectedCategory?.parent_id === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryTap(cat)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: cat.color,
                      outline: isSelected ? '3px solid white' : '3px solid transparent',
                      outlineOffset: '2px',
                    }}
                  >
                    <Emoji emoji={cat.icon} size={20} />
                  </div>
                  <p className="text-slate-300 text-[11px] text-center leading-tight line-clamp-1">
                    {cat.name}
                  </p>
                </button>
              );
            })}
          </div>
          {selectedCategory?.parent_id && (
            <p className="text-slate-500 text-xs mt-3">
              Seleccionada: {topLevel.find((c) => c.id === selectedCategory.parent_id)?.name} ›{' '}
              {selectedCategory.name}
            </p>
          )}
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

        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
            Frecuencia
          </p>
          <div className="flex gap-2 flex-wrap">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.months}
                type="button"
                onClick={() => setFrequencyMonths(opt.months)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                  frequencyMonths === opt.months
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
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

      {subcategoryPicker && (
        <BottomSheet stacked onClose={() => setSubcategoryPicker(null)}>
          <p className="text-white font-semibold mb-4">{subcategoryPicker.name}</p>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                setCategoryId(subcategoryPicker.id);
                setSubcategoryPicker(null);
                clearFieldError('category');
              }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800 transition text-left"
            >
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: subcategoryPicker.color }}
              >
                <Emoji emoji={subcategoryPicker.icon} size={18} />
              </span>
              <span className="text-white font-medium">General</span>
            </button>
            {subsOf(subcategoryPicker.id).map((sub) => (
              <button
                type="button"
                key={sub.id}
                onClick={() => {
                  setCategoryId(sub.id);
                  setSubcategoryPicker(null);
                  clearFieldError('category');
                }}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800 transition text-left"
              >
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: sub.color }}
                >
                  <Emoji emoji={sub.icon} size={18} />
                </span>
                <span className="text-white font-medium">{sub.name}</span>
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
    </BottomSheet>
  );
}
