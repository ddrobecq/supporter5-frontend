import type { GridColDef } from '@mui/x-data-grid';
import { Box, Stack } from '@mui/material';
import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { formatDateShort } from '../../components/DateInputField';
import { MatchDataGrid } from '../../components/MatchDataGrid';
import { buildMatchGridColumns, type MatchGridBaseRow } from '../../components/matchGridColumns';
import { ClubSelectField } from '../../components/ClubSelectField';
import { entityPath } from '../../lib/entityNavigation';
import { ClubMatchStatsPanel } from './ClubMatchStats';
import type { ClubMatchRow } from './types';

interface ClubMatchesTabProps {
  clubId: string;
  matches: ClubMatchRow[];
  matchesLoading?: boolean;
  filterClubId: string;
  filterClubName: string;
  onFilterChange: (next: { clubId: string; clubName: string }) => void;
  /** Rend les libellés et interactions grand public (navigation club, colonnes plus explicites). */
  publicMode?: boolean;
  /** Requis en `publicMode` : navigation vers la fiche publique du club clique dans la grille. */
  onNavigateToClub?: (clubId: string) => void;
}

function formatMatchScore(row: MatchGridBaseRow): string {
  const etat = Number(row.ETAT ?? 0);
  if (etat === 1 || etat === 5) return '-vs-';
  if (etat === 4) return '';
  const hasPenalties = Number(row.TABDOM ?? 0) > 0 || Number(row.TABEXT ?? 0) > 0;
  if (hasPenalties) {
    return `${Number(row.TABDOM ?? 0)} ${Number(row.BUTDOM ?? 0)}-${Number(row.BUTEXT ?? 0)} ${Number(row.TABEXT ?? 0)}`;
  }
  return `${Number(row.BUTDOM ?? 0)}-${Number(row.BUTEXT ?? 0)}`;
}

/** Onglet Matches d'une fiche club : filtre par adversaire + statistiques + grille. Partage entre les fiches Admin et Public. */
export function ClubMatchesTab({
  clubId,
  matches,
  matchesLoading,
  filterClubId,
  filterClubName,
  onFilterChange,
  publicMode = false,
  onNavigateToClub,
}: ClubMatchesTabProps) {
  const location = useLocation();

  const filteredMatches = useMemo(() => (
    !filterClubId ? matches : matches.filter((row) => row.DOMICILE === filterClubId || row.EXTERIEUR === filterClubId)
  ), [matches, filterClubId]);

  const openMatch = useCallback((row: ClubMatchRow) => {
    if (!row.RECLEUNIK) return;
    window.dispatchEvent(new CustomEvent('supporter:tab-open', {
      detail: {
        path: entityPath('rencontre', row.RECLEUNIK, location.pathname),
        label: 'Rencontre',
        unique: true,
        uniqueByPath: true,
      },
    }));
  }, [location.pathname]);

  const matchColumns = useMemo<GridColDef<ClubMatchRow>[]>(() => {
    const columns = buildMatchGridColumns<ClubMatchRow>({
      date: { enabled: true, width: 110, sortable: true, renderCell: (row) => formatDateShort(row.DATE) },
      circ: {
        enabled: true,
        width: 260,
        sortable: true,
        field: 'CIRC_COMPLET',
        headerName: publicMode ? 'Compétition' : 'Circonstance complete',
      },
      score: { mode: 'readonly', sortable: false, valueGetter: formatMatchScore },
      domicileHeaderName: publicMode ? 'Domicile' : 'Dom',
      exterieurHeaderName: publicMode ? 'Extérieur' : 'Ext',
      onClubClick: publicMode ? (id) => onNavigateToClub?.(id) : undefined,
    });

    return columns.map((column) => {
      if (column.field !== 'SCORE') return column;
      const renderScore = column.renderCell;
      return {
        ...column,
        renderCell: (params) => (
          <Box
            component="button"
            type="button"
            onClick={() => openMatch(params.row)}
            sx={{
              all: 'unset',
              display: 'flex',
              width: '100%',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'primary.main',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {renderScore?.(params)}
          </Box>
        ),
      };
    });
  }, [publicMode, onNavigateToClub, openMatch]);

  return (
    <Stack spacing={1.5}>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Box
            sx={{
              flex: '1 1 240px',
              maxWidth: 320,
              '& .MuiInputAdornment-positionStart .MuiTypography-root': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
            }}
          >
            <ClubSelectField
              label={publicMode ? 'Filtre' : 'Filtrer par adversaire'}
              clubId={filterClubId}
              clubName={filterClubName}
              onChange={onFilterChange}
              clearLabel="Effacer"
            />
          </Box>
        </Stack>
      </Box>

      <ClubMatchStatsPanel matches={filteredMatches} clubId={clubId} />

      <Box sx={{ height: publicMode ? 560 : 400 }}>
        <MatchDataGrid
          rows={filteredMatches}
          columns={matchColumns}
          loading={matchesLoading}
          getRowId={(row) => row.RECLEUNIK}
          openMatchOnDoubleClick={!publicMode}
          disableRowSelectionOnClick
          disableColumnMenu
          density="compact"
          pageSizeOptions={[25, 50, 100]}
        />
      </Box>
    </Stack>
  );
}
