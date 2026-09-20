import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createQueryBuilder } from './test-utils/supabase-mock';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { from: fromMock } }));

import {
  convertWithRate,
  convertCurrency,
  calculateAmountsInBothCurrencies,
  tryCalculateAmountsInBothCurrencies,
  getExchangeRate,
} from './exchange-rates';

function mockCacheLookup(result: { data: unknown; error: unknown }) {
  fromMock.mockImplementationOnce(() => createQueryBuilder(result));
}

function mockInsert() {
  fromMock.mockImplementationOnce(() => createQueryBuilder({ data: null, error: null }));
}

beforeEach(() => {
  fromMock.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 20, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('convertWithRate', () => {
  it('no convierte si origen y destino son la misma moneda', () => {
    expect(convertWithRate(1000, 'ARS', 'ARS', 1200)).toBe(1000);
  });

  it('convierte de USD a ARS multiplicando por la cotización', () => {
    expect(convertWithRate(10, 'USD', 'ARS', 1200)).toBe(12000);
  });

  it('convierte de ARS a USD dividiendo por la cotización', () => {
    expect(convertWithRate(12000, 'ARS', 'USD', 1200)).toBe(10);
  });
});

describe('getExchangeRate', () => {
  it('devuelve la cotización cacheada sin llamar a ninguna API externa', async () => {
    mockCacheLookup({ data: { usd_to_ars: 1234 }, error: null });
    vi.stubGlobal('fetch', vi.fn());

    const rate = await getExchangeRate(new Date(2026, 8, 20));

    expect(rate).toBe(1234);
    expect(fetch).not.toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledTimes(1); // solo el lookup, sin insert
  });

  it('para hoy sin caché, consulta la cotización actual y la guarda', async () => {
    mockCacheLookup({ data: null, error: { message: 'not found' } });
    mockInsert();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ venta: 1050 }) });
    vi.stubGlobal('fetch', fetchMock);

    const rate = await getExchangeRate(new Date(2026, 8, 20, 12, 0, 0));

    expect(rate).toBe(1050);
    expect(fetchMock).toHaveBeenCalledWith('https://dolarapi.com/v1/dolares/oficial');
    expect(fromMock).toHaveBeenCalledTimes(2); // lookup + insert
  });

  it('para una fecha pasada sin caché, consulta la serie histórica y la guarda', async () => {
    mockCacheLookup({ data: null, error: { message: 'not found' } });
    mockInsert();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ venta: 900 }) });
    vi.stubGlobal('fetch', fetchMock);

    const rate = await getExchangeRate(new Date(2026, 8, 1));

    expect(rate).toBe(900);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial/2026/09/01'
    );
    expect(fromMock).toHaveBeenCalledTimes(2);
  });

  it('reintenta un día hacia atrás si la fecha pasada no tiene cierre (fin de semana/feriado)', async () => {
    mockCacheLookup({ data: null, error: { message: 'not found' } });
    mockInsert();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ venta: 880 }) });
    vi.stubGlobal('fetch', fetchMock);

    const rate = await getExchangeRate(new Date(2026, 8, 1));

    expect(rate).toBe(880);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.argentinadatos.com/v1/cotizaciones/dolares/oficial/2026/08/31');
  });

  it('para una fecha futura, usa la cotización actual pero NO la cachea bajo esa fecha', async () => {
    mockCacheLookup({ data: null, error: { message: 'not found' } });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ venta: 1100 }) });
    vi.stubGlobal('fetch', fetchMock);

    const rate = await getExchangeRate(new Date(2026, 9, 15)); // "hoy" está fijado en 2026-09-20

    expect(rate).toBe(1100);
    expect(fetchMock).toHaveBeenCalledWith('https://dolarapi.com/v1/dolares/oficial');
    expect(fromMock).toHaveBeenCalledTimes(1); // solo el lookup, ningún insert
  });

  it('si se agotan los reintentos históricos, rechaza la promesa', async () => {
    mockCacheLookup({ data: null, error: { message: 'not found' } });
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getExchangeRate(new Date(2026, 8, 1))).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });
});

describe('calculateAmountsInBothCurrencies', () => {
  it('para un gasto en ARS, calcula el equivalente en USD con la cotización del día', async () => {
    mockCacheLookup({ data: { usd_to_ars: 1000 }, error: null });

    const result = await calculateAmountsInBothCurrencies(5000, 'ARS', new Date(2026, 8, 20));

    expect(result).toEqual({ amount_ars: 5000, amount_usd: 5, exchange_rate_used: 1000 });
  });

  it('para un gasto en USD, calcula el equivalente en ARS con la cotización del día', async () => {
    mockCacheLookup({ data: { usd_to_ars: 1000 }, error: null });

    const result = await calculateAmountsInBothCurrencies(5, 'USD', new Date(2026, 8, 20));

    expect(result).toEqual({ amount_ars: 5000, amount_usd: 5, exchange_rate_used: 1000 });
  });
});

describe('convertCurrency', () => {
  it('no llama a la API si origen y destino son iguales', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const result = await convertCurrency(500, 'ARS', 'ARS');
    expect(result).toEqual({ converted: 500, rate: 1 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('convierte de USD a ARS usando la cotización resuelta', async () => {
    mockCacheLookup({ data: { usd_to_ars: 1000 }, error: null });
    const result = await convertCurrency(10, 'USD', 'ARS', new Date(2026, 8, 20));
    expect(result).toEqual({ converted: 10000, rate: 1000 });
  });
});

describe('tryCalculateAmountsInBothCurrencies', () => {
  it('devuelve todo en null en vez de lanzar si falla la consulta de cotización', async () => {
    mockCacheLookup({ data: null, error: { message: 'not found' } });
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const result = await tryCalculateAmountsInBothCurrencies(1000, 'ARS', new Date(2026, 8, 1));

    expect(result).toEqual({ amount_ars: null, amount_usd: null, exchange_rate_used: null });
  });

  it('devuelve los montos normalmente si la cotización se resuelve', async () => {
    mockCacheLookup({ data: { usd_to_ars: 1000 }, error: null });

    const result = await tryCalculateAmountsInBothCurrencies(1000, 'ARS', new Date(2026, 8, 20));

    expect(result).toEqual({ amount_ars: 1000, amount_usd: 1, exchange_rate_used: 1000 });
  });
});
