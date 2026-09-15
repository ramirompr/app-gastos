/**
 * Calcula un eje "prolijo" (máximo redondo + marcas equiespaciadas) para un
 * gráfico de barras, a partir del valor más alto a representar.
 */
export function niceAxis(maxValue: number, tickCount = 4): { max: number; ticks: number[] } {
  if (maxValue <= 0) {
    return { max: 100, ticks: [0, 25, 50, 75, 100] };
  }

  const rawStep = maxValue / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;

  let niceStep: number;
  if (residual > 5) niceStep = 10 * magnitude;
  else if (residual > 2) niceStep = 5 * magnitude;
  else if (residual > 1) niceStep = 2 * magnitude;
  else niceStep = magnitude;

  const max = niceStep * tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * niceStep);
  return { max, ticks };
}

/**
 * Formatea un monto de forma compacta para ejes/etiquetas chicas.
 * En ARS abrevia miles (493000 -> "493k"); en USD los montos ya son chicos,
 * así que se muestran enteros con el símbolo (320.5 -> "US$320").
 */
export function formatCompact(n: number, isUsd = false): string {
  if (isUsd) return `US$${Math.round(n)}`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return `${Math.round(n)}`;
}
