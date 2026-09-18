import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Category, Expense, ExpenseInstallmentPlan, RecurringConfirmation, RecurringExpense } from './types';
import { fetchUserCategories } from './categories';
import { getExchangeRate } from './exchange-rates';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

/**
 * Cache en memoria de todo lo que se muestra en las pantallas del dashboard
 * (categorías, gastos por rango, pendientes, recurrentes, historial,
 * análisis). Es un módulo singleton, no un Context: así cualquier pantalla
 * (componente React) y también código no-React (ej. settleSharedExpense en
 * lib/expenses.ts) puede leer o invalidar el mismo cache sin tener que pasar
 * por props. Vive mientras dure la sesión de la app (se resetea con un
 * refresh de página, no al navegar entre pantallas).
 *
 * Cada recurso se guarda una sola vez por sesión ("fetch once, memoize") y
 * se sirve desde cache hasta que algo llama a invalidateAppData() — eso pasa
 * después de cada alta/edición/baja, así que no hace falta revalidar en cada
 * visita: si el cache tiene dato, es porque sigue siendo válido.
 */

interface Slot<T> {
  data: T | null;
  promise: Promise<T> | null;
}

function emptySlot<T>(): Slot<T> {
  return { data: null, promise: null };
}

export interface RecurringData {
  recurrings: RecurringExpense[];
  confirmedThisMonth: Expense[];
  /** Recurrentes marcados "pagado" este mes sin crear un gasto (ver recurring_confirmations). */
  confirmedWithoutExpense: RecurringConfirmation[];
  rate: number | null;
}

export interface HistoryData {
  plainExpenses: Expense[];
  plans: ExpenseInstallmentPlan[];
  installmentExpenses: Expense[];
}

