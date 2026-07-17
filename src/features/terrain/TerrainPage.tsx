import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { createTerrain, deleteTerrain, fetchTerrain, fetchTerrainById, updateTerrain, canDeleteTerrain } from './terrainApi';
import { TerrainFormDialog } from './TerrainFormDialog';
import type { TerrainRow } from './types';
import type { IntegrityConstraint } from './terrainApi';

const PK_CANDIDATES = ['TECLEUNIK', 'ID', 'id', 'CODE'];

function detectPrimaryKey(rows: TerrainRow[]): string | undefined {
  const firstRow = rows[0];
  if (!firstRow) return undefined;

  const keys = Object.keys(firstRow);
  const candidate = PK_CANDIDATES.find((pk) => keys.includes(pk));
  return candidate ?? keys[0];
}

function toErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiMessage = (error.response?.data as { message?: string } | undefined)?.message;
    if (apiMessage) return apiMessage;
    if (error.response?.status === 401) return 'Session expiree. Reconnectez-vous.';
    if (error.response?.status === 404) return 'Ressource introuvable. Verifiez la route TERRAIN backend.';
    if (error.response?.status === 409) return 'Suppression impossible: des enregistrements dependants existent.';
  }
  return 'Une erreur est survenue.';
}

export function TerrainPage() {
  const [rows, setRows] = useState<TerrainRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const didFocusSearchRef = useRef(false);
  const actionButtonsRowRef = useRef<HTMLDivElement | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [activeRow, setActiveRow] = useState<TerrainRow | undefined>(undefined);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteConstraints, setDeleteConstraints] = useState<IntegrityConstraint[]>([]);

  const [snackbar, setSnackbar] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);
  const [compactActionButtons, setCompactActionButtons] = useState(false);

  const primaryKey = useMemo(() => detectPrimaryKey(rows), [rows]);

  const columns = useMemo<GridColDef[]>(() => {
    const first = rows[0];
    
    const headerLabels: Record<string, string> = {
      STADE: 'Stade',
      VILLE_NOM: 'Ville',
    };
    
    // Default columns if no data yet
    if (!first) {
      return [
        { field: 'STADE', headerName: 'Stade', flex: 1, minWidth: 220, sortable: true },
        { field: 'VILLE_NOM', headerName: 'Ville', flex: 0.8, minWidth: 150, sortable: true },
      ];
    }

    const allFields = Object.keys(first);

    const nameField = allFields.find((f) => ['STADE', 'NOM'].includes(f));

    const visibleFields = allFields.filter((field) => !['TERRAIN_LOGO', 'TECLEUNIK', 'IDVILLE'].includes(field));
    const orderedFields = [nameField, ...visibleFields].filter(
      (field, index, array): field is string => Boolean(field) && array.indexOf(field) === index,
    );

    return orderedFields.map((field, index) => {
      const isFirstColumn = index === 0;

      return {
        field,
        headerName: headerLabels[field] || field,
        flex: isFirstColumn ? 1 : undefined,
        minWidth: isFirstColumn ? 220 : 150,
        sortable: true,
      };
    });
  }, [rows]);

  const formFields = useMemo<string[]>(() => {
    const source = activeRow ?? rows[0];
    const sourceFields = source ? Object.keys(source) : [];
    const withRequired = [...sourceFields, 'TERRAIN_LOGO'];

    return withRequired.filter((field, index, array) => array.indexOf(field) === index);
  }, [activeRow, rows]);

  const getRowId = (row: TerrainRow): GridRowId => {
    if (primaryKey && (typeof row[primaryKey] === 'string' || typeof row[primaryKey] === 'number')) {
      return row[primaryKey] as GridRowId;
    }
    return JSON.stringify(row);
  };

  const loadData = async (query: string) => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setLoading(true);
    try {
      const result = await fetchTerrain(query.trim(), controller.signal);
      if (controller.signal.aborted) return;
      setRows(result.data ?? []);
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') return;
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      if (activeRequestRef.current === controller) {
        setLoading(false);
        activeRequestRef.current = null;
      }
    }
  };

  const openCreateDialog = () => {
    setDialogMode('create');
    setActiveRow(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = async (rowId?: GridRowId) => {
    const selectedId = rowId ?? selection.at(0);
    if (selectedId === undefined || selectedId === null) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un terrain a ouvrir.' });
      return;
    }

    try {
      const row = await fetchTerrainById(selectedId as string | number);
      setDialogMode('edit');
      setActiveRow(row);
      setSelection([selectedId]);
      setDialogOpen(true);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  const handleFormSubmit = async (payload: TerrainRow) => {
    try {
      if (dialogMode === 'create') {
        await createTerrain(payload);
        setSnackbar({ severity: 'success', message: 'Terrain cree.' });
      } else {
        const selectedId = selection.at(0);
        if (!selectedId) {
          setSnackbar({ severity: 'error', message: 'Aucun terrain selectionne.' });
          return;
        }
        await updateTerrain(selectedId as string | number, payload);
        setSnackbar({ severity: 'success', message: 'Terrain mis a jour.' });
      }

      setDialogOpen(false);
      await loadData(search);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  const handleDelete = async () => {
    const selectedId = selection.at(0);
    if (!selectedId) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un terrain a supprimer.' });
      return;
    }

    try {
      await deleteTerrain(selectedId as string | number);
      setSnackbar({ severity: 'success', message: 'Terrain supprime.' });
      setConfirmDeleteOpen(false);
      setDeleteConstraints([]);
      setSelection([]);
      await loadData(search);
    } catch (error) {
      const message = toErrorMessage(error);
      if (message.toLowerCase().includes('constraint') || message.toLowerCase().includes('foreign key')) {
        setSnackbar({
          severity: 'error',
          message: 'Suppression impossible: ce terrain est reference dans d\'autres donnees.',
        });
      } else {
        setSnackbar({ severity: 'error', message });
      }
      setConfirmDeleteOpen(false);
      setDeleteConstraints([]);
    }
  };

  const handleOpenDeleteConfirm = async () => {
    const selectedId = selection.at(0);
    if (!selectedId) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un terrain a supprimer.' });
      return;
    }

    try {
      const result = await canDeleteTerrain(selectedId as string | number);
      setDeleteConstraints(result.constraints);
      setConfirmDeleteOpen(true);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  useEffect(() => {
    // DataGrid can grab keyboard focus after data load; restore it once to the search input.
    if (!loading && !didFocusSearchRef.current) {
      searchInputRef.current?.focus();
      didFocusSearchRef.current = true;
    }
  }, [loading]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadData(search);
    }, 320);

    return () => window.clearTimeout(handle);
    // Debounce search requests while typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => () => {
    activeRequestRef.current?.abort();
  }, []);

  useEffect(() => {
    const row = actionButtonsRowRef.current;
    if (!row) return;

    // Collapse labels only when each button cannot reasonably fit icon + text.
    const updateCompactState = () => {
      const spacingPx = 8;
      const totalSpacing = spacingPx * 2;
      const widthPerButton = (row.clientWidth - totalSpacing) / 3;
      setCompactActionButtons(widthPerButton < 120);
    };

    updateCompactState();
    const observer = new ResizeObserver(updateCompactState);
    observer.observe(row);

    return () => observer.disconnect();
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>Stades</Typography>

      <Card>
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
          >
            <TextField
              size="small"
              label="Rechercher un terrain"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              inputRef={searchInputRef}
              autoFocus
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ minWidth: 280 }}
            />
            <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 420 } }}>
              <Stack
                ref={actionButtonsRowRef}
                direction="row"
                spacing={1}
                sx={{
                  width: '100%',
                }}
              >
                <Tooltip title="Nouveau" disableHoverListener={!compactActionButtons}>
                  <Button
                    variant="contained"
                    startIcon={compactActionButtons ? undefined : <AddCircleOutlinedIcon />}
                    onClick={openCreateDialog}
                    aria-label="Nouveau"
                    sx={{ flex: 1, minWidth: 0 }}
                  >
                    {compactActionButtons ? <AddCircleOutlinedIcon /> : 'Nouveau'}
                  </Button>
                </Tooltip>

                <Tooltip title="Ouvrir" disableHoverListener={!compactActionButtons}>
                  <Button
                    variant="outlined"
                    startIcon={compactActionButtons ? undefined : <EditOutlinedIcon />}
                    onClick={() => void openEditDialog()}
                    aria-label="Ouvrir"
                    sx={{ flex: 1, minWidth: 0 }}
                  >
                    {compactActionButtons ? <EditOutlinedIcon /> : 'Ouvrir'}
                  </Button>
                </Tooltip>

                <Tooltip title="Supprimer" disableHoverListener={!compactActionButtons}>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={compactActionButtons ? undefined : <DeleteOutlinedIcon />}
                    onClick={() => void handleOpenDeleteConfirm()}
                    aria-label="Supprimer"
                    sx={{ flex: 1, minWidth: 0 }}
                  >
                    {compactActionButtons ? <DeleteOutlinedIcon /> : 'Supprimer'}
                  </Button>
                </Tooltip>
              </Stack>
            </Box>
          </Stack>

          <Box sx={{ mt: 2, height: 'calc(100vh - 270px)', minHeight: 420 }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              getRowId={getRowId}
              rowSelectionModel={{ type: 'include', ids: new Set(selection) }}
              onRowSelectionModelChange={(model) => setSelection(model.ids.size > 0 ? [Array.from(model.ids)[0]] : [])}
              pageSizeOptions={[25, 50, 100]}
              onRowDoubleClick={(params) => void openEditDialog(params.id)}
              onRowClick={(params) => setSelection([params.id])}
              density="compact"
              disableColumnMenu
              sx={{ '& .MuiDataGrid-cell': { cursor: 'default' } }}
            />
          </Box>
        </CardContent>
      </Card>

      <TerrainFormDialog
        open={dialogOpen}
        mode={dialogMode}
        fields={formFields}
        primaryKey={primaryKey}
        initialData={activeRow}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <Dialog open={confirmDeleteOpen} onClose={() => {
        setConfirmDeleteOpen(false);
        setDeleteConstraints([]);
      }}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          {deleteConstraints.length === 0 ? (
            <DialogContentText>
              Cette action est irreversible. Verifiez que ce terrain n'est pas utilise dans d'autres enregistrements.
            </DialogContentText>
          ) : (
            <Stack spacing={1.5}>
              <DialogContentText>
                <strong>Suppression impossible.</strong> Ce terrain est utilise dans d'autres donnees:
              </DialogContentText>
              <Stack spacing={0.75} sx={{ ml: 2 }}>
                {deleteConstraints.map((constraint) => (
                  <Box key={constraint.table} sx={{ fontSize: 0.9 }}>
                    <strong>• {constraint.table}</strong>: {constraint.description}
                  </Box>
                ))}
              </Stack>
              <DialogContentText sx={{ mt: 1.5, fontStyle: 'italic', color: 'error.main' }}>
                Supprimez ou modifiez d'abord les enregistrements dependants, puis reessayez.
              </DialogContentText>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setConfirmDeleteOpen(false);
              setDeleteConstraints([]);
            }}
            color="inherit"
          >
            {deleteConstraints.length === 0 ? 'Annuler' : 'OK'}
          </Button>
          {deleteConstraints.length === 0 && (
            <Button onClick={() => void handleDelete()} color="error" variant="contained">Supprimer</Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={3500}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {snackbar ? <Alert severity={snackbar.severity}>{snackbar.message}</Alert> : <span />}
      </Snackbar>
    </Stack>
  );
}
