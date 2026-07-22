import type { VilleRow } from './types';

export const VILLE_PRIMARY_KEY_CANDIDATES = ['VICLEUNIK', 'VILLEID', 'ID', 'id'] as const;

export function detectVillePrimaryKey(rows: VilleRow[]): string | undefined {
  const firstRow = rows[0];
  if (!firstRow) return undefined;
  const keys = Object.keys(firstRow);
  const candidate = VILLE_PRIMARY_KEY_CANDIDATES.find((pk) => keys.includes(pk));
  return candidate ?? keys[0];
}

export function resolveVilleLabel(row: VilleRow): string {
  const preferred = ['NOM', 'VILLE', 'VILLE_NOM', 'VICLEUNIK', 'VILLEID', 'ID'];
  for (const field of preferred) {
    const value = row[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }
  return 'Ville';
}

export function resolveVilleId(row: VilleRow): string | number | undefined {
  const preferred = ['VICLEUNIK', 'VILLEID', 'ID', 'id'];
  for (const field of preferred) {
    const value = row[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === 'number') {
      return value;
    }
  }
  return undefined;
}

export function buildVilleFormFields(source?: VilleRow): string[] {
  const sourceFields = source ? Object.keys(source) : [];
  return sourceFields.filter((f, i, a) => a.indexOf(f) === i);
}
