import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
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
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { createArbitre, deleteArbitre, fetchArbitre, fetchArbitreById, updateArbitre, canDeleteArbitre } from './arbitreApi';
import { fetchNatio } from '../natio/natioApi';
import { ArbitreFormDialog } from './ArbitreFormDialog';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { ArbitreRow } from './types';
import type { NatioRow } from '../natio/types';
import type { IntegrityConstraint } from './arbitreApi';

const PK_CANDIDATES = ['IDARBITRE', 'ID', 'id'];

function detectPrimaryKey(rows: ArbitreRow[]): string | undefined {
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
    if (error.response?.status === 404) return 'Ressource introuvable. Verifiez la route ARBITRE backend.';
    if (error.response?.status === 409) return 'Suppression impossible: des enregistrements dependants existent.';
  }
  return 'Une erreur est survenue.';
}

export function ArbitrePage() {
  const [rows, setRows] = useState<ArbitreRow[]>([]);
  const [natioDatas, setNatioDatas] = useState<NatioRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const didFocusSearchRef = useRef(false);
  const actionButtonsRowRef = useRef<HTMLDivElement | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [activeRow, setActiveRow] = useState<ArbitreRow | undefined>(undefined);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteConstraints, setDeleteConstraints] = useState<IntegrityConstraint[]>([]);

  const [snackbar, setSnackbar] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);
  const [compactActionButtons, setCompactActionButtons] = useState(false);

  const primaryKey = useMemo(() => detectPrimaryKey(rows), [rows]);

  const columns = useMemo<GridColDef[]>(() => {
    return [
      {
        field: 'fullName',
        headerName: 'Arbitre',
        flex: 1,
        minWidth: 280,
        sortable: false,
        renderCell: (params) => {
          const nom = String(params.row.NOM ?? '').toUpperCase();
          const prenom = params.row.PRENOM ?? '';
          const idnatio = params.row.IDNATIO;
          return `${nom} ${prenom} (${String(idnatio ?? '')})`;
        },
      },
    ];
  }, []);

  const formFields = useMemo<string[]>(() => {
    const source = activeRow ?? rows[0];
    const sourceFields = source ? Object.keys(source) : [];
    return sourceFields.filter((field, index, array) => array.indexOf(field) === index);
  }, [activeRow, rows]);

  const getRowId = (row: ArbitreRow): GridRowId => {
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
      const result = await fetchArbitre(query.trim(), controller.signal);
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
      setSnackbar({ severity: 'error', message: 'Selectionnez un arbitre a ouvrir.' });
      return;
    }

    try {
      const row = await fetchArbitreById(selectedId as string | number);
      setDialogMode('edit');
      setActiveRow(row);
      setSelection([selectedId]);
      setDialogOpen(true);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  const handleFormSubmit = async (payload: ArbitreRow) => {
    try {
      if (dialogMode === 'create') {
        await createArbitre(payload);
        setSnackbar({ severity: 'success', message: 'Arbitre cree.' });
      } else {
        const selectedId = selection.at(0);
        if (!selectedId) {
          setSnackbar({ severity: 'error', message: 'Aucun arbitre selectione.' });
          return;
        }
        await updateArbitre(selectedId as string | number, payload);
        setSnackbar({ severity: 'success', message: 'Arbitre mis a jour.' });
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
      setSnackbar({ severity: 'error', message: 'Selectionnez un arbitre a supprimer.' });
      return;
    }

    try {
      await deleteArbitre(selectedId as string | number);
      setSnackbar({ severity: 'success', message: 'Arbitre supprime.' });
      setConfirmDeleteOpen(false);
      setDeleteConstraints([]);
      setSelection([]);
      await loadData(search);
    } catch (error) {
      const message = toErrorMessage(error);
      if (message.toLowerCase().includes('constraint') || message.toLowerCase().includes('foreign key')) {
        setSnackbar({
          severity: 'error',
          message: 'Suppression impossible: cet arbitre est reference dans d\'autres donnees.',
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
      setSnackbar({ severity: 'error', message: 'Selectionnez un arbitre a supprimer.' });
      return;
    }

    try {
      const result = await canDeleteArbitre(selectedId as string | number);
      setDeleteConstraints(result.constraints);
      setConfirmDeleteOpen(true);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  useEffect(() => {
    void loadData('');
    fetchNatio('').then((result) => setNatioDatas(result.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
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
  }, [search]);

  useEffect(() => {
    const row = actionButtonsRowRef.current;
    if (!row) return;

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

  useEffect(() => () => {
    activeRequestRef.current?.abort();
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>Arbitres</Typography>

      <Card>
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
          >
            <TextField
              size="small"
              label="Rechercher un arbitre"
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

      <ArbitreFormDialog
        open={dialogOpen}
        mode={dialogMode}
        fields={formFields}
        primaryKey={primaryKey}
        initialData={activeRow}
        natioDatas={natioDatas}
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
              Cette action est irreversible. Verifiez que cet arbitre n'est pas utilise dans d'autres enregistrements.
            </DialogContentText>
          ) : (
            <Stack spacing={1.5}>
              <DialogContentText>
                <strong>Suppression impossible.</strong> Cet arbitre est utilise dans d'autres donnees:
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

      <AppFeedbackSnackbar value={snackbar} onClose={() => setSnackbar(null)} />
    </Stack>
  );
}