export interface InstallmentsData {
  plans: ExpenseInstallmentPlan[];
  expenses: Expense[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

interface Cache {
  userId: string | null;
  categories: Slot<Category[]>;
  homeRanges: Map<string, Slot<Expense[]>>;
  analysisRanges: Map<number, Slot<Expense[]>>;
  pendingPayments: Slot<Expense[]>;
  pendingInstallments: Slot<InstallmentsData>;
  recurring: Slot<RecurringData>;
  history: Slot<HistoryData>;
}

function freshCache(userId: string | null): Cache {
  return {
    userId,
    categories: emptySlot(),
    homeRanges: new Map(),
    analysisRanges: new Map(),
    pendingPayments: emptySlot(),
    pendingInstallments: emptySlot(),
    recurring: emptySlot(),
    history: emptySlot(),
  };
}

let cache = freshCache(null);

/** Si cambia el usuario logueado, arrancamos con cache limpio para no mezclar datos de otra cuenta. */
function ensureUser(userId: string) {
  if (cache.userId !== userId) cache = freshCache(userId);
}

/** Limpia todo el cache. Se llama después de cualquier alta/edición/baja para que la próxima lectura sea fresca. */
export function invalidateAppData() {
  cache = freshCache(cache.userId);
}

function load<T>(getSlot: () => Slot<T>, setSlot: (s: Slot<T>) => void, fetcher: () => Promise<T>): Promise<T> {
  const slot = getSlot();
  if (slot.data !== null) return Promise.resolve(slot.data);
  if (slot.promise) return slot.promise;
  const promise = fetcher()
    .then((data) => {
      setSlot({ data, promise: null });
      return data;
    })
    .catch((err) => {
      setSlot(emptySlot());
      throw err;
    });
  setSlot({ data: null, promise });
  return promise;
}

// --- Categorías --------------------------------------------------------

export function peekCategories(): Category[] | null {
  return cache.categories.data;
}

export function getCategoriesCached(userId: string): Promise<Category[]> {
  ensureUser(userId);
  return load(
    () => cache.categories,
    (s) => (cache.categories = s),
    () => fetchUserCategories(userId)
  );
}

// --- Home: gastos por rango de fechas -----------------------------------

export function homeRangeKey(r: DateRange): string {
  return `${format(r.start, 'yyyy-MM-dd')}_${format(r.end, 'yyyy-MM-dd')}`;
}

async function fetchExpensesInRange(userId: string, r: DateRange): Promise<Expense[]> {
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .gte('date', format(r.start, 'yyyy-MM-dd'))
    .lte('date', format(r.end, 'yyyy-MM-dd'));
  return data ?? [];
}

export function peekHomeRange(r: DateRange): Expense[] | null {
  return cache.homeRanges.get(homeRangeKey(r))?.data ?? null;
}

export function getHomeRangeCached(userId: string, r: DateRange): Promise<Expense[]> {
  ensureUser(userId);
  const key = homeRangeKey(r);
  return load(
    () => cache.homeRanges.get(key) ?? emptySlot<Expense[]>(),
    (s) => cache.homeRanges.set(key, s),
    () => fetchExpensesInRange(userId, r)
  );
}

// --- Análisis: gastos de los últimos N meses ----------------------------

export const DEFAULT_ANALYSIS_MONTHS = 6;

export function analysisRangeStart(numMonths: number): Date {
  return startOfMonth(subMonths(new Date(), numMonths - 1));
}

export function peekAnalysisRange(numMonths: number): Expense[] | null {
  return cache.analysisRanges.get(numMonths)?.data ?? null;
}

export function getAnalysisRangeCached(userId: string, numMonths: number): Promise<Expense[]> {
  ensureUser(userId);
  return load(
    () => cache.analysisRanges.get(numMonths) ?? emptySlot<Expense[]>(),
    (s) => cache.analysisRanges.set(numMonths, s),
    async () => {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .gte('date', format(analysisRangeStart(numMonths), 'yyyy-MM-dd'));
      return data ?? [];
    }
  );
}

// --- Pagos pendientes (gastos compartidos sin saldar) -------------------

export function peekPendingPayments(): Expense[] | null {
  return cache.pendingPayments.data;
}

export function getPendingPaymentsCached(userId: string): Promise<Expense[]> {
  ensureUser(userId);
  return load(
    () => cache.pendingPayments,
    (s) => (cache.pendingPayments = s),
    async () => {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .eq('split_type', 'shared')
        .eq('is_settled', false)
        .order('date', { ascending: true });
      return data ?? [];
    }
  );
}

// --- Cuotas pendientes ---------------------------------------------------

export function peekPendingInstallments(): InstallmentsData | null {
  return cache.pendingInstallments.data;
}

export function getPendingInstallmentsCached(userId: string): Promise<InstallmentsData> {
  ensureUser(userId);
  return load(
    () => cache.pendingInstallments,
    (s) => (cache.pendingInstallments = s),
    async () => {
      const [{ data: plans }, { data: expenses }] = await Promise.all([
        supabase.from('expense_installment_plans').select('*').eq('user_id', userId),
        supabase.from('expenses').select('*').eq('user_id', userId).not('installment_plan_id', 'is', null),
      ]);
      return { plans: plans ?? [], expenses: expenses ?? [] };
    }
  );
}

// --- Gastos recurrentes ---------------------------------------------------

export function peekRecurring(): RecurringData | null {
  return cache.recurring.data;
}

export function getRecurringCached(userId: string): Promise<RecurringData> {
  ensureUser(userId);
  return load(
    () => cache.recurring,
    (s) => (cache.recurring = s),
    async () => {
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      const [{ data: recs }, { data: confirmed }, { data: confirmedNoExpense }, rate] = await Promise.all([
        supabase
          .from('recurring_expenses')
          .select('*')
          .eq('user_id', userId)
          .eq('active', true)
          .order('day_of_month', { ascending: true }),
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', userId)
          .not('recurring_expense_id', 'is', null)
          .gte('date', monthStart)
          .lte('date', monthEnd),
        supabase
          .from('recurring_confirmations')
          .select('*')
          .eq('user_id', userId)
          .eq('month', monthStart),
        getExchangeRate(new Date()).catch(() => null),
      ]);
      return {
        recurrings: recs ?? [],
        confirmedThisMonth: confirmed ?? [],
        confirmedWithoutExpense: confirmedNoExpense ?? [],
        rate,
      };
    }
  );
}

// --- Historial -------------------------------------------------------------

const HISTORY_FETCH_CAP = 500;

export function peekHistory(): HistoryData | null {
  return cache.history.data;
}

export function getHistoryCached(userId: string): Promise<HistoryData> {
  ensureUser(userId);
  return load(
    () => cache.history,
    (s) => (cache.history = s),
    async () => {
      const [{ data: plainExps }, { data: plansData }, { data: installExps }] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', userId)
          .is('installment_plan_id', null)
          .order('created_at', { ascending: false })
          .limit(HISTORY_FETCH_CAP),
        supabase.from('expense_installment_plans').select('*').eq('user_id', userId),
        supabase.from('expenses').select('*').eq('user_id', userId).not('installment_plan_id', 'is', null),
      ]);
      return {
        plainExpenses: plainExps ?? [],
        plans: plansData ?? [],
        installmentExpenses: installExps ?? [],
      };
    }
  );
}

