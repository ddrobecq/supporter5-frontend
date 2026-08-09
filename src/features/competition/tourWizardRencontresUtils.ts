import { formatDateShort } from '../../components/DateInputField';
import type { TourMatchRow, TourParticipantRow } from './types';

export function normalizeDate(value: string): string {
  const trimmed = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return '';
}

export function parseDateInput(value: unknown): string {
  const trimmed = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const frenchMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (frenchMatch) {
    const [, dd, mm, yyyy] = frenchMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
}

export function formatDateDisplay(value: unknown): string {
  return formatDateShort(value);
}

export function normalizeHeure(value: string | null | undefined): string {
  const trimmed = String(value ?? '').trim();
  const compact = /^([01]\d|2[0-3])([0-5]\d)$/.exec(trimmed);
  if (compact) {
    return `${compact[1]}:${compact[2]}`;
  }
  const withH = /^([01]\d|2[0-3])h([0-5]\d)$/i.exec(trimmed);
  if (withH) {
    return `${withH[1]}:${withH[2]}`;
  }
  const withSeconds = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.exec(trimmed);
  if (withSeconds) {
    return `${withSeconds[1]}:${withSeconds[2]}`;
  }
  if (/^\d{2}:\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 5);
  }
  return '';
}

export function formatHeureDisplay(value: unknown): string {
  const dbHeure = normalizeHeure(String(value ?? ''));
  if (!dbHeure) {
    return String(value ?? '').trim();
  }
  return `${dbHeure.slice(0, 2)}h${dbHeure.slice(3, 5)}`;
}

export function compareDateHeure(a: TourMatchRow, b: TourMatchRow): number {
  const left = `${String(a.DATE ?? '')} ${String(a.HEURE ?? '')}`;
  const right = `${String(b.DATE ?? '')} ${String(b.HEURE ?? '')}`;
  return left.localeCompare(right, 'fr', { sensitivity: 'base' });
}

export function normalizeCircId(value: unknown): string {
  return String(value ?? '').trim();
}

export function getParticipantIdentityKey(row: TourParticipantRow): string {
  const clubId = String(row.IDCLUB ?? '').trim();
  if (clubId) {
    return `club:${clubId}`;
  }

  const source = String(row.PASource ?? '').trim();
  if (source) {
    return `src:${source}`;
  }

  return `pacleunik:${String(row.PACLEUNIK)}`;
}
