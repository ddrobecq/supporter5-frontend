import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useDepsChanged } from '../../lib/useDepsChanged';
import { fetchTourClassement } from './calendrierApi';
import type { TourClassementRow } from './types';
import { normalizeGroupName } from './tourClassementUtils';
import { ClassementClubCell, type TourClassementCardHandle } from './TourClassementCard';

interface QualifiedClub {
  group: string;
  row: TourClassementRow;
}

/** Single rank 1 of each named group (a shared rank 1, e.g. tie not played or drawn, qualifies nobody). */
function resolveQualifiedClubs(rows: TourClassementRow[]): QualifiedClub[] {
  const leadersByGroup = new Map<string, TourClassementRow[]>();
  rows.forEach((row) => {
    const group = normalizeGroupName(row.GROUPE);
    if (!group || Number(row.PAClassement ?? 0) !== 1) return;
    leadersByGroup.set(group, [...(leadersByGroup.get(group) ?? []), row]);
  });
  return Array.from(leadersByGroup.entries())
    .filter(([, leaders]) => leaders.length === 1)
    .map(([group, leaders]) => ({ group, row: leaders[0] }))
    .sort((a, b) => a.group.localeCompare(b.group, 'fr', { numeric: true }));
}

export interface TourQualifiesCardProps {
  /** Eliminatory tour whose qualified clubs should be displayed. Nothing is rendered while null. */
  tourId: number | null;
  /** Card title. A "- chargement..." suffix is appended automatically while (re)loading. */
  title?: string;
  onOpenClub?: (clubId: string, clubName: string) => void;
}

export const TourQualifiesCard = forwardRef<TourClassementCardHandle, TourQualifiesCardProps>(
  function TourQualifiesCard({ tourId, title, onOpenClub }, ref) {
    const [classementRows, setClassementRows] = useState<TourClassementRow[]>([]);
    const [loadedTourId, setLoadedTourId] = useState<number | null>(null);
    const requestTokenRef = useRef(0);

    const hasValidTour = Number.isInteger(tourId) && Number(tourId) > 0;

    const loadClassementForTour = useCallback(async (targetTourId: number) => {
      const token = ++requestTokenRef.current;
      try {
        const data = await fetchTourClassement(targetTourId);
        if (token !== requestTokenRef.current) return;
        setClassementRows(data);
        setLoadedTourId(targetTourId);
      } catch {
        // Same policy as TourClassementCard: a failed load clears the card instead of showing stale clubs.
        if (token !== requestTokenRef.current) return;
        setClassementRows([]);
        setLoadedTourId(null);
      }
    }, []);

    useImperativeHandle(ref, () => ({
      refresh: () => {
        if (hasValidTour) {
          void loadClassementForTour(Number(tourId));
        }
      },
    }), [hasValidTour, tourId, loadClassementForTour]);

    // Tour change: clear the list while rendering (and invalidate pending requests when no tour), the effect below loads.
    const tourChanged = useDepsChanged([tourId]);
    if (tourChanged) {
      setClassementRows([]);
      setLoadedTourId(null);
    }

    useEffect(() => {
      if (!Number.isInteger(tourId) || Number(tourId) <= 0) {
        requestTokenRef.current += 1;
        return;
      }
      void loadClassementForTour(Number(tourId));
    }, [tourId, loadClassementForTour]);

    const qualifiedClubs = useMemo(() => resolveQualifiedClubs(classementRows), [classementRows]);

    if (!hasValidTour) {
      return null;
    }

    const displayedTitle = `${title || 'Qualifiés du tour'}${loadedTourId === tourId ? '' : ' - chargement...'}`;

    return (
      <Card>
        <CardContent>
          <Stack spacing={1.25}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {displayedTitle}
            </Typography>

            {loadedTourId === tourId && qualifiedClubs.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Aucun qualifié pour le moment.
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {qualifiedClubs.map(({ group, row }) => {
                  const clubId = String(row.IDCLUB ?? '').trim();
                  const clubName = String(row.CLUB ?? '');
                  return (
                    <Stack key={group} direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <ClassementClubCell
                          clubId={clubId}
                          clubName={clubName}
                          lockedQualifAbrege={row.LOCKED_QUALIF_ABREGE}
                          lockedQualifLibelle={row.LOCKED_QUALIF_LIBELLE}
                          lockedQualifCouleur={row.LOCKED_QUALIF_COULEUR}
                          onClick={clubId && onOpenClub ? () => onOpenClub(clubId, clubName) : undefined}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        {group}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  },
);