// --- Precarga en segundo plano --------------------------------------------

/**
 * Dispara en paralelo la carga de todas las pantallas del menú que no sea
 * Home. Pensado para llamarse una sola vez, apenas Home termina de cargar
 * sus propios datos, así el resto del cache queda "tibio" para cuando el
 * usuario abra esas pantallas. No bloquea nada ni devuelve nada: los errores
 * se ignoran acá, la pantalla que corresponda va a reintentar el fetch sola
 * si hace falta.
 */
export function prefetchAppData(userId: string) {
  getCategoriesCached(userId).catch(() => {});
  getPendingPaymentsCached(userId).catch(() => {});
  getPendingInstallmentsCached(userId).catch(() => {});
  getRecurringCached(userId).catch(() => {});
  getHistoryCached(userId).catch(() => {});
  getAnalysisRangeCached(userId, DEFAULT_ANALYSIS_MONTHS).catch(() => {});
}

// --- Hook genérico para consumir un recurso cacheado -----------------------

/**
 * Muestra de entrada lo que ya haya en cache (instantáneo, sin spinner) y
 * dispara el fetch correspondiente igual: si no había nada, `loading` arranca
 * en true y se resuelve solo; si ya había, el estado no cambia hasta que la
 * promesa resuelva (nunca vuelve a `loading`, evita el parpadeo).
 *
 * Además revalida en segundo plano cada vez que la pestaña/app vuelve a
 * primer plano: sin eso, una sesión que quedó en memoria mientras el celular
 * estaba en background (o mientras se editó lo mismo desde otro
 * dispositivo/pestaña) sigue mostrando para siempre los datos con los que se
 * cargó, porque el cache sólo se invalida cuando ESTA sesión hace un
 * alta/edición/baja. La revalidación no togglea `loading` ni pisa `data`
 * hasta tener la respuesta nueva, para no parpadear con un skeleton.
 */
export function useCachedResource<T>(
  peek: () => T | null,
  fetcher: () => Promise<T> | null,
  deps: React.DependencyList
): { data: T | null; loading: boolean } {
  const [data, setData] = useState<T | null>(peek);
  const [loading, setLoading] = useState(() => peek() === null);

  useEffect(() => {
    const cached = peek();
    if (cached !== null) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    let cancelled = false;
    const promise = fetcher();
    if (promise) {
      promise.then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    let cancelled = false;
    const revalidate = () => {
      if (document.visibilityState !== 'visible') return;
      invalidateAppData();
      const promise = fetcher();
      if (promise) {
        promise.then((result) => {
          if (!cancelled) setData(result);
        });
      }
    };
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', revalidate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading };
}
