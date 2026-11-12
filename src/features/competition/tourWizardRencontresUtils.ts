import { parseStrictHeure } from '../../components/heureUtils';
import type { TourMatchRow, TourParticipantRow } from './types';

export function formatHeureDisplay(value: unknown): string {
  const dbHeure = parseStrictHeure(String(value ?? ''));
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
