import { supabase } from './supabase';
import { format, isBefore, startOfDay, subDays } from 'date-fns';

/**
 * Obtiene la cotización de venta del dólar oficial (USD -> ARS) para una fecha.
 * Primero busca en caché (exchange_rates). Si no está, la busca en la API
 * correspondiente: cotización del día para hoy/futuro, o serie histórica para
 * fechas pasadas (así un gasto cargado con fecha atrasada usa el dólar de ese día).
 */
export async function getExchangeRate(date: Date = new Date()): Promise<number> {
  const dateStr = format(date, 'yyyy-MM-dd');
  const today = startOfDay(new Date());
  const isFuture = isBefore(today, startOfDay(date));

  const { data: cached } = await supabase
    .from('exchange_rates')
    .select('usd_to_ars')
    .eq('date', dateStr)
    .single();

  if (cached) {
    return cached.usd_to_ars;
  }

  const isPast = isBefore(startOfDay(date), today);
  const rate = isPast ? await fetchHistoricalRate(date) : await fetchCurrentRate();

  // Las fechas futuras (ej. cuotas de meses que todavía no llegaron) usan la
  // cotización de hoy como estimación, pero no se cachean bajo esa fecha:
  // si no lo hiciéramos así, cuando ese día llegue de verdad, cualquier otro
  // gasto cargado ese día heredaría silenciosamente esta cotización vieja en
  // vez de ir a buscar la real.
  if (!isFuture) {
    await supabase.from('exchange_rates').insert({
      date: dateStr,
      usd_to_ars: rate,
      fetched_at: new Date().toISOString(),
    });
  }

  return rate;
}

/**
 * Igual que calculateAmountsInBothCurrencies, pero nunca lanza: si falla la
 * consulta de cotización (API caída, etc.), devuelve todo en null para que
 * el gasto se pueda guardar igual con la dolarización pendiente y resolverse
 * más adelante (ver lib/expenses.ts: resolvePendingExchangeRates).
 */
export async function tryCalculateAmountsInBothCurrencies(
  amount: number,
  currency: 'ARS' | 'USD',
  date: Date = new Date()
): Promise<{ amount_ars: number | null; amount_usd: number | null; exchange_rate_used: number | null }> {
  try {
    return await calculateAmountsInBothCurrencies(amount, currency, date);
  } catch (err) {
    console.error('No se pudo obtener la cotización, queda pendiente:', err);
    return { amount_ars: null, amount_usd: null, exchange_rate_used: null };
  }
}

/**
 * Cotización de venta del dólar oficial vigente hoy.
 */
async function fetchCurrentRate(): Promise<number> {
  const response = await fetch('https://dolarapi.com/v1/dolares/oficial');
  if (!response.ok) {
    throw new Error('No se pudo obtener la cotización actual del dólar oficial');
  }
  const data = await response.json();
  if (!data?.venta) {
    throw new Error('Respuesta inválida de dolarapi.com');
  }
  return data.venta;
}

/**
 * Cotización de venta del dólar oficial en una fecha pasada.
 * Si ese día no tiene registro (fin de semana/feriado sin cierre propio),
 * retrocede día a día hasta encontrar el último dato disponible.
 */
async function fetchHistoricalRate(date: Date, attemptsLeft = 7): Promise<number> {
  if (attemptsLeft <= 0) {
    throw new Error('No se pudo obtener la cotización histórica del dólar oficial');
  }

  const dateStr = format(date, 'yyyy/MM/dd');
  const response = await fetch(
    `https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial/${dateStr}`
  );

  if (response.ok) {
    const data = await response.json();
    if (data?.venta) {
      return data.venta;
    }
  }

  return fetchHistoricalRate(subDays(date, 1), attemptsLeft - 1);
}

/** Convierte un monto de una moneda a otra usando una cotización ya resuelta. */
export function convertWithRate(amount: number, from: 'ARS' | 'USD', to: 'ARS' | 'USD', rate: number): number {
  if (from === to) return amount;
  return from === 'USD' ? amount * rate : amount / rate;
}

/**
 * Convierte un monto de una moneda a otra usando la cotización de una fecha dada.
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: 'ARS' | 'USD',
  toCurrency: 'ARS' | 'USD',
  date: Date = new Date()
): Promise<{ converted: number; rate: number }> {
  if (fromCurrency === toCurrency) {
    return { converted: amount, rate: 1 };
  }

  const rate = await getExchangeRate(date);

  if (fromCurrency === 'USD' && toCurrency === 'ARS') {
    return { converted: amount * rate, rate };
  }

  if (fromCurrency === 'ARS' && toCurrency === 'USD') {
    return { converted: amount / rate, rate };
  }

  throw new Error('Invalid currency conversion');
}

/**
 * Calcula ambos montos (ARS y USD) para un gasto, usando la cotización de su fecha.
 * Retorna { amount_ars, amount_usd, exchange_rate_used }
 */
export async function calculateAmountsInBothCurrencies(
  amount: number,
  currency: 'ARS' | 'USD',
  date: Date = new Date()
): Promise<{ amount_ars: number; amount_usd: number; exchange_rate_used: number }> {
  const rate = await getExchangeRate(date);

  if (currency === 'ARS') {
    return {
      amount_ars: amount,
      amount_usd: amount / rate,
      exchange_rate_used: rate,
    };
  }

  return {
    amount_ars: amount * rate,
    amount_usd: amount,
    exchange_rate_used: rate,
  };
}
