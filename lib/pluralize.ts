/** "1 gasto" vs "2 gastos" — el plural por defecto es singular + "s". */
export function pluralize(count: number, singular: string, plural: string = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

/** Como pluralize(), pero para "gasto"/"ingreso" según el tipo de movimiento. */
export function movementNoun(count: number, isIncome: boolean): string {
  return pluralize(count, isIncome ? 'ingreso' : 'gasto');
}
