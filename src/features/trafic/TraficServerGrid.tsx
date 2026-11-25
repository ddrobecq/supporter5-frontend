import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { Alert, Box, Card, CardContent, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Typography } from '@mui/material';
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridRowId,
  type GridRowParams,
  type GridValidRowModel,
} from '@mui/x-data-grid';
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { toErrorMessage } from '../../components/useEntityPage';
import { isAbortError } from '../../lib/httpErrors';
import type { TraficFilters, TraficPagedFetcher } from './traficApi';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const LOCALE_TEXT = { noRowsLabel: 'Aucune donnée sur la période' };

interface TraficServerGridProps<Row extends GridValidRowModel> {
  title: string;
  filters: TraficFilters;
  refreshKey: number;
  fetchPage: TraficPagedFetcher<Row>;
  columns: GridColDef<Row>[];
  getRowId: (row: Row) => GridRowId;
  /** Ouverture de la fiche liee a la ligne (double-clic, Entree ou menu contextuel). */
  onRowOpen?: (row: Row) => void;
  canOpenRow?: (row: Row) => boolean;
  openLabel?: string;
}

interface GridData<Row> {
  rows: Row[];
  total: number;
  truncated: boolean;
}

interface GridResult<Row> {
  /** Requete a laquelle correspond ce resultat: la grille charge tant qu'elle differe de la requete courante. */
  requestKey: string;
  data: GridData<Row>;
  errorMessage: string;
}

interface ContextMenuState {
  mouseX: number;
  mouseY: number;
  rowId: string;
}

const EMPTY_DATA = { rows: [], total: 0, truncated: false };

/** Grille de classement du trafic, paginee cote serveur (tri impose par l'API). */
export function TraficServerGrid<Row extends GridValidRowModel>({
  title,
  filters,
  refreshKey,
  fetchPage,
  columns,
  getRowId,
  onRowOpen,
  canOpenRow,
  openLabel = 'Ouvrir la fiche',
}: TraficServerGridProps<Row>) {
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [result, setResult] = useState<GridResult<Row>>({ requestKey: '', data: EMPTY_DATA, errorMessage: '' });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [previousFilters, setPreviousFilters] = useState(filters);

  // Nouvelle periode: retour a la premiere page.
  if (previousFilters !== filters) {
    setPreviousFilters(filters);
    if (paginationModel.page !== 0) setPaginationModel((model) => ({ ...model, page: 0 }));
  }

  const { page, pageSize } = paginationModel;
  const requestKey = `${filters.from}|${filters.to}|${filters.bots}|${page}|${pageSize}|${refreshKey}`;
  const loading = result.requestKey !== requestKey;
  const { data, errorMessage } = result;

  useEffect(() => {
    const controller = new AbortController();
    fetchPage(filters, page + 1, pageSize, controller.signal)
      .then((response) => setResult({
        requestKey,
        data: { rows: response.data ?? [], total: response.total ?? 0, truncated: Boolean(response.truncated) },
        errorMessage: '',
      }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        setResult({ requestKey, data: EMPTY_DATA, errorMessage: toErrorMessage(error) });
      });
    return () => controller.abort();
  }, [fetchPage, filters, page, pageSize, requestKey]);

  const isOpenable = useCallback(
    (row: Row | undefined): row is Row => Boolean(row && onRowOpen && (canOpenRow ? canOpenRow(row) : true)),
    [canOpenRow, onRowOpen],
  );

  const handleRowDoubleClick = useCallback((params: GridRowParams<Row>) => {
    if (isOpenable(params.row)) onRowOpen?.(params.row);
  }, [isOpenable, onRowOpen]);

  const handleContextMenu = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!onRowOpen) return;
    const rowId = event.currentTarget.getAttribute('data-id');
    if (rowId === null) return;
    event.preventDefault();
    setContextMenu({ mouseX: event.clientX + 2, mouseY: event.clientY - 6, rowId });
  }, [onRowOpen]);

  const contextRow = useMemo(
    () => (contextMenu ? data.rows.find((row) => String(getRowId(row)) === contextMenu.rowId) : undefined),
    [contextMenu, data.rows, getRowId],
  );
  const contextRowOpenable = isOpenable(contextRow);

  const slotProps = useMemo(
    () => (onRowOpen ? { row: { onContextMenu: handleContextMenu } } : undefined),
    [handleContextMenu, onRowOpen],
  );

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
          {data.truncated ? (
            <Typography variant="caption" color="text.secondary">Liste tronquée</Typography>
          ) : null}
        </Stack>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <Box sx={{ height: 420, minWidth: 0 }}>
          <DataGrid<Row>
            rows={data.rows}
            columns={columns}
            loading={loading}
            getRowId={getRowId}
            density="compact"
            pagination
            paginationMode="server"
            rowCount={data.total}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            disableColumnSorting
            disableColumnFilter
            disableRowSelectionOnClick
            onRowDoubleClick={handleRowDoubleClick}
            onCellKeyDown={(params, event) => {
              if (event.key !== 'Enter' || !isOpenable(params.row)) return;
              event.preventDefault();
              onRowOpen?.(params.row);
            }}
            getRowClassName={(params) => (isOpenable(params.row) ? 'trafic-row-openable' : '')}
            slotProps={slotProps}
            localeText={LOCALE_TEXT}
            sx={{ '& .trafic-row-openable': { cursor: 'pointer' } }}
          />
        </Box>

        <Menu
          open={contextMenu !== null}
          onClose={() => setContextMenu(null)}
          anchorReference="anchorPosition"
          anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
        >
          <MenuItem
            disabled={!contextRowOpenable}
            onClick={() => {
              setContextMenu(null);
              if (isOpenable(contextRow)) onRowOpen?.(contextRow);
            }}
          >
            <ListItemIcon><OpenInNewRoundedIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{contextRowOpenable ? openLabel : 'Aucune fiche associée'}</ListItemText>
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
}
