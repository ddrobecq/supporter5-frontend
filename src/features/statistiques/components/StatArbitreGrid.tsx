import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { Box, InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import { useGridApiRef, type GridColDef, type GridValidRowModel, type DataGridProps } from '@mui/x-data-grid';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { GridRowSelectionModel } from '@mui/x-data-grid';
import { ArbitreStatIdentityDisplay } from '../../../components/ArbitreStatIdentityDisplay';
import { EPREUVE_SCOPE_OPTIONS } from '../../../lib/epreuveScope';
import { StatGrid } from './StatGrid';

export interface StatArbitreRow extends GridValidRowModel {
  IDARBITRE: string;
  NOM?: string | null;
  PRENOM?: string | null;
  IDNATIO?: string | null;
}

interface StatArbitreGridProps<R extends StatArbitreRow> {
  rows: R[];
  /** Colonnes propres a la stat (l'arbitre est ajoute automatiquement en premiere colonne). */
  valueColumns: GridColDef<R>[];
  loading?: boolean;
  getRowId?: (row: R) => string;
  initialState?: DataGridProps<R>['initialState'];
  toolbarActions?: ReactNode;
  apiRef?: ReturnType<typeof useGridApiRef>;
  /** Si true, ne pas ajouter la colonne identite arbitre automatique (ex: quand elle est integree dans valueColumns). */
  hideIdentityColumn?: boolean;
  /** Filtre par type de competition (EPREUVE.SCOPE); null = "Aucun". */
  scope?: number | null;
  onScopeChange?: (scope: number | null) => void;
}

/** Grille generique pour les stats du domaine Arbitre: 1re colonne = identite arbitre (meme principe que StatPlayerGrid). */
export function StatArbitreGrid<R extends StatArbitreRow>({ rows, valueColumns, loading, getRowId, initialState, toolbarActions, apiRef: externalApiRef, hideIdentityColumn, scope, onScopeChange }: StatArbitreGridProps<R>) {
  const resolveRowId = useCallback(getRowId ?? ((row: R) => row.IDARBITRE), [getRowId]);
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
        ? [row.IDARBITRE, row.NOM, row.PRENOM].some((value) => String(value ?? '').toLocaleLowerCase().includes(normalizedSearch))
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

  const columns: GridColDef<R>[] = useMemo(() => (hideIdentityColumn
    ? valueColumns
    : [
        {
          field: 'arbitre',
          headerName: 'Arbitre',
          flex: 1,
          minWidth: 220,
          sortable: false,
          renderCell: (params) => <ArbitreStatIdentityDisplay arbitre={params.row} />,
        },
        ...valueColumns,
      ]), [hideIdentityColumn, valueColumns]);

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <TextField
          size="small"
          fullWidth
          autoFocus
          label="Rechercher un arbitre"
          placeholder="Nom, prénom ou identifiant"
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
          columns={columns}
          loading={loading}
          getRowId={resolveRowId}
          apiRef={apiRef}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={setRowSelectionModel}
          initialState={initialState}
        />
      </Box>
    </Box>
  );
}
