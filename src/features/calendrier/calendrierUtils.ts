import type { GridSortModel } from '@mui/x-data-grid';
import { toLocalIsoDate } from '../../components/dateUtils';
import { normalizeHeureDigits } from '../../components/heureUtils';
import type { CalendrierRow } from './types';

export const DEFAULT_SORT_MODEL: GridSortModel = [{ field: 'HEURE', sort: 'asc' }];
export const CALENDRIER_DATE_STORAGE_KEY = 'supporter:calendrier:selected-date';

function compareValues(a: unknown, b: unknown): number {
  const aNum = Number(a);
  const bNum = Number(b);
  const aIsNum = Number.isFinite(aNum);
  const bIsNum = Number.isFinite(bNum);

  if (aIsNum && bIsNum) {
    return aNum - bNum;
  }

  return String(a ?? '').localeCompare(String(b ?? ''), 'fr', { sensitivity: 'base' });
}

export function getSortedRows(rows: CalendrierRow[], sortModel: GridSortModel): CalendrierRow[] {
  if (!sortModel.length) {
    return rows;
  }

  const [{ field, sort }] = sortModel;
  if (!sort) {
    return rows;
  }

  const multiplier = sort === 'asc' ? 1 : -1;
  const sortableFields = new Set(['ETAT', 'HEURE', 'DOMICILE_NOM', 'EXTERIEUR_NOM']);
  if (!sortableFields.has(field)) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    const cmp = compareValues(
      left[field as keyof CalendrierRow],
      right[field as keyof CalendrierRow],
    );
    if (cmp !== 0) {
      return cmp * multiplier;
    }
    return compareValues(left.RECLEUNIK, right.RECLEUNIK);
  });
}

export function isDefaultHeureSortModel(sortModel: GridSortModel): boolean {
  return sortModel.length === 1 && sortModel[0].field === 'HEURE' && sortModel[0].sort === 'asc';
}

/** Approximate grid height so the compact match list fits its rows without inner scrolling. */
export function estimateCompactGridHeight(rowCount: number): number {
  const visibleRows = Math.max(rowCount, 1);
  // Approximate DataGrid chrome in compact density (header + footer + paddings).
  const estimatedGridChrome = 116;
  const estimatedRowHeight = 33;
  return Math.max(150, estimatedGridChrome + (visibleRows * estimatedRowHeight));
}

export function getInitialCalendrierDate(): string {
  const fallback = toLocalIsoDate(new Date());
  if (typeof window === 'undefined') {
    return fallback;
  }

  const stored = window.sessionStorage.getItem(CALENDRIER_DATE_STORAGE_KEY) ?? '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(stored)) {
    return stored;
  }
  return fallback;
}

function resolveCompetitionSeasonLabel(saison: unknown, coAnnee: unknown): string {
  const season = String(saison ?? '').trim();
  if (!season) return '';
  if (Number(coAnnee) === 1) {
    const match = season.match(/^(\d{4})-(\d{4})$/);
    if (match) return match[1];
  }
  return season;
}

export function buildClassementBlockLabel(row: CalendrierRow | null): string {
  if (!row) return '';

  const circ = String(row.CIRC ?? '').trim();
  const tour = String(row.TOUR_NOM ?? '').trim();
  const competition = String(row.COMPET_NOM ?? '').trim();
  const season = resolveCompetitionSeasonLabel(row.SAISON, row.CO_ANNEE);
  const competitionWithSeason = [competition, season].filter((part) => part.length > 0).join(' ');

  const core = [tour, competitionWithSeason].filter((part) => part.length > 0).join(' de ');
  if (!core) return '';
  if (!circ) return core;
  return `${circ} de ${core}`;
}

function parseRowDateTime(dateValue: string, heureValue: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return null;
  }

  const heureDigits = normalizeHeureDigits(heureValue);
  if (!/^\d{4}$/.test(heureDigits)) {
    return null;
  }

  const year = Number(dateValue.slice(0, 4));
  const month = Number(dateValue.slice(5, 7));
  const day = Number(dateValue.slice(8, 10));
  const hours = Number(heureDigits.slice(0, 2));
  const minutes = Number(heureDigits.slice(2, 4));

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
    return null;
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function getStatusAfterScoreEdit(row: CalendrierRow): number {
  const currentStatus = Number(row.ETAT);
  if (currentStatus !== 1 && currentStatus !== 2) {
    return currentStatus;
  }

  const rowDateTime = parseRowDateTime(String(row.DATE ?? ''), String(row.HEURE ?? ''));
  const now = new Date();

  if (!rowDateTime) {
    // No valid time: fall back to date-only — if the date is strictly in the past, the match is over.
    const dateStr = String(row.DATE ?? '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (new Date(dateStr) < startOfToday) {
        return 3;
      }
    }
    return currentStatus;
  }
  const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));

  if (rowDateTime <= twoHoursAgo) {
    return 3;
  }

  if (rowDateTime <= now) {
    return 2;
  }

  if (currentStatus === 2) {
    return 2;
  }

  return 1;
}

function isProgrammedUnresolvedSide(sourceValue: unknown, clubIdValue: unknown): boolean {
  const source = String(sourceValue ?? '').trim();
  const clubId = String(clubIdValue ?? '').trim();
  return source.length > 0 && clubId.length === 0;
}

/** True when one side of the match is still a placeholder (source set, club not resolved yet). */
export function isProgrammedEncounter(row: CalendrierRow | null): boolean {
  if (!row) {
    return false;
  }

  return isProgrammedUnresolvedSide(row.PADOMSource, row.DOMICILE)
    || isProgrammedUnresolvedSide(row.PAEXTSource, row.EXTERIEUR);
}

/** Positive integer tour id of the row, or null. */
export function resolveRowTourId(row: CalendrierRow | null): number | null {
  const candidate = Number(row?.TUCLEUNIK ?? 0);
  if (!Number.isInteger(candidate) || candidate <= 0) {
    return null;
  }
  return candidate;
}
