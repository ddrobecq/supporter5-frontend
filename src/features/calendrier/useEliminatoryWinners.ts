import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTourClassement } from './calendrierApi';
import { normalizeGroupName, resolveMatchGroup } from './tourClassementUtils';
import type { CalendrierRow, TourClassementRow } from './types';

/**
 * Loads (and caches) the ranking of every eliminatory tour present in `rows`, and tells whether a
 * side of an eliminatory match is the single qualified club of its group.
 */
export function useEliminatoryWinners(rows: CalendrierRow[], publicMode: boolean) {
  const classementCacheRef = useRef<Map<number, TourClassementRow[]>>(new Map());
  const [tourClassementByTour, setTourClassementByTour] = useState<Map<number, TourClassementRow[]>>(new Map());
  const tourClassementLoadingRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const eliminatoireTourIds = Array.from(new Set(
      rows
        .filter((row) => Number(row.TYPE_TOUR ?? 0) === 2)
        .map((row) => Number(row.TUCLEUNIK))
        .filter((tourId) => Number.isInteger(tourId) && tourId > 0),
    ));

    const missing = eliminatoireTourIds.filter((tourId) => (
      !classementCacheRef.current.has(tourId) && !tourClassementLoadingRef.current.has(tourId)
    ));

    const applyFromCache = () => {
      setTourClassementByTour((prev) => {
        let changed = eliminatoireTourIds.length !== prev.size;
        const next = new Map<number, TourClassementRow[]>();
        for (const tourId of eliminatoireTourIds) {
          const cached = classementCacheRef.current.get(tourId) ?? [];
          next.set(tourId, cached);
          if (prev.get(tourId) !== cached) {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };

    if (missing.length === 0) {
      applyFromCache();
      return;
    }

    missing.forEach((tourId) => tourClassementLoadingRef.current.add(tourId));
    void Promise.all(missing.map((tourId) => (
      fetchTourClassement(tourId, publicMode)
        .then((data) => {
          classementCacheRef.current.set(tourId, data);
        })
        .catch(() => {
          classementCacheRef.current.set(tourId, []);
        })
        .finally(() => {
          tourClassementLoadingRef.current.delete(tourId);
        })
    ))).then(applyFromCache);
  }, [rows, publicMode]);

  return useCallback((row: CalendrierRow, side: 'domicile' | 'exterieur'): boolean => {
    if (Number(row.TYPE_TOUR ?? 0) !== 2) {
      return false;
    }

    const tourRows = tourClassementByTour.get(Number(row.TUCLEUNIK)) ?? [];
    if (tourRows.length === 0) {
      return false;
    }

    const group = resolveMatchGroup(tourRows, row);
    const candidates = tourRows.filter((candidate) => (
      !group || normalizeGroupName(candidate.GROUPE) === group
    ));
    const winners = candidates.filter((candidate) => Number(candidate.PAClassement ?? 0) === 1);
    if (winners.length !== 1) {
      return false;
    }

    const clubId = side === 'domicile' ? row.DOMICILE : row.EXTERIEUR;
    return String(clubId ?? '').trim() !== ''
      && String(winners[0]?.IDCLUB ?? '').trim() === String(clubId).trim();
  }, [tourClassementByTour]);
}
