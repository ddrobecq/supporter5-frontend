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

/**
 * TRANSAC.INDEMNITES as a phrase fragment: null (unknown) -> '', 0 (known, no fee) -> 'sans indemnité',
 * amount > 0 -> 'pour 3,5 M€'.
 */
export function formatIndemnites(amountValue: number | null | undefined, deviseSymbole: unknown = '€'): string {
  if (amountValue == null) return '';
  const amount = Number(amountValue);
  if (!Number.isFinite(amount) || amount < 0) return '';
  if (amount === 0) return 'sans indemnité';
  return `pour ${formatMoney(amount, deviseSymbole)}`;
}
