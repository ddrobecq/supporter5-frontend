import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
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
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { createVille, deleteVille, fetchVille, fetchVilleById, updateVille, canDeleteVille } from './villeApi';
import { fetchNatio } from '../natio/natioApi';
import { VilleFormDialog } from './VilleFormDialog';
import { VilleDataGrid } from './VilleDataGrid';
import { VilleSearchBar } from './VilleSearchBar';
import { createVilleColumns, createNatioMap } from './villeColumnsHelper';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { VilleRow } from './types';
import type { NatioRow } from '../natio/types';
import type { IntegrityConstraint } from './villeApi';

const PK_CANDIDATES = ['VICLEUNIK', 'VILLEID', 'ID', 'id'];

function detectPrimaryKey(rows: VilleRow[]): string | undefined {
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
    if (error.response?.status === 404) return 'Ressource introuvable. Verifiez la route VILLE backend.';
    if (error.response?.status === 409) return 'Suppression impossible: des enregistrements dependants existent.';
  }
  return 'Une erreur est survenue.';
}

export function VillePage() {
  const [rows, setRows] = useState<VilleRow[]>([]);
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
  const [activeRow, setActiveRow] = useState<VilleRow | undefined>(undefined);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteConstraints, setDeleteConstraints] = useState<IntegrityConstraint[]>([]);

  const [snackbar, setSnackbar] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);
  const [compactActionButtons, setCompactActionButtons] = useState(false);

  const primaryKey = useMemo(() => detectPrimaryKey(rows), [rows]);

  const natioMap = useMemo(() => createNatioMap(natioDatas), [natioDatas]);
  const columns = useMemo<GridColDef[]>(() => createVilleColumns(natioMap), [natioMap]);

  const formFields = useMemo<string[]>(() => {
    const source = activeRow ?? rows[0];
    const sourceFields = source ? Object.keys(source) : [];
    return sourceFields.filter((field, index, array) => array.indexOf(field) === index);
  }, [activeRow, rows]);

  const getRowId = (row: VilleRow): GridRowId => {
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
      const result = await fetchVille(query.trim(), controller.signal);
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
      setSnackbar({ severity: 'error', message: 'Selectionnez une ville a ouvrir.' });
      return;
    }

    try {
      const row = await fetchVilleById(selectedId as string | number);
      setDialogMode('edit');
      setActiveRow(row);
      setSelection([selectedId]);
      setDialogOpen(true);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  const handleFormSubmit = async (payload: VilleRow) => {
    try {
      if (dialogMode === 'create') {
        await createVille(payload);
        setSnackbar({ severity: 'success', message: 'Ville creee.' });
      } else {
        const selectedId = selection.at(0);
        if (!selectedId) {
          setSnackbar({ severity: 'error', message: 'Aucune ville selectionnee.' });
          return;
        }
        await updateVille(selectedId as string | number, payload);
        setSnackbar({ severity: 'success', message: 'Ville mise a jour.' });
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
      setSnackbar({ severity: 'error', message: 'Selectionnez une ville a supprimer.' });
      return;
    }

    try {
      await deleteVille(selectedId as string | number);
      setSnackbar({ severity: 'success', message: 'Ville supprimee.' });
      setConfirmDeleteOpen(false);
      setDeleteConstraints([]);
      setSelection([]);
      await loadData(search);
    } catch (error) {
      const message = toErrorMessage(error);
      if (message.toLowerCase().includes('constraint') || message.toLowerCase().includes('foreign key')) {
        setSnackbar({
          severity: 'error',
          message: 'Suppression impossible: cette ville est reference dans d\'autres donnees.',
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
      setSnackbar({ severity: 'error', message: 'Selectionnez une ville a supprimer.' });
      return;
    }

    try {
      const result = await canDeleteVille(selectedId as string | number);
      setDeleteConstraints(result.constraints);
      setConfirmDeleteOpen(true);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      setConfirmDeleteOpen(false);
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
      <Typography variant="h5" sx={{ fontWeight: 700 }}>Villes</Typography>

      <Card>
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
          >
            <VilleSearchBar
              value={search}
              onChange={setSearch}
              inputRef={searchInputRef}
              autoFocus
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
            <VilleDataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              primaryKey={primaryKey}
              onRowClick={(rowId) => setSelection([rowId])}
              onRowDoubleClick={(rowId) => void openEditDialog(rowId)}
              getRowId={getRowId}
            />
          </Box>
        </CardContent>
      </Card>

      <VilleFormDialog
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
              Cette action est irreversible. Verifiez que cette ville n'est pas utilisee dans d'autres enregistrements.
            </DialogContentText>
          ) : (
            <Stack spacing={1.5}>
              <DialogContentText>
                <strong>Suppression impossible.</strong> Cette ville est utilisee dans d'autres donnees:
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
