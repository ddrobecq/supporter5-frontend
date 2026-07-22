import type { DeviseRow } from './types';

export function resolveDeviseLabel(row: DeviseRow): string {
  const preferred = ['NOM', 'SYMBOLE', 'DVCLEUNIK'];
  for (const field of preferred) {
    const value = row[field];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return 'Devise';
}

export function resolveDeviseId(row: DeviseRow): string | number | undefined {
  const value = row.DVCLEUNIK;
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  if (typeof value === 'number') return value;
  return undefined;
}
