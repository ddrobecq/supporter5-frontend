import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { Box, InputAdornment, TextField } from '@mui/material';
import { useGridApiRef, type GridColDef, type GridRowParams, type GridValidRowModel, type DataGridProps } from '@mui/x-data-grid';
import { useCallback, useEffect, useState } from 'react';
import type { GridRowSelectionModel } from '@mui/x-data-grid';
import { JoueurIdentityDisplay } from '../../../components/JoueurIdentityDisplay';
import { StatGrid } from './StatGrid';

export interface StatPlayerRow extends GridValidRowModel {
  IDJOUEUR: string;
  NOM?: string | null;
  PRENOM?: string | null;
  SURNOM?: string | null;
  IDNATIO?: string | null;
  EN_CLUB?: number | boolean | null;
}

interface StatPlayerGridProps<R extends StatPlayerRow> {
  rows: R[];
  /** Colonnes propres a la stat (le joueur est ajoute automatiquement en premiere colonne). */
  valueColumns: GridColDef<R>[];
  loading?: boolean;
  /** Par defaut IDJOUEUR (1 ligne par joueur); a surcharger si plusieurs lignes par joueur (ex: par saison). */
  getRowId?: (row: R) => string;
  /** Optional DataGrid initialState for sorting, filtering, etc. */
  initialState?: DataGridProps<R>['initialState'];
  /** Si true, ne pas ajouter la colonne identite joueur automatique (ex: quand elle est integree dans valueColumns). */
  hideIdentityColumn?: boolean;
}

function openJoueurTab(row: StatPlayerRow): void {
  const surnom = row.SURNOM?.trim();
  const nom = row.NOM?.trim() ? row.NOM.toUpperCase() : '';
  const prenom = row.PRENOM?.trim() ?? '';
  const label = surnom || `${nom}${prenom ? ` ${prenom}` : ''}` || row.IDJOUEUR;

  window.dispatchEvent(new CustomEvent('supporter:tab-open', {
    detail: {
      path: `/admin/joueurs/${encodeURIComponent(row.IDJOUEUR)}`,
      label,
      unique: true,
      uniqueByPath: true,
    },
  }));
}

/** Grille generique pour toutes les stats du domaine Joueur: 1re colonne = identite joueur. */
export function StatPlayerGrid<R extends StatPlayerRow>({ rows, valueColumns, loading, getRowId, initialState, hideIdentityColumn }: StatPlayerGridProps<R>) {
  const resolveRowId = useCallback(getRowId ?? ((row: R) => row.IDJOUEUR), [getRowId]);
  const apiRef = useGridApiRef();
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
        ? [row.IDJOUEUR, row.NOM, row.PRENOM, row.SURNOM]
          .some((value) => String(value ?? '').toLocaleLowerCase().includes(normalizedSearch))
        : false;
    });
    const firstMatch = firstMatchId == null
      ? undefined
      : (apiRef.current?.getRow<R>(firstMatchId) ?? rows.find((row) => resolveRowId(row) === firstMatchId));

    const selectedId = firstMatch ? resolveRowId(firstMatch) : null;
    setRowSelectionModel({
      type: 'include',
      ids: selectedId ? new Set([selectedId]) : new Set(),
    });

    if (selectedId) {
      const sortedIndex = sortedIds.indexOf(selectedId);
      const pageSize = apiRef.current?.state.pagination.paginationModel.pageSize ?? 25;
      if (sortedIndex >= 0) {
        apiRef.current?.setPage(Math.floor(sortedIndex / pageSize));
        apiRef.current?.scrollToIndexes({ rowIndex: sortedIndex });
      }
    }
  }, [apiRef, rows, search, resolveRowId]);

  const columns: GridColDef<R>[] = hideIdentityColumn
    ? valueColumns
    : [
        {
          field: 'joueur',
          headerName: 'Joueur',
          flex: 1,
          minWidth: 220,
          sortable: false,
          renderCell: (params) => <JoueurIdentityDisplay joueur={params.row} />,
        },
        ...valueColumns,
      ];

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <TextField
        size="small"
        fullWidth
        autoFocus
        label="Rechercher un joueur"
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
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <StatGrid<R>
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={resolveRowId}
          apiRef={apiRef}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={setRowSelectionModel}
          onRowClick={(params: GridRowParams<R>) => openJoueurTab(params.row)}
          sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
          initialState={initialState}
        />
      </Box>
    </Box>
  );
}
