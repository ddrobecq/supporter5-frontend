import type { NatioRow } from './types';

export const NATIO_PRIMARY_KEY_CANDIDATES = ['IDNATIO', 'NATIO', 'ID', 'id', 'CODE'] as const;

export function detectNatioPrimaryKey(rows: NatioRow[]): string | undefined {
  const firstRow = rows[0];
  if (!firstRow) return undefined;
  const keys = Object.keys(firstRow);
  const candidate = NATIO_PRIMARY_KEY_CANDIDATES.find((pk) => keys.includes(pk));
  return candidate ?? keys[0];
}

export function resolveNatioLabel(row: NatioRow): string {
  const preferred = ['PAYS', 'NOM', 'NATIO_NOM', 'NATIO', 'IDNATIO', 'CODE'];
  for (const field of preferred) {
    const value = row[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }
  return 'Pays';
}

export function resolveNatioId(row: NatioRow): string | number | undefined {
  const preferred = ['IDNATIO', 'NATIO', 'CODE', 'ID', 'id'];
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

export function buildNatioFormFields(source?: NatioRow): string[] {
  const sourceFields = source ? Object.keys(source) : [];
  return [...sourceFields, 'NALOCAL', 'NAT_DRAPEAU'].filter((f, i, a) => a.indexOf(f) === i);
}
