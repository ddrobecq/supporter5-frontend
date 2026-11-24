import { Alert, Box, Link, Stack, Typography } from '@mui/material';
import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClubCell } from '../../components/ClubCell';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { toErrorMessage } from '../../components/useEntityPage';
import { isAbortError } from '../../lib/httpErrors';
import { useDepsChanged } from '../../lib/useDepsChanged';
import { emitTabOpen } from '../../lib/useTabMetaEvents';
import { fetchEpreuvePalmares } from './epreuveApi';
import type { EpreuvePalmaresRow, EpreuvePalmaresWinner } from './types';

interface EpreuvePalmaresGridProps {
  epreuveId: string | number;
  /** Competition row (COCLEUNIK) to highlight, e.g. the competition currently opened. */
  highlightCompetitionId?: string | number;
}

const HIGHLIGHT_ROW_CLASS = 'palmares-current-row';

function openClubTab(winner: EpreuvePalmaresWinner): void {
  emitTabOpen(`/admin/clubs/${encodeURIComponent(winner.IDCLUB)}`, winner.CLUB.trim() || winner.IDCLUB);
}

function openCompetitionTab(row: EpreuvePalmaresRow): void {
  // Provisional label: the competition pane replaces it with "<name> <season>" once loaded.
  emitTabOpen(`/admin/competitions/${encodeURIComponent(String(row.COCLEUNIK))}`, row.SAISON_LIBELLE.trim() || 'Compétition');
}

const palmaresColumns: GridColDef<EpreuvePalmaresRow>[] = [
  {
    field: 'SAISON_LIBELLE',
    headerName: 'Années',
    width: 140,
    sortable: false,
    renderCell: ({ row }) => (
      <Link
        component="button"
        type="button"
        variant="body2"
        underline="hover"
        color="inherit"
        aria-label={`Ouvrir la compétition ${row.SAISON_LIBELLE}`}
        onClick={(event) => {
          event.stopPropagation();
          openCompetitionTab(row);
        }}
      >
        {row.SAISON_LIBELLE}
      </Link>
    ),
  },
  {
    field: 'VAINQUEURS',
    headerName: 'Vainqueurs',
    minWidth: 220,
    flex: 1,
    sortable: false,
    renderCell: ({ row }) => (
      row.VAINQUEURS.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>Non attribuée</Typography>
      ) : (
        <Stack spacing={0.5} sx={{ width: '100%', minWidth: 0 }}>
          {row.VAINQUEURS.map((winner) => (
            <ClubCell
              key={winner.IDCLUB}
              clubId={winner.IDCLUB}
              clubName={winner.CLUB}
              onClick={() => openClubTab(winner)}
            />
          ))}
        </Stack>
      )
    ),
  },
];

const getPalmaresRowId = (row: EpreuvePalmaresRow) => row.COCLEUNIK;
const getAutoRowHeight = () => 'auto' as const;

interface ClubRankingRow extends EpreuvePalmaresWinner {
  RANG: number;
  VICTOIRES: number;
}

const rankingColumns: GridColDef<ClubRankingRow>[] = [
  { field: 'RANG', headerName: 'Rang', width: 80, sortable: false, align: 'right', headerAlign: 'right' },
  {
    field: 'CLUB',
    headerName: 'Club',
    minWidth: 180,
    flex: 1,
    sortable: false,
    renderCell: ({ row }) => (
      <ClubCell clubId={row.IDCLUB} clubName={row.CLUB} onClick={() => openClubTab(row)} />
    ),
  },
  { field: 'VICTOIRES', headerName: 'Victoires', width: 100, sortable: false, align: 'right', headerAlign: 'right' },
];

const getRankingRowId = (row: ClubRankingRow) => row.IDCLUB;

/** Wins per club (one per appearance in VAINQUEURS), sorted by wins desc then name, with standard competition ranking (1, 2, 2, 4). */
function buildClubRanking(rows: EpreuvePalmaresRow[]): ClubRankingRow[] {
  const byClub = new Map<string, { winner: EpreuvePalmaresWinner; wins: number }>();
  for (const row of rows) {
    for (const winner of row.VAINQUEURS) {
      const entry = byClub.get(winner.IDCLUB);
      if (entry) entry.wins += 1;
      else byClub.set(winner.IDCLUB, { winner, wins: 1 });
    }
  }
  const sorted = [...byClub.values()].sort(
    (a, b) => b.wins - a.wins || a.winner.CLUB.trim().localeCompare(b.winner.CLUB.trim(), 'fr'),
  );
  let rank = 0;
  return sorted.map(({ winner, wins }, index) => {
    if (index === 0 || wins !== sorted[index - 1].wins) rank = index + 1;
    return { IDCLUB: winner.IDCLUB, CLUB: winner.CLUB, RANG: rank, VICTOIRES: wins };
  });
}

const gridTitleSx = { fontWeight: 700, whiteSpace: 'nowrap' } as const;

/** Epreuve honours list (most recent first), shared by the admin Epreuve and Competition panes. */
export function EpreuvePalmaresGrid({ epreuveId, highlightCompetitionId }: EpreuvePalmaresGridProps) {
  const [rows, setRows] = useState<EpreuvePalmaresRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [rankingSelection, setRankingSelection] = useState<GridRowId[]>([]);

  // Synchronous part of the reload, applied while rendering on the dependencies of the effect below.
  const epreuveChanged = useDepsChanged([epreuveId]);
  if (epreuveChanged) {
    setLoading(true);
    setErrorMessage('');
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchEpreuvePalmares(epreuveId, controller.signal)
      .then((data) => {
        setRows(data);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        setRows([]);
        setErrorMessage(toErrorMessage(error));
        setLoading(false);
      });
    return () => controller.abort();
  }, [epreuveId]);

  const getRowClassName = useCallback(
    ({ row }: { row: EpreuvePalmaresRow }) => (
      highlightCompetitionId !== undefined && String(row.COCLEUNIK) === String(highlightCompetitionId) ? HIGHLIGHT_ROW_CLASS : ''
    ),
    [highlightCompetitionId],
  );

  const rankingRows = useMemo(() => buildClubRanking(rows), [rows]);

  return (
    <Stack spacing={1}>
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Stack spacing={0.75} sx={{ flex: 3, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={gridTitleSx}>Palmarès</Typography>
          <Box
            sx={{
              height: 480,
              '& .MuiDataGrid-cell': { py: 0.75, display: 'flex', alignItems: 'center' },
              [`& .${HIGHLIGHT_ROW_CLASS}`]: { bgcolor: 'action.selected', fontWeight: 700 },
            }}
          >
            <EntityDataGrid
              rows={rows}
              columns={palmaresColumns}
              loading={loading}
              getRowId={getPalmaresRowId}
              selection={selection}
              onSelectionChange={setSelection}
              getRowClassName={getRowClassName}
              getRowHeight={getAutoRowHeight}
              pageSizeOptions={[25, 50, 100]}
            />
          </Box>
        </Stack>
        <Stack spacing={0.75} sx={{ flex: 2, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={gridTitleSx}>Clubs les plus titrés</Typography>
          <Box sx={{ height: 480 }}>
            <EntityDataGrid
              rows={rankingRows}
              columns={rankingColumns}
              loading={loading}
              getRowId={getRankingRowId}
              selection={rankingSelection}
              onSelectionChange={setRankingSelection}
              pageSizeOptions={[25, 50, 100]}
            />
          </Box>
        </Stack>
      </Stack>
    </Stack>
  );
}
