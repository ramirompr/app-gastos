import { supabase } from './supabase';
import type { ExchangeRate } from './types';
import { format } from 'date-fns';

/**
 * Obtiene la cotización USD -> ARS para una fecha específica.
 * Primero intenta obtenerla del caché (exchange_rates).
 * Si no existe, la obtiene de una API externa y la guarda.
 */
export async function getExchangeRate(date: Date = new Date()): Promise<number> {
  const dateStr = format(date, 'yyyy-MM-dd');

  try {
    // 1. Buscar en caché
    const { data: cached } = await supabase
      .from('exchange_rates')
      .select('usd_to_ars')
      .eq('date', dateStr)
      .single();

    if (cached) {
      return cached.usd_to_ars;
    }

    // 2. Si no está en caché, obtener de API
    const rate = await fetchExchangeRateFromAPI();

    // 3. Guardar en caché
    await supabase.from('exchange_rates').insert({
      date: dateStr,
      usd_to_ars: rate,
      fetched_at: new Date().toISOString(),
    });

    return rate;
  } catch (error) {
    console.error('Error getting exchange rate:', error);
    // Fallback a un valor aproximado (no ideal, pero es un backup)
    return 1000; // Valor muy aproximado, el usuario debería investigar
  }
}

/**
 * Obtiene la cotización de una API externa.
 * Intenta primero con Bluelytics (económico oficial), luego con dolarapi.
 */
async function fetchExchangeRateFromAPI(): Promise<number> {
  try {
    // Intentar Bluelytics primero (proporciona cotizaciones oficiales y blue)
    const response = await fetch('https://api.bluelytics.com.ar/json/last');
    if (response.ok) {
      const data = await response.json();
      // Usa el promedio entre oficial y blue, o solo oficial
      // data.last.compra_oficial, data.last.venta_oficial, etc.
      const official = data.last?.venta_oficial || data.last?.compra_oficial;
      if (official) {
        return official;
      }
    }
  } catch (error) {
    console.log('Bluelytics API failed, trying dolarapi...');
  }

  try {
    // Fallback a dolarapi.com
    const response = await fetch('https://api.dolarapi.com/v1/cotizaciones/oficial');
    if (response.ok) {
      const data = await response.json();
      return data.venta || data.compra;
    }
  } catch (error) {
    console.log('dolarapi.com also failed');
  }

  throw new Error('No se pudo obtener la cotización del dólar');
}

/**
 * Convierte un monto de una moneda a otra usando la cotización del día.
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: 'ARS' | 'USD',
  toCurrency: 'ARS' | 'USD'
): Promise<{ converted: number; rate: number }> {
  if (fromCurrency === toCurrency) {
    return { converted: amount, rate: 1 };
  }

  const rate = await getExchangeRate();

  if (fromCurrency === 'USD' && toCurrency === 'ARS') {
    return { converted: amount * rate, rate };
  }

  if (fromCurrency === 'ARS' && toCurrency === 'USD') {
    return { converted: amount / rate, rate };
  }

  throw new Error('Invalid currency conversion');
}

/**
 * Calcula ambos montos (ARS y USD) para un gasto.
 * Retorna { amount_ars, amount_usd, exchange_rate_used }
 */
export async function calculateAmountsInBothCurrencies(
  amount: number,
  currency: 'ARS' | 'USD'
): Promise<{ amount_ars: number; amount_usd: number; exchange_rate_used: number }> {
  const rate = await getExchangeRate();

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
