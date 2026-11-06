import {
  Alert,
  Box,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  DataGrid,
  gridExpandedSortedRowIdsSelector,
  useGridApiRef,
  type GridColDef,
  type GridFilterModel,
  type GridPaginationModel,
  type GridRowParams,
  type GridRowSelectionModel,
  type GridSortModel,
  type GridValidRowModel,
} from '@mui/x-data-grid';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  DEFAULT_INCOMPLETS_VIEW_STATE,
  incompletsViewStore,
  type IncompletsScreenKey,
  type IncompletsViewState,
} from './incompletsViewStore';

export interface IncompletCategory<R> {
  key: string;
  label: string;
  flag: keyof R;
}

interface IncompletsViewProps<R extends GridValidRowModel> {
  /** Cle de l'etat d'affichage conserve entre les allers-retours d'onglet. */
  stateKey: IncompletsScreenKey;
  title: string;
  rows: R[];
  loading: boolean;
  errorMessage: string;
  categories: Array<IncompletCategory<R>>;
  getRowId: (row: R) => string;
  leadingColumns: GridColDef<R>[];
  onRowOpen: (row: R) => void;
  countLabel: (count: number) => string;
  /** Permet d'enrichir le libelle d'un chip avec des valeurs de la ligne. */
  chipLabel?: (category: IncompletCategory<R>, row: R) => string;
}

/** Socle commun aux pages Outils > Fiches incompletes: filtre par categorie + grille cliquable. */
export function IncompletsView<R extends GridValidRowModel>({
  stateKey,
  title,
  rows,
  loading,
  errorMessage,
  categories,
  getRowId,
  leadingColumns,
  onRowOpen,
  countLabel,
  chipLabel,
}: IncompletsViewProps<R>) {
  const apiRef = useGridApiRef();
  const view = incompletsViewStore((state) => state.views[stateKey]) ?? DEFAULT_INCOMPLETS_VIEW_STATE;
  const { category, paginationModel, sortModel, filterModel, selectedId } = view;
  const reconciledRef = useRef(false);
  const pendingScrollIndexRef = useRef<number | null>(null);

  const updateView = useCallback(
    (patch: Partial<IncompletsViewState>) => incompletsViewStore.getState().update(stateKey, patch),
    [stateKey],
  );

  const filteredRows = useMemo(() => {
    if (category === 'all') return rows;
    const flag = categories.find((item) => item.key === category)?.flag;
    if (!flag) return rows;
    return rows.filter((row) => Number(row[flag]) === 1);
  }, [rows, category, categories]);

  const columns: GridColDef<R>[] = useMemo(() => [
    ...leadingColumns,
    {
      field: 'manques',
      headerName: 'Informations manquantes',
      flex: 1.6,
      minWidth: 320,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center', py: 0.75 }}>
          {categories
            .filter((item) => Number(params.row[item.flag]) === 1)
            .map((item) => (
              <Chip
                key={item.key}
                size="small"
                color="warning"
                variant="outlined"
                label={chipLabel ? chipLabel(item, params.row) : item.label}
              />
            ))}
        </Stack>
      ),
    },
  ], [leadingColumns, categories, chipLabel]);

  const rowSelectionModel: GridRowSelectionModel = useMemo(
    () => ({ type: 'include', ids: new Set(selectedId == null ? [] : [selectedId]) }),
    [selectedId],
  );

  const handleRowClick = useCallback((params: GridRowParams<R>) => {
    updateView({ selectedId: params.id, visibleIds: [...gridExpandedSortedRowIdsSelector(apiRef)] });
    onRowOpen(params.row);
  }, [apiRef, onRowOpen, updateView]);

  const handlePaginationModelChange = useCallback(
    (model: GridPaginationModel) => updateView({ paginationModel: model }),
    [updateView],
  );
  const handleSortModelChange = useCallback((model: GridSortModel) => updateView({ sortModel: model }), [updateView]);
  const handleFilterModelChange = useCallback((model: GridFilterModel) => updateView({ filterModel: model }), [updateView]);

  // Memorise l'ordre affiche au depart de la liste (tri / filtre / categorie ont pu changer depuis le clic).
  useEffect(() => () => {
    if (!reconciledRef.current || !apiRef.current) return;
    const current = incompletsViewStore.getState().views[stateKey];
    if (current?.selectedId == null) return;
    updateView({ visibleIds: [...gridExpandedSortedRowIdsSelector(apiRef)] });
  }, [apiRef, stateKey, updateView]);

  // Apres le rechargement: conserve la ligne selectionnee, ou prend celle qui occupe maintenant sa position.
  useEffect(() => {
    if (loading || reconciledRef.current) return;
    reconciledRef.current = true;
    if (errorMessage) return;

    const current = incompletsViewStore.getState().views[stateKey];
    if (current?.selectedId == null) return;

    const ids = gridExpandedSortedRowIdsSelector(apiRef);
    if (ids.length === 0) {
      updateView({ selectedId: null, visibleIds: [] });
      return;
    }

    let index = ids.indexOf(current.selectedId);
    if (index < 0) {
      const previousIndex = current.visibleIds.indexOf(current.selectedId);
      index = Math.min(Math.max(previousIndex, 0), ids.length - 1);
    }

    const page = Math.floor(index / current.paginationModel.pageSize);
    pendingScrollIndexRef.current = index;
    updateView({
      selectedId: ids[index],
      visibleIds: [...ids],
      paginationModel: { ...current.paginationModel, page },
    });
  }, [apiRef, errorMessage, loading, stateKey, updateView]);

  // Le defilement attend que la grille ait applique la page de la ligne selectionnee.
  useEffect(() => {
    const rowIndex = pendingScrollIndexRef.current;
    if (rowIndex == null || !apiRef.current) return;
    pendingScrollIndexRef.current = null;
    apiRef.current.scrollToIndexes({ rowIndex });
  }, [apiRef, paginationModel, selectedId]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700 }}>{title}</Typography>
        <TextField
          select
          size="small"
          label="Catégorie d'incomplétude"
          value={category}
          onChange={(event) => updateView({ category: event.target.value })}
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="all">Toutes les catégories</MenuItem>
          {categories.map((item) => (
            <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>
          ))}
        </TextField>
        <Typography variant="body2" color="text.secondary">{countLabel(filteredRows.length)}</Typography>
      </Stack>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Box sx={{ height: 'calc(100vh - 260px)', minHeight: 420 }}>
        <DataGrid<R>
          apiRef={apiRef}
          rows={filteredRows}
          columns={columns}
          loading={loading}
          getRowId={getRowId}
          getRowHeight={() => 'auto'}
          onRowClick={handleRowClick}
          disableRowSelectionOnClick
          rowSelectionModel={rowSelectionModel}
          paginationModel={paginationModel}
          onPaginationModelChange={handlePaginationModelChange}
          sortModel={sortModel}
          onSortModelChange={handleSortModelChange}
          filterModel={filterModel}
          onFilterModelChange={handleFilterModelChange}
          pageSizeOptions={[25, 50, 100]}
          sx={{
            '& .MuiDataGrid-row': { cursor: 'pointer' },
            '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center', minHeight: 46 },
          }}
        />
      </Box>
    </Box>
  );
}
