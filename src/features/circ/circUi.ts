import type { CircRow } from './types';

export function resolveCircLabel(row: CircRow): string {
  const preferred = ['CIRC', 'IDCIRC'];
  for (const field of preferred) {
    const value = row[field];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return 'Circonstance';
}

export function resolveCircId(row: CircRow): string | number | undefined {
  const value = row.IDCIRC;
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  if (typeof value === 'number') return value;
  return undefined;
}
