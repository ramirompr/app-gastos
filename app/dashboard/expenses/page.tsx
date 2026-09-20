'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Category, Expense } from '@/lib/types';
import { deleteExpense } from '@/lib/expenses';
import { SettlePaymentSheet } from '@/components/expenses/SettlePaymentSheet';
import { useCurrencyDisplay } from '@/lib/currency-display-context';
import { pickAmount, formatMoney, formatExpenseAmount, formatPartnerShare, partnerShareInArsUsd } from '@/lib/format-money';
import { pluralize, movementNoun } from '@/lib/pluralize';
import { AppMenu } from '@/components/layout/AppMenu';
import { PageHeader } from '@/components/layout/PageHeader';
import { Container } from '@/components/layout/Container';
import { ExpenseRowMenu } from '@/components/expenses/ExpenseRowMenu';
import { Emoji } from '@/components/ui/Emoji';
import { MiniProportionBar } from '@/components/analysis/MiniProportionBar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CategoryGroup {
  category: Category;
  label: string;
  amount: number;
  count: number;
  expenses: Expense[];
}

function ExpensesListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { showUsd } = useCurrencyDisplay();

  const categoryId = searchParams.get('categoryId');
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const type = (searchParams.get('type') as 'expense' | 'income' | null) ?? 'expense';
  const isIncome = type === 'income';

  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [settlingExpense, setSettlingExpense] = useState<Expense | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    if (!user || !categoryId || !start || !end) return;
    setLoading(true);

    const [{ data: cat }, { data: subs }] = await Promise.all([
      supabase.from('categories').select('*').eq('id', categoryId).eq('user_id', user.id).single(),
      supabase.from('categories').select('*').eq('parent_id', categoryId),
    ]);
    setCategory(cat ?? null);
    setSubcategories(subs ?? []);

    const categoryIds = [categoryId, ...(subs ?? []).map((s) => s.id)];
    const { data: exps } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', type)
      .in('category_id', categoryIds)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    setExpenses(exps ?? []);
    setLoading(false);
  }, [user, categoryId, start, end, type]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin h-8 w-8 border-2 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !category) return null;

  const pendingCount = expenses.filter((e) => e.exchange_rate_used == null).length;
  const total = pickAmount(
    expenses.reduce((sum, e) => sum + (e.amount_ars ?? 0), 0),
    expenses.reduce((sum, e) => sum + (e.amount_usd ?? 0), 0),
    showUsd
  );
  const totalInvited = expenses
    .filter((e) => e.split_type === 'invited')
    .reduce((sum, e) => {
      const share = partnerShareInArsUsd(e);
      return share ? sum + pickAmount(share.ars, share.usd, showUsd) : sum;
    }, 0);

  const hasSubcategories = subcategories.length > 0;
  let groups: CategoryGroup[] = [];
  if (hasSubcategories) {
    const byId = new Map<string, Expense[]>();
    for (const exp of expenses) {
      const list = byId.get(exp.category_id) ?? [];
      list.push(exp);
      byId.set(exp.category_id, list);
    }
    groups = [category, ...subcategories]
      .map((cat) => {
        const list = byId.get(cat.id) ?? [];
        const amount = pickAmount(
          list.reduce((sum, e) => sum + (e.amount_ars ?? 0), 0),
          list.reduce((sum, e) => sum + (e.amount_usd ?? 0), 0),
          showUsd
        );
        return {
          category: cat,
          label: cat.id === category.id ? 'General' : cat.name,
          amount,
          count: list.length,
          expenses: list,
        };
      })
      .filter((g) => g.count > 0)
      .sort((a, b) => b.amount - a.amount);
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <PageHeader
        title={isIncome ? 'Ingresos' : 'Gastos'}
        onBack={() => router.push('/dashboard')}
        onMenu={() => setMenuOpen(true)}
      />
      <Container className="pb-4">
        <div className="flex items-center gap-4 justify-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{ backgroundColor: category.color }}
          >
            <Emoji emoji={category.icon} size={26} />
          </div>
          <div>
            <p className="text-white font-semibold">{category.name}</p>
            <p className="text-slate-500 text-sm">
              {expenses.length} {movementNoun(expenses.length, isIncome)} ·{' '}
              {formatMoney(total, showUsd)}
            </p>
            {totalInvited > 0 && (
              <p className="text-slate-500 text-xs mt-0.5">
                Invitaste: {formatMoney(totalInvited, showUsd)}
              </p>
            )}
          </div>
        </div>
      </Container>

      {hasSubcategories && groups.length > 0 && (
        <Container className="mb-2">
          <MiniProportionBar
            segments={groups.map((g) => ({ color: g.category.color, value: g.amount }))}
          />
        </Container>
      )}

      <Container className="flex flex-col gap-3">
        {pendingCount > 0 && (
          <p className="text-amber-400 text-xs text-center bg-amber-400/10 rounded-lg px-3 py-2">
            {pendingCount} {movementNoun(pendingCount, isIncome)} con
            cotización del dólar pendiente — no {pluralize(pendingCount, 'está incluido', 'están incluidos')} en
            el total todavía.
          </p>
        )}
        {expenses.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-16">
            No hay {isIncome ? 'ingresos' : 'gastos'} en esta categoría durante este período.
          </p>
        )}

        {hasSubcategories
          ? groups.map((group) => (
              <div key={group.category.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: group.category.color }}
                  >
                    <Emoji emoji={group.category.icon} size={14} />
                  </div>
                  <p className="text-white text-sm font-semibold flex-1 truncate">{group.label}</p>
                  <p className="text-slate-500 text-xs whitespace-nowrap">
                    {group.count} {movementNoun(group.count, isIncome)}
                  </p>
                  <p className="text-white text-sm font-semibold whitespace-nowrap">
                    {formatMoney(group.amount, showUsd)}
                  </p>
                </div>
                {group.expenses.map((exp) => (
                  <ExpenseCard
                    key={exp.id}
                    exp={exp}
                    showUsd={showUsd}
                    onEdit={() => router.push(`/dashboard/expenses/${exp.id}/edit`)}
                    onDelete={async () => {
                      await deleteExpense(exp.id);
                      setExpenses((prev) => prev.filter((e) => e.id !== exp.id));
                    }}
                    onSettle={() => setSettlingExpense(exp)}
                  />
                ))}
              </div>
            ))
          : expenses.map((exp) => (
              <ExpenseCard
                key={exp.id}
                exp={exp}
                showUsd={showUsd}
                onEdit={() => router.push(`/dashboard/expenses/${exp.id}/edit`)}
                onDelete={async () => {
                  await deleteExpense(exp.id);
                  setExpenses((prev) => prev.filter((e) => e.id !== exp.id));
                }}
                onSettle={() => setSettlingExpense(exp)}
              />
            ))}
      </Container>

      {settlingExpense && (
        <SettlePaymentSheet
          expense={settlingExpense}
          onClose={() => setSettlingExpense(null)}
          onSettled={(updated) => {
            setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            setSettlingExpense(null);
          }}
        />
      )}

      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

