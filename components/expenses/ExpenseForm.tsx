'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Category, Expense } from '@/lib/types';
import { fetchUserCategories } from '@/lib/categories';
import { calculateAmountsInBothCurrencies, tryCalculateAmountsInBothCurrencies } from '@/lib/exchange-rates';
import { computeInstallments } from '@/lib/installments';
import { CategoryFormModal } from '@/components/categories/CategoryFormModal';
import { AppMenu } from '@/components/layout/AppMenu';
import { PageHeader } from '@/components/layout/PageHeader';
import { PlusIcon } from '@/components/icons/PlusIcon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Emoji } from '@/components/ui/Emoji';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Calendar } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

type SplitType = 'personal' | 'invited' | 'shared';

const SPLIT_OPTIONS: { value: SplitType; label: string }[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'invited', label: 'Invitado' },
  { value: 'shared', label: 'Parcial' },
];

interface ExpenseFormProps {
  expense?: Expense;
}

interface FieldErrors {
  amount?: string;
  category?: string;
  partnerShare?: string;
  installments?: string;
}

export function ExpenseForm({ expense }: ExpenseFormProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isEdit = !!expense;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>(expense?.currency ?? 'ARS');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    expense?.category_id ?? null
  );
  const [subcategoryPicker, setSubcategoryPicker] = useState<Category | null>(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [dateOption, setDateOption] = useState<'today' | 'yesterday' | 'twoDaysAgo' | 'custom'>(
    expense ? 'custom' : 'today'
  );
  const [customDate, setCustomDate] = useState(expense ? expense.date : format(new Date(), 'yyyy-MM-dd'));
  const [showDatePicker, setShowDatePicker] = useState(!!expense);

  const [splitType, setSplitType] = useState<SplitType>(expense?.split_type ?? 'personal');
  const [partnerShare, setPartnerShare] = useState(
    expense?.partner_share ? String(expense.partner_share) : ''
  );
  const [sharedWith, setSharedWith] = useState(expense?.shared_with ?? '');

  const [installmentsEnabled, setInstallmentsEnabled] = useState(false);
  const [numInstallments, setNumInstallments] = useState(3);
  const [customInstallments, setCustomInstallments] = useState(false);
  const [customInstallmentsValue, setCustomInstallmentsValue] = useState('');

  const [comment, setComment] = useState(expense?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    setCategories(await fetchUserCategories(user.id));
    setLoadingCategories(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchCategories();
  }, [user, fetchCategories]);

  const topLevel = categories.filter((c) => !c.parent_id);
  const subsOf = (id: string) => categories.filter((c) => c.parent_id === id);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;

  const selectedDate = useMemo(() => {
    switch (dateOption) {
      case 'today':
        return new Date();
      case 'yesterday':
        return subDays(new Date(), 1);
      case 'twoDaysAgo':
        return subDays(new Date(), 2);
      case 'custom':
        return new Date(`${customDate}T00:00:00`);
    }
  }, [dateOption, customDate]);

  const parsedAmount = parseFloat(amount) || 0;

  const effectiveInstallments = customInstallments
    ? parseInt(customInstallmentsValue, 10)
    : numInstallments;

  const installmentPreview = useMemo(() => {
    if (!installmentsEnabled || parsedAmount <= 0) return [];
    if (!Number.isInteger(effectiveInstallments) || effectiveInstallments < 2) return [];
    return computeInstallments(parsedAmount, effectiveInstallments, selectedDate);
  }, [installmentsEnabled, parsedAmount, effectiveInstallments, selectedDate]);

  const handleCategoryTap = (cat: Category) => {
    const subs = subsOf(cat.id);
    if (subs.length > 0) {
      setSubcategoryPicker(cat);
    } else {
      setSelectedCategoryId(cat.id);
      clearFieldError('category');
    }
  };

  const handleSubmit = async () => {
    setError('');

    const partnerShareTotal = parseFloat(partnerShare) || 0;
    const errors: FieldErrors = {};

    if (parsedAmount <= 0) {
      errors.amount = 'Ingresá un monto válido';
    }
    if (!selectedCategory) {
      errors.category = 'Elegí una categoría';
    }
    if (splitType !== 'personal' && partnerShareTotal <= 0) {
      errors.partnerShare =
        splitType === 'shared' ? 'Ingresá cuánto te tiene que devolver' : 'Ingresá cuánto invitaste';
    } else if (splitType !== 'personal' && partnerShareTotal > parsedAmount) {
      errors.partnerShare =
        splitType === 'shared'
          ? 'Ese monto no puede ser mayor al total del gasto'
          : 'El monto invitado no puede ser mayor al total del gasto';
    }
    if (
      !isEdit &&
      installmentsEnabled &&
      (!Number.isInteger(effectiveInstallments) || effectiveInstallments < 2)
    ) {
      errors.installments = 'Ingresá una cantidad de cuotas válida (mayor a 1)';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!selectedCategory) return; // ya cubierto por errors.category, solo para que TS lo sepa

    setSaving(true);
    try {
      const description = comment.trim() || selectedCategory.name;

      if (isEdit) {
        // A diferencia de la creación, en una edición no queremos degradar
        // silenciosamente un gasto ya resuelto a "pendiente" si la cotización
        // falla: mejor abortar el guardado y mostrar el error (catch de abajo).
        const { amount_ars, amount_usd, exchange_rate_used } = await calculateAmountsInBothCurrencies(
          parsedAmount,
          currency,
          selectedDate
        );

        const { error: updateError } = await supabase
          .from('expenses')
          .update({
            category_id: selectedCategory.id,
            description,
            amount: parsedAmount,
            currency,
            amount_ars,
            amount_usd,
            exchange_rate_used,
            date: format(selectedDate, 'yyyy-MM-dd'),
            split_type: splitType,
            partner_share: splitType !== 'personal' ? partnerShareTotal : null,
            shared_with: splitType === 'shared' ? sharedWith.trim() || null : null,
          })
          .eq('id', expense!.id);
        if (updateError) throw updateError;

        router.back();
        return;
      }

      if (installmentsEnabled) {
        const amountInstallments = computeInstallments(parsedAmount, effectiveInstallments, selectedDate);
        const partnerInstallments =
          splitType !== 'personal'
            ? computeInstallments(partnerShareTotal, effectiveInstallments, selectedDate)
            : null;

        const { data: plan, error: planError } = await supabase
          .from('expense_installment_plans')
          .insert({
            user_id: user!.id,
            category_id: selectedCategory.id,
            description,
            total_amount: parsedAmount,
            currency,
            num_installments: effectiveInstallments,
            split_type: splitType,
            partner_share: splitType !== 'personal' ? partnerShareTotal : null,
            shared_with: splitType === 'shared' ? sharedWith.trim() || null : null,
            start_date: format(selectedDate, 'yyyy-MM-dd'),
          })
          .select()
          .single();
        if (planError) throw planError;

        const rows = await Promise.all(
          amountInstallments.map(async (item) => {
            const { amount_ars, amount_usd, exchange_rate_used } =
              await tryCalculateAmountsInBothCurrencies(item.amount, currency, item.date);

            // El total y la parte de la pareja se reparten en cuotas por
            // separado, así que cada uno puede redondear el resto de forma
            // distinta en la primera cuota. Limitamos partner_share al monto
            // de esa misma cuota para que nunca quede "te deben más de lo
            // que vale la cuota".
            const partnerAmountForItem = partnerInstallments
              ? Math.min(
                  partnerInstallments.find((p) => p.installmentNumber === item.installmentNumber)!.amount,
                  item.amount
                )
              : null;

            return {
              user_id: user!.id,
              category_id: selectedCategory.id,
              description: `${description} (Cuota ${item.installmentNumber}/${effectiveInstallments})`,
              amount: item.amount,
              currency,
              amount_ars,
              amount_usd,
              exchange_rate_used,
              date: format(item.date, 'yyyy-MM-dd'),
              split_type: splitType,
              partner_share: splitType !== 'personal' ? partnerAmountForItem : null,
              shared_with: splitType === 'shared' ? sharedWith.trim() || null : null,
              installment_plan_id: plan.id,
              installment_number: item.installmentNumber,
            };
          })
        );

        const { error: expensesError } = await supabase.from('expenses').insert(rows);
        if (expensesError) throw expensesError;
      } else {
        const { amount_ars, amount_usd, exchange_rate_used } = await tryCalculateAmountsInBothCurrencies(
          parsedAmount,
          currency,
          selectedDate
        );

        const { error: insertError } = await supabase.from('expenses').insert({
          user_id: user!.id,
          category_id: selectedCategory.id,
          description,
          amount: parsedAmount,
          currency,
          amount_ars,
          amount_usd,
          exchange_rate_used,
          date: format(selectedDate, 'yyyy-MM-dd'),
          split_type: splitType,
          partner_share: splitType !== 'personal' ? partnerShareTotal : null,
          shared_with: splitType === 'shared' ? sharedWith.trim() || null : null,
        });
        if (insertError) throw insertError;
      }

      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Error al guardar el gasto. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loadingCategories) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin h-8 w-8 border-2 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 pb-32">
      <PageHeader
        title={isEdit ? 'Editar gasto' : 'Nuevo gasto'}
        onBack={() => (isEdit ? router.back() : router.push('/dashboard'))}
        onMenu={() => setMenuOpen(true)}
      />

      <div className="px-4 flex flex-col gap-8">
        {/* Amount */}
        <div className="flex flex-col items-center py-4">
          {fieldErrors.amount && (
            <p className="text-red-400 text-xs font-medium mb-1">{fieldErrors.amount}</p>
          )}
          <div className="flex items-end gap-3">
            <MoneyInput
              placeholder="0"
              value={amount}
              onChange={(raw) => {
                setAmount(raw);
                clearFieldError('amount');
              }}
              className={`text-4xl font-bold bg-transparent text-white placeholder-slate-700 text-right w-40 focus:outline-none border-b-2 transition-colors ${
                fieldErrors.amount
                  ? 'border-red-500'
                  : 'border-slate-800 focus:border-violet-500'
              }`}
              autoFocus
            />
            <button
              onClick={() => setCurrency((c) => (c === 'ARS' ? 'USD' : 'ARS'))}
              className="text-emerald-400 font-semibold pb-2"
            >
              {currency}
            </button>
          </div>
        </div>

        {/* Categories */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p
              className={`text-xs uppercase tracking-wider font-semibold ${
                fieldErrors.category ? 'text-red-400' : 'text-slate-500'
              }`}
            >
              Categorías
            </p>
            {fieldErrors.category && (
              <p className="text-red-400 text-xs font-medium">{fieldErrors.category}</p>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {topLevel.map((cat) => {
              const isSelected =
                selectedCategoryId === cat.id || selectedCategory?.parent_id === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryTap(cat)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: cat.color,
                      outline: isSelected ? '3px solid white' : '3px solid transparent',
                      outlineOffset: '2px',
                    }}
                  >
                    <Emoji emoji={cat.icon} size={22} />
                  </div>
                  <p className="text-slate-300 text-xs text-center leading-tight line-clamp-1">
                    {cat.name}
                  </p>
                </button>
              );
            })}
            <button
              onClick={() => setShowCreateCategory(true)}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-dashed border-slate-600 text-slate-400">
                <PlusIcon size={18} />
              </div>
              <p className="text-slate-400 text-xs text-center leading-tight">Nueva</p>
            </button>
          </div>
          {selectedCategory?.parent_id && (
            <p className="text-slate-500 text-xs mt-3">
              Seleccionada: {topLevel.find((c) => c.id === selectedCategory.parent_id)?.name} ›{' '}
              {selectedCategory.name}
            </p>
          )}
        </div>

        {/* Date */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Fecha</p>
          <div className="flex gap-2 flex-wrap items-center">
            {[
              { value: 'today' as const, label: 'Hoy' },
              { value: 'yesterday' as const, label: 'Ayer' },
              { value: 'twoDaysAgo' as const, label: 'Hace dos días' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDateOption(opt.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  dateOption === opt.value ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              onClick={() => {
                setDateOption('custom');
                setShowDatePicker(true);
              }}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition inline-flex items-center gap-1.5 ${
                dateOption === 'custom' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Calendar size={16} />
              {dateOption === 'custom' ? format(selectedDate, "d MMM", { locale: es }) : ''}
            </button>
          </div>
          {showDatePicker && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setDateOption('custom');
              }}
              className="mt-3 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-violet-500 focus:outline-none"
            />
          )}
        </div>

        {/* Split type */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Tipo de gasto</p>
          <div className="flex gap-2">
            {SPLIT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSplitType(opt.value)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
                  splitType === opt.value ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {splitType !== 'personal' && (
            <>
              {fieldErrors.partnerShare && (
                <p className="text-red-400 text-xs font-medium mt-3">{fieldErrors.partnerShare}</p>
              )}
              <MoneyInput
                placeholder={splitType === 'shared' ? 'Cuánto te tiene que devolver' : 'Cuánto invitaste'}
                value={partnerShare}
                onChange={(raw) => {
                  setPartnerShare(raw);
                  clearFieldError('partnerShare');
                }}
                className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition ${
                  fieldErrors.partnerShare
                    ? 'mt-1 border-red-500'
                    : 'mt-3 border-slate-700 focus:border-violet-500'
                }`}
              />
            </>
          )}
          {splitType === 'shared' && (
            <input
              type="text"
              placeholder="¿Quién te debe? (opcional)"
              value={sharedWith}
              onChange={(e) => setSharedWith(e.target.value)}
              className="mt-3 w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none transition"
            />
          )}
        </div>

        {/* Installments */}
        {isEdit ? (
          expense?.installment_plan_id && (
            <p className="text-xs text-slate-500 bg-slate-800/60 rounded-xl px-4 py-3">
              Esta es la cuota {expense.installment_number} de un plan en curso. Editar acá solo
              modifica esta cuota, no el resto del plan.
            </p>
          )
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">¿En cuotas?</p>
              <button
                type="button"
                role="switch"
                aria-checked={installmentsEnabled}
                onClick={() => setInstallmentsEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  installmentsEnabled ? 'bg-violet-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    installmentsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {installmentsEnabled && (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  {[3, 6, 12].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setNumInstallments(n);
                        setCustomInstallments(false);
                        clearFieldError('installments');
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
                        !customInstallments && numInstallments === n
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setCustomInstallments(true)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
                      customInstallments ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Otro
                  </button>
                </div>
                {fieldErrors.installments && (
                  <p className="text-red-400 text-xs font-medium">{fieldErrors.installments}</p>
                )}
                {customInstallments && (
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Cantidad de cuotas"
                    value={customInstallmentsValue}
                    onChange={(e) => {
                      setCustomInstallmentsValue(e.target.value.replace(/[^0-9]/g, ''));
                      clearFieldError('installments');
                    }}
                    className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition ${
                      fieldErrors.installments
                        ? 'border-red-500'
                        : 'border-slate-700 focus:border-violet-500'
                    }`}
                  />
                )}
                {installmentPreview.length > 0 && (
                  <p className="text-slate-500 text-xs">
                    1ª cuota el {format(installmentPreview[0].date, 'd MMM', { locale: es })}:{' '}
                    {installmentPreview[0].amount.toLocaleString('es-AR')} {currency}. Las siguientes,
                    el día 1 de cada mes: {installmentPreview[1]?.amount.toLocaleString('es-AR')}{' '}
                    {currency} c/u.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Comment */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Comentario</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentario (opcional)"
            rows={2}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none transition resize-none"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {/* Submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950 border-t border-slate-800">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
        >
          {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar gasto'}
        </button>
      </div>

      {/* Subcategory picker */}
      {subcategoryPicker && (
        <BottomSheet onClose={() => setSubcategoryPicker(null)}>
          <p className="text-white font-semibold mb-4">{subcategoryPicker.name}</p>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                setSelectedCategoryId(subcategoryPicker.id);
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
                key={sub.id}
                onClick={() => {
                  setSelectedCategoryId(sub.id);
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

      {/* Create category modal */}
      {showCreateCategory && (
        <CategoryFormModal
          parentCategories={topLevel}
          onClose={() => setShowCreateCategory(false)}
          onSaved={(cat) => {
            setCategories((prev) => [...prev, cat]);
            setSelectedCategoryId(cat.id);
            setShowCreateCategory(false);
          }}
        />
      )}

      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
