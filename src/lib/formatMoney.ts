function formatCompactAmount(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded.toFixed(1).replace(/\.0$/, '').replace('.', ',');
}

/** Montant compact: 3500000 -> "3,5 M€". */
export function formatMoney(amountValue: unknown, deviseSymbole: unknown = '€'): string {
  const amount = Number(amountValue ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return '';

  const devise = String(deviseSymbole ?? '').trim();
  if (amount >= 1_000_000) return `${formatCompactAmount(amount / 1_000_000)} M${devise}`;
  if (amount >= 1_000) return `${formatCompactAmount(amount / 1_000)} k${devise}`;
  return `${formatCompactAmount(amount)} ${devise}`.trim();
}
