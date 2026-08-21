import { Box } from '@mui/material';
import { useGridApiRef, type GridColDef, type GridValidRowModel, type DataGridProps } from '@mui/x-data-grid';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ArbitreStatIdentityDisplay } from '../../../components/ArbitreStatIdentityDisplay';
import { StatGrid } from './StatGrid';
import { StatGridToolbar } from './StatGridToolbar';
import { useStatGridSearchSelection } from './useStatGridSearchSelection';

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
  const getSearchValues = useCallback((row: R) => [row.IDARBITRE, row.NOM, row.PRENOM], []);
  const { rowSelectionModel, setRowSelectionModel } = useStatGridSearchSelection({
    rows,
    apiRef,
    resolveRowId,
    search,
    getSearchValues,
  });

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
      <StatGridToolbar
        search={search}
        onSearchChange={setSearch}
        searchLabel="Rechercher un arbitre"
        searchPlaceholder="Nom, prénom ou identifiant"
        scope={scope}
        onScopeChange={onScopeChange}
        toolbarActions={toolbarActions}
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
          initialState={initialState}
        />
      </Box>
    </Box>
  );
}
