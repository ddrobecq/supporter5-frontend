import { Box } from '@mui/material';
import { useGridApiRef, type GridColDef, type GridRowParams, type GridValidRowModel, type DataGridProps } from '@mui/x-data-grid';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { JoueurIdentityDisplay } from '../../../components/JoueurIdentityDisplay';
import { StatGrid } from './StatGrid';
import { StatGridToolbar } from './StatGridToolbar';
import { useStatGridSearchSelection } from './useStatGridSearchSelection';

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
  /** Controles propres a la stat, affiches sur la meme ligne que la recherche. */
  toolbarActions?: ReactNode;
  /** Expose l'API DataGrid a la stat (ex: pour retrier sur un changement d'affichage). */
  apiRef?: ReturnType<typeof useGridApiRef>;
  /** Filtre par type de competition (EPREUVE.SCOPE); null = "Aucun". */
  scope?: number | null;
  onScopeChange?: (scope: number | null) => void;
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
export function StatPlayerGrid<R extends StatPlayerRow>({ rows, valueColumns, loading, getRowId, initialState, hideIdentityColumn, toolbarActions, apiRef: externalApiRef, scope, onScopeChange }: StatPlayerGridProps<R>) {
  const resolveRowId = useCallback(getRowId ?? ((row: R) => row.IDJOUEUR), [getRowId]);
  const localApiRef = useGridApiRef();
  const apiRef = externalApiRef ?? localApiRef;
  const [search, setSearch] = useState('');
  const getSearchValues = useCallback((row: R) => [row.IDJOUEUR, row.NOM, row.PRENOM, row.SURNOM], []);
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
          field: 'joueur',
          headerName: 'Joueur',
          flex: 1,
          minWidth: 220,
          sortable: false,
          renderCell: (params) => <JoueurIdentityDisplay joueur={params.row} />,
        },
        ...valueColumns,
      ]), [hideIdentityColumn, valueColumns]);

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <StatGridToolbar
        search={search}
        onSearchChange={setSearch}
        searchLabel="Rechercher un joueur"
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
          onRowClick={(params: GridRowParams<R>) => openJoueurTab(params.row)}
          sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
          initialState={initialState}
        />
      </Box>
    </Box>
  );
}
