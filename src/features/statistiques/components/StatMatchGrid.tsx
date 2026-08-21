import { Box } from '@mui/material';
import { useGridApiRef, type DataGridProps, type GridColDef, type GridRowParams, type GridValidRowModel } from '@mui/x-data-grid';
import { useCallback, useState, type ReactNode } from 'react';
import { StatGrid } from './StatGrid';
import { StatGridToolbar } from './StatGridToolbar';
import { useStatGridSearchSelection } from './useStatGridSearchSelection';

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
  const getSearchValues = useCallback((row: R) => [row.DOMICILE_NOM, row.EXTERIEUR_NOM, row.CIRC_COMPLET, row.TERRAIN_NOM], []);
  const { rowSelectionModel, setRowSelectionModel } = useStatGridSearchSelection({
    rows,
    apiRef,
    resolveRowId,
    search,
    getSearchValues,
  });

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <StatGridToolbar
        search={search}
        onSearchChange={setSearch}
        searchLabel="Rechercher une rencontre"
        searchPlaceholder="Adversaire, compétition ou stade"
        hideSearch={hideSearch}
        scope={scope}
        onScopeChange={onScopeChange}
        toolbarActions={toolbarActions}
      />
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
