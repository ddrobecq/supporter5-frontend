import type { TourClassementRow } from './types';

export function normalizeGroupName(value: unknown): string {
  return String(value ?? '').trim();
}

export function hasMultipleGroups(rows: TourClassementRow[]): boolean {
  const groups = new Set(
    rows
      .map((row) => normalizeGroupName(row.GROUPE))
      .filter((group) => group.length > 0),
  );
  return groups.size > 1;
}

export interface ClassementGroupMatch {
  DOMICILE?: string | number | null;
  EXTERIEUR?: string | number | null;
}

export function resolveMatchGroup(rows: TourClassementRow[], match: ClassementGroupMatch | null): string | null {
  if (!match) return null;
  const domId = String(match.DOMICILE ?? '').trim();
  const extId = String(match.EXTERIEUR ?? '').trim();

  const domGroup = normalizeGroupName(rows.find((row) => String(row.IDCLUB ?? '').trim() === domId)?.GROUPE);
  const extGroup = normalizeGroupName(rows.find((row) => String(row.IDCLUB ?? '').trim() === extId)?.GROUPE);

  if (domGroup && extGroup && domGroup === extGroup) return domGroup;
  if (domGroup) return domGroup;
  if (extGroup) return extGroup;
  return null;
}