interface ExpenseCardProps {
  exp: Expense;
  showUsd: boolean;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onSettle: () => void;
}

function ExpenseCard({ exp, showUsd, onEdit, onDelete, onSettle }: ExpenseCardProps) {
  const isPending = exp.exchange_rate_used == null;
  const isIncome = exp.type === 'income';

  return (
    <div className="bg-slate-800/60 rounded-xl px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-white text-sm font-medium">{exp.description}</p>
          <p className="text-slate-500 text-xs mt-0.5">
            {format(new Date(`${exp.date}T00:00:00`), "d 'de' MMMM", { locale: es })}
          </p>
        </div>
        <p
          className={`text-sm font-semibold whitespace-nowrap ${
            isIncome ? 'text-emerald-400' : 'text-white'
          }`}
        >
          {isIncome && !isPending ? '+' : ''}
          {formatExpenseAmount(exp, showUsd)}
        </p>
        <ExpenseRowMenu label={exp.description} onEdit={onEdit} onDelete={onDelete} />
      </div>

      {exp.split_type === 'shared' && (
        <div className="flex items-center justify-between bg-slate-900/50 rounded-lg px-3 py-2">
          <div>
            <p className="text-xs text-slate-400">
              {exp.is_settled ? 'Te devolvieron ' : 'Te deben '}
              {formatPartnerShare(exp, showUsd)}
            </p>
            {exp.shared_with && <p className="text-xs text-slate-500 mt-0.5">{exp.shared_with}</p>}
          </div>
          {!exp.is_settled && (
            <button
              onClick={onSettle}
              disabled={isPending}
              title={isPending ? 'Esperá a que se resuelva la cotización pendiente' : undefined}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
            >
              Marcar como pagado
            </button>
          )}
        </div>
      )}

      {exp.split_type === 'invited' && (
        <p className="text-xs text-slate-500">Invitaste {formatPartnerShare(exp, showUsd)}</p>
      )}
    </div>
  );
}

export default function ExpensesListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="animate-spin h-8 w-8 border-2 border-violet-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <ExpensesListContent />
    </Suspense>
  );
}
