import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { Box, Card, CardContent, Stack, Tooltip, Typography } from '@mui/material';
import { type GridColDef } from '@mui/x-data-grid';
import { MatchDataGrid } from '../../components/MatchDataGrid';
import { useDepsChanged } from '../../lib/useDepsChanged';
import { useEntityImage } from '../../lib/useEntityImage';
import { hexColorOrDefault } from '../../lib/color';
import { fetchTourClassement, fetchTourQualifs } from './calendrierApi';
import type { TourClassementRow, TourQualifRow } from './types';
import { hasMultipleGroups, normalizeGroupName, resolveMatchGroup, type ClassementGroupMatch } from './tourClassementUtils';

function ClassementClubCell({
  clubId,
  clubName,
  lockedQualifAbrege,
  lockedQualifLibelle,
  lockedQualifCouleur,
  onClick,
}: {
  clubId: string;
  clubName: string;
  lockedQualifAbrege?: string | null;
  lockedQualifLibelle?: string | null;
  lockedQualifCouleur?: string | null;
  onClick?: () => void;
}) {
  const { src } = useEntityImage('club', clubId);
  const lockedLabel = String(lockedQualifLibelle ?? '').trim();
  const lockedAbrege = String(lockedQualifAbrege ?? '').trim();
  const lockedColor = hexColorOrDefault(lockedQualifCouleur, '#64748b');
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClick?.();
  };
  const pill = lockedAbrege ? (
    <Tooltip title={`Verrouillé : ${lockedLabel || lockedAbrege}`}>
      <Box
        component="span"
        sx={{
          ml: 0.3,
          px: 0.25,
          minWidth: 14,
          height: 14,
          borderRadius: 10,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: lockedColor,
          color: '#fff',
          fontSize: '0.5rem',
          fontWeight: 700,
          lineHeight: 1,
          flexShrink: 0,
          position: 'relative',
          top: '-0.35em',
        }}
      >
        {lockedAbrege}
      </Box>
    </Tooltip>
  ) : null;

  return (
    <Box
      component={onClick ? 'button' : 'div'}
      type={onClick ? 'button' : undefined}
      onClick={onClick ? handleClick : undefined}
      aria-label={onClick ? `Ouvrir la fiche de ${clubName}` : undefined}
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        minWidth: 0,
        border: 0,
        p: 0,
        m: 0,
        bgcolor: 'transparent',
        color: 'inherit',
        font: 'inherit',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { textDecoration: 'underline' } : undefined,
      }}
    >
      <Box
        sx={{
          width: 18,
          height: 18,
          minWidth: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mr: 0.75,
          flexShrink: 0,
        }}
      >
        {src ? (
          <Box
            component="img"
            src={src}
            alt={clubName}
            sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        ) : (
          <ShieldOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
        )}
      </Box>
      <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
        {clubName}
      </Box>
      {pill}
    </Box>
  );
}

export interface TourClassementCardHandle {
  /** Force reload the classement for the current tourId, bypassing the internal cache. */
  refresh: () => void;
}

export interface TourClassementCardProps {
  /** Tour whose classement should be displayed. Nothing is rendered while null. */
  tourId: number | null;
  /** Use the public (read-only) API resource instead of the admin one. */
  publicMode?: boolean;
  /** The match used to auto-select the relevant group when the tour has several groups. */
  matchForGroup?: ClassementGroupMatch | null;
  /** Card title. A "- chargement..." suffix is appended automatically while (re)loading. */
  title?: string;
  /** Optional header actions (e.g. buttons to open the competition), rendered on the right of the title. */
  actions?: ReactNode;
  onOpenClub?: (clubId: string, clubName: string) => void;
}

