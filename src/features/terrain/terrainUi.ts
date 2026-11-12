import type { TerrainRow } from './types';

export const TERRAIN_PRIMARY_KEY_CANDIDATES = ['TECLEUNIK', 'ID', 'id', 'CODE'] as const;

export function detectTerrainPrimaryKey(rows: TerrainRow[]): string | undefined {
  const firstRow = rows[0];
  if (!firstRow) return undefined;
  const keys = Object.keys(firstRow);
  const candidate = TERRAIN_PRIMARY_KEY_CANDIDATES.find((pk) => keys.includes(pk));
  return candidate ?? keys[0];
}

export function resolveTerrainLabel(row: TerrainRow): string {
  const preferred = ['STADE', 'NOM', 'TERRAIN', 'TECLEUNIK', 'ID'];
  for (const field of preferred) {
    const value = row[field];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return 'Stade';
}

export function resolveTerrainId(row: TerrainRow): string | number | undefined {
  const preferred = ['TECLEUNIK', 'ID', 'id', 'CODE'];
  for (const field of preferred) {
    const value = row[field];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (typeof value === 'number') return value;
  }
  return undefined;
}

export function buildTerrainFormFields(source?: TerrainRow): string[] {
  const sourceFields = source ? Object.keys(source) : [];
  return [...sourceFields, 'TERRAIN_LOGO'].filter((f, i, a) => a.indexOf(f) === i);
}
