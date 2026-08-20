import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { Box, InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import { useGridApiRef, type DataGridProps, type GridColDef, type GridRowParams, type GridValidRowModel } from '@mui/x-data-grid';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { GridRowSelectionModel } from '@mui/x-data-grid';
import { EPREUVE_SCOPE_OPTIONS } from '../../../lib/epreuveScope';
import { StatGrid } from './StatGrid';

export interface StatMatchRow extends GridValidRowModel {
  RECLEUNIK: number | string;
  DATE?: string | null;
  CIRC_COMPLET?: string | null;
  TERRAIN_NOM?: string | null;
  DOMICILE_NOM?: string | null;
  EXTERIEUR_NOM?: string | null;
}

interface StatMatchGridProps<R extends StatMatchRow> {
  rows: R[];
  /** Colonnes propres a la stat (la rencontre est deja identifiee par RECLEUNIK). */
  valueColumns: GridColDef<R>[];
  loading?: boolean;
  getRowId?: (row: R) => string;
  initialState?: DataGridProps<R>['initialState'];
  /** Controles propres a la stat, affiches sur la meme ligne que la recherche. */
  toolbarActions?: ReactNode;
  apiRef?: ReturnType<typeof useGridApiRef>;
  /** Hauteur de ligne fixe (ex: 56 pour une phrase sur 2 lignes). Eviter 'auto': boucle de mesure avec les colonnes flex. */
  rowHeight?: number;
  /** Si true, masque le champ de recherche (ex: stats de type Serie). */
  hideSearch?: boolean;
  /** Filtre par type de competition (EPREUVE.SCOPE); null = "Aucun". */
  scope?: number | null;
  onScopeChange?: (scope: number | null) => void;
}

/** Ouvre la fiche rencontre dans un onglet interne (cle RECLEUNIK, pas MACLEUNIK). */
export function openRencontreTab(row: StatMatchRow): void {
  const domicile = row.DOMICILE_NOM?.trim() ?? '';
  const exterieur = row.EXTERIEUR_NOM?.trim() ?? '';
  const label = domicile && exterieur ? `${domicile} - ${exterieur}` : 'Rencontre';

  window.dispatchEvent(new CustomEvent('supporter:tab-open', {
    detail: {
      path: `/admin/rencontres/${encodeURIComponent(String(row.RECLEUNIK))}`,
      label,
      unique: true,
      uniqueByPath: true,
    },
  }));
}

/** Grille generique pour toutes les stats du domaine Rencontre: la ligne ouvre le match. */
export function StatMatchGrid<R extends StatMatchRow>({ rows, valueColumns, loading, getRowId, initialState, toolbarActions, apiRef: externalApiRef, rowHeight, hideSearch, scope, onScopeChange }: StatMatchGridProps<R>) {
  const resolveRowId = useCallback(getRowId ?? ((row: R) => String(row.RECLEUNIK)), [getRowId]);
  const localApiRef = useGridApiRef();
  const apiRef = externalApiRef ?? localApiRef;
  const [search, setSearch] = useState('');
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });

  useEffect(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (!normalizedSearch) {
      setRowSelectionModel({ type: 'include', ids: new Set() });
      return;
    }

    const sortedIds = apiRef.current?.getSortedRowIds() ?? rows.map(resolveRowId);
    const firstMatchId = sortedIds.find((rowId) => {
      const row = apiRef.current?.getRow<R>(rowId) ?? rows.find((candidate) => resolveRowId(candidate) === rowId);
      return row
        ? [row.DOMICILE_NOM, row.EXTERIEUR_NOM, row.CIRC_COMPLET, row.TERRAIN_NOM]
          .some((value) => String(value ?? '').toLocaleLowerCase().includes(normalizedSearch))
        : false;
    });

    setRowSelectionModel({
      type: 'include',
      ids: firstMatchId == null ? new Set() : new Set([firstMatchId]),
    });

    if (firstMatchId != null) {
      const sortedIndex = sortedIds.indexOf(firstMatchId);
      const pageSize = apiRef.current?.state.pagination.paginationModel.pageSize ?? 25;
      if (sortedIndex >= 0) {
        apiRef.current?.setPage(Math.floor(sortedIndex / pageSize));
        apiRef.current?.scrollToIndexes({ rowIndex: sortedIndex });
      }
    }
  }, [apiRef, rows, search, resolveRowId]);

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        {hideSearch ? null : (
          <TextField
            size="small"
            fullWidth
            autoFocus
            label="Rechercher une rencontre"
            placeholder="Adversaire, compétition ou stade"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        )}
        {onScopeChange ? (
          <TextField
            select
            size="small"
            label="Type de compétition"
            value={scope ?? ''}
            onChange={(event) => onScopeChange(event.target.value === '' ? null : Number(event.target.value))}
            sx={{ minWidth: 220, flexShrink: 0 }}
          >
            <MenuItem value="">Aucun</MenuItem>
            {EPREUVE_SCOPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
        ) : null}
        {toolbarActions}
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <StatGrid<R>
          rows={rows}
          columns={valueColumns}
          loading={loading}
          getRowId={resolveRowId}
          apiRef={apiRef}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={setRowSelectionModel}
          onRowClick={(params: GridRowParams<R>) => openRencontreTab(params.row)}
          rowHeight={rowHeight}
          sx={{
            '& .MuiDataGrid-row': { cursor: 'pointer' },
            ...(rowHeight ? {
              '& .MuiDataGrid-cell': { whiteSpace: 'normal !important', lineHeight: 1.3, alignItems: 'center' },
            } : {}),
          }}
          initialState={initialState}
        />
      </Box>
    </Box>
  );
}