export const TourClassementCard = forwardRef<TourClassementCardHandle, TourClassementCardProps>(
  function TourClassementCard({ tourId, publicMode = false, matchForGroup = null, title, actions, onOpenClub }, ref) {
    const [classementRows, setClassementRows] = useState<TourClassementRow[]>([]);
    const [classementQualifRows, setClassementQualifRows] = useState<TourQualifRow[]>([]);
    const [classementLoading, setClassementLoading] = useState(false);
    const [loadedTourId, setLoadedTourId] = useState<number | null>(null);

    const classementCacheRef = useRef<Map<number, TourClassementRow[]>>(new Map());
    const classementQualifCacheRef = useRef<Map<number, TourQualifRow[]>>(new Map());
    const classementRequestTokenRef = useRef(0);
    const previousTourGroupRef = useRef<{ tourId: number | null; group: string | null }>({ tourId: null, group: null });

    const loadClassementForTour = useCallback(async (targetTourId: number) => {
      if (!Number.isInteger(targetTourId) || targetTourId <= 0) {
        setClassementRows([]);
        setClassementQualifRows([]);
        setLoadedTourId(null);
        return;
      }

      const token = ++classementRequestTokenRef.current;
      setClassementLoading(true);
      try {
        const [data, qualifs] = await Promise.all([
          fetchTourClassement(targetTourId, publicMode),
          fetchTourQualifs(targetTourId),
        ]);
        if (token !== classementRequestTokenRef.current) {
          return;
        }
        classementCacheRef.current.set(targetTourId, data);
        classementQualifCacheRef.current.set(targetTourId, qualifs);
        setClassementRows(data);
        setClassementQualifRows(qualifs);
        setLoadedTourId(targetTourId);
      } catch {
        if (token !== classementRequestTokenRef.current) {
          return;
        }
        setClassementRows([]);
        setClassementQualifRows([]);
        setLoadedTourId(null);
      } finally {
        if (token === classementRequestTokenRef.current) {
          setClassementLoading(false);
        }
      }
    }, [publicMode]);

    useImperativeHandle(ref, () => ({
      refresh: () => {
        if (Number.isInteger(tourId) && Number(tourId) > 0) {
          void loadClassementForTour(Number(tourId));
        }
      },
    }), [tourId, loadClassementForTour]);

    const hasValidTour = Number.isInteger(tourId) && Number(tourId) > 0;
    // No valid tour: clear the classement while rendering, on the same dependencies as the load effect below.
    const tourRequestChanged = useDepsChanged([tourId, loadClassementForTour]);
    if (tourRequestChanged && !hasValidTour) {
      setClassementRows([]);
      setClassementQualifRows([]);
      setLoadedTourId(null);
    }

    useEffect(() => {
      if (!Number.isInteger(tourId) || Number(tourId) <= 0) return;
      const targetTourId = Number(tourId);
      const cached = classementCacheRef.current.get(targetTourId);
      if (cached) {
        setClassementRows(cached);
        setClassementQualifRows(classementQualifCacheRef.current.get(targetTourId) ?? []);
        setLoadedTourId(targetTourId);
        return;
      }
      void loadClassementForTour(targetTourId);
    }, [tourId, loadClassementForTour]);

    const classementHasMultipleGroups = useMemo(() => hasMultipleGroups(classementRows), [classementRows]);
    const resolvedMatchGroup = useMemo(
      () => resolveMatchGroup(classementRows, matchForGroup),
      [classementRows, matchForGroup],
    );

    const classementGroup = hasValidTour && classementHasMultipleGroups ? resolvedMatchGroup : null;

    useEffect(() => {
      if (!Number.isInteger(tourId) || Number(tourId) <= 0) {
        previousTourGroupRef.current = { tourId: null, group: null };
        return;
      }

      const nextGroup = classementHasMultipleGroups ? resolvedMatchGroup : null;

      const previous = previousTourGroupRef.current;
      const sameTour = previous.tourId === tourId;
      const groupChanged = previous.group !== nextGroup;

      previousTourGroupRef.current = { tourId, group: nextGroup };

      if (sameTour && groupChanged && nextGroup) {
        void loadClassementForTour(Number(tourId));
      }
    }, [tourId, classementHasMultipleGroups, resolvedMatchGroup, loadClassementForTour]);

    const displayedClassementRows = useMemo(() => {
      if (!classementHasMultipleGroups || !classementGroup) {
        return classementRows;
      }
      return classementRows.filter((row) => normalizeGroupName(row.GROUPE) === classementGroup);
    }, [classementHasMultipleGroups, classementGroup, classementRows]);

    const classementGridHeight = useMemo(() => {
      const visibleRows = Math.max(displayedClassementRows.length, 1);
      const headerHeight = 56;
      const compactRowHeight = 36;
      const verticalPadding = 8;
      return Math.max(120, headerHeight + (visibleRows * compactRowHeight) + verticalPadding);
    }, [displayedClassementRows.length]);

    const useRatioGoalAverage = useMemo(
      () => Number(classementRows[0]?.TDCalculDiffBut ?? 1) === 2,
      [classementRows],
    );

    const classementColumns = useMemo<GridColDef<TourClassementRow>[]>(() => {
      const columns: GridColDef<TourClassementRow>[] = [
        {
          field: 'PAClassement',
          headerName: '#',
          width: 50,
          align: 'center',
          headerAlign: 'center',
          valueGetter: (_value, row) => Number(row.PAClassement ?? 0),
          renderCell: (params) => {
            const rank = Number(params.row.PAClassement ?? 0);
            const qualif = classementQualifRows.find((row) => (
              rank >= Number(row.CLASS_MinRang ?? 0)
              && rank <= Number(row.CLASS_MaxRang ?? 0)
            ));
            const label = String(qualif?.CLASS_Libelle ?? '').trim();
            const rankCircle = (
              <Box
                component="span"
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  border: qualif ? '2px solid' : 'none',
                  borderColor: qualif ? hexColorOrDefault(qualif.CLASS_Couleur, '#64748b') : 'transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                {rank}
              </Box>
            );
            return label ? <Tooltip title={label}>{rankCircle}</Tooltip> : rankCircle;
          },
        },
        {
          field: 'CLUB',
          headerName: 'Club',
          flex: 1,
          minWidth: 130,
          renderCell: (params) => (
            <ClassementClubCell
              clubId={String(params.row.IDCLUB ?? '')}
              clubName={String(params.row.CLUB ?? '')}
              lockedQualifAbrege={params.row.LOCKED_QUALIF_ABREGE}
              lockedQualifLibelle={params.row.LOCKED_QUALIF_LIBELLE}
              lockedQualifCouleur={params.row.LOCKED_QUALIF_COULEUR}
              onClick={String(params.row.IDCLUB ?? '').trim() && onOpenClub
                ? () => onOpenClub(String(params.row.IDCLUB), String(params.row.CLUB ?? ''))
                : undefined}
            />
          ),
        },
        {
          field: 'PANbPoints',
          headerName: 'Pts',
          width: 56,
          align: 'center',
          headerAlign: 'center',
          valueGetter: (_value, row) => Number(row.PANbPoints ?? 0),
        },
        {
          field: 'PANbMatch',
          headerName: 'J',
          width: 48,
          align: 'center',
          headerAlign: 'center',
          valueGetter: (_value, row) => Number(row.PANbMatch ?? 0),
        },
        {
          field: 'PANbV',
          headerName: 'V',
          width: 48,
          align: 'center',
          headerAlign: 'center',
          valueGetter: (_value, row) => Number(row.PANbVD ?? 0) + Number(row.PANbVE ?? 0),
        },
        {
          field: 'PANbN',
          headerName: 'N',
          width: 48,
          align: 'center',
          headerAlign: 'center',
          valueGetter: (_value, row) => Number(row.PANbND ?? 0) + Number(row.PANbNE ?? 0),
        },
        {
          field: 'PANbD',
          headerName: 'D',
          width: 48,
          align: 'center',
          headerAlign: 'center',
          valueGetter: (_value, row) => Number(row.PANbDD ?? 0) + Number(row.PANbDE ?? 0),
        },
        {
          field: 'PANbBP',
          headerName: 'BP',
          width: 52,
          align: 'center',
          headerAlign: 'center',
          valueGetter: (_value, row) => Number(row.PANbBP ?? 0),
        },
        {
          field: 'PANbBC',
          headerName: 'BC',
          width: 52,
          align: 'center',
          headerAlign: 'center',
          valueGetter: (_value, row) => Number(row.PANbBC ?? 0),
        },
        {
          field: 'PADiff',
          headerName: 'Diff',
          width: 56,
          align: 'center',
          headerAlign: 'center',
          valueGetter: (_value, row) => Number(row.PADiff ?? 0),
          valueFormatter: (value) => {
            const numeric = Number(value ?? 0);
            if (!Number.isFinite(numeric)) return '0';
            if (numeric > 0) return `+${numeric}`;
            return String(numeric);
          },
        },
        {
          field: 'PARatio',
          headerName: 'Ratio',
          width: 64,
          align: 'center',
          headerAlign: 'center',
          valueGetter: (_value, row) => Number(row.PARatio ?? 0),
          valueFormatter: (value) => {
            const numeric = Number(value ?? 0);
            if (!Number.isFinite(numeric)) return '0';
            return numeric.toFixed(2);
          },
        },
      ];

      return columns.filter((column) => {
        if (column.field === 'PADiff') return !useRatioGoalAverage;
        if (column.field === 'PARatio') return useRatioGoalAverage;
        return true;
      });
    }, [classementQualifRows, useRatioGoalAverage, onOpenClub]);

    if (!Number.isInteger(tourId) || Number(tourId) <= 0) {
      return null;
    }

    const displayedTitle = `${title || 'Classement du tour'}${loadedTourId === tourId ? '' : ' - chargement...'}`;

    return (
      <Card>
        <CardContent>
          <Stack spacing={1.25}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {displayedTitle}
              </Typography>
              {actions ? (
                <Stack direction="row" spacing={0.25}>
                  {actions}
                </Stack>
              ) : null}
            </Stack>

            <Box sx={{ height: classementGridHeight, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <MatchDataGrid
                rows={displayedClassementRows}
                columns={classementColumns}
                loading={classementLoading}
                getRowId={(row) => row.PACLEUNIK}
                disableColumnMenu
                disableRowSelectionOnClick
                hideFooter
                density="compact"
                sx={{ width: '100%' }}
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>
    );
  },
);
