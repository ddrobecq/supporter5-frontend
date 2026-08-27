/** Entier avec separateur de milliers: 45123 -> "45 123". */
export function formatInteger(value: unknown): string {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return '';
  return Math.trunc(numberValue).toLocaleString('fr-FR');
}
