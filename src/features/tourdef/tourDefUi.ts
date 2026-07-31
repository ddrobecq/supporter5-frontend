import type { TourDefRow } from './types';

export function resolveTourDefId(row: TourDefRow): string | number | undefined {
  const value = row.TDCLEUNIK;
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return value;
}

export function resolveTourDefLabel(row: TourDefRow): string {
  const nom = String(row.NOM ?? '').trim();
  if (nom) return nom;
  const id = resolveTourDefId(row);
  return id === undefined ? 'TourDef' : `TourDef ${String(id)}`;
}
