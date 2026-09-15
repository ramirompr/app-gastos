import { addMonths, startOfMonth } from 'date-fns';

export interface InstallmentItem {
  installmentNumber: number;
  amount: number;
  date: Date;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Divide un monto total en N cuotas mensuales.
 * La primera cuota se fecha en `firstDate` (elegida por el usuario) y absorbe
 * el resto de un reparto no exacto; las siguientes caen el día 1 de cada mes
 * siguiente.
 */
export function computeInstallments(
  totalAmount: number,
  numInstallments: number,
  firstDate: Date
): InstallmentItem[] {
  const base = round2(Math.floor((totalAmount / numInstallments) * 100) / 100);
  const remainder = round2(totalAmount - base * numInstallments);

  const items: InstallmentItem[] = [];
  for (let i = 0; i < numInstallments; i++) {
    items.push({
      installmentNumber: i + 1,
      amount: i === 0 ? round2(base + remainder) : base,
      date: i === 0 ? firstDate : startOfMonth(addMonths(firstDate, i)),
    });
  }
  return items;
}
