import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMediaQuery, useTheme } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { useTabFormPaneBridge } from '../../lib/useTabFormPaneBridge';
import { toErrorMessage } from '../../components/useEntityPage';
import { CompetitionFormDialog } from './CompetitionFormDialog';
import { TourWizardDialog } from './TourWizardDialog';
import {
  canDeleteCompetitionTour,
  deleteCompetitionTour,
  fetchCompetitionById,
  fetchCompetitionTours,
  fetchCompetitionWizardData,
  moveCompetitionTour,
  updateCompetition,
} from './competitionApi';
import type { CompetitionRow, CompetitionTourRow, EpreuveOption, SaisonOption } from './types';

interface CompetitionTabFormPaneProps {
  tabPath: string;
  competitionId: string;
  active: boolean;
}

function resolveCompetitionLabel(row: CompetitionRow, fallback: string): string {
  const nom = String(row.NOM ?? '').trim();
  const saison = String(row.SAISON ?? '').trim();
  return [nom, saison].filter((part) => part.length > 0).join(' ') || fallback;
}

export function CompetitionTabFormPane({ tabPath, competitionId, active }: CompetitionTabFormPaneProps) {
  const { setDirty, setLabel, saveRequestCount, notifySaveDone } = useTabFormPaneBridge({ tabPath });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [toursLoading, setToursLoading] = useState(true);
  const [row, setRow] = useState<CompetitionRow | undefined>(undefined);
  const [tourRows, setTourRows] = useState<CompetitionTourRow[]>([]);
  const [tourSelection, setTourSelection] = useState<GridRowId[]>([]);
  const [tourDeleteConfirmOpen, setTourDeleteConfirmOpen] = useState(false);
  const [tourDeleteSaving, setTourDeleteSaving] = useState(false);
  const [tourMoveSaving, setTourMoveSaving] = useState(false);
  const [tourModalOpen, setTourModalOpen] = useState(false);
  const [tourModalMode, setTourModalMode] = useState<'create' | 'edit'>('create');
  const [tourModalEditingId, setTourModalEditingId] = useState<number | undefined>(undefined);
  const [epreuveOptions, setEpreuveOptions] = useState<EpreuveOption[]>([]);
  const [saisonOptions, setSaisonOptions] = useState<SaisonOption[]>([]);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const tourColumns: GridColDef<CompetitionTourRow>[] = [
    {
      field: 'TOUR',
      headerName: 'Tour',
      minWidth: 220,
      flex: 1,
    },
    {
      field: 'TYPE',
      headerName: 'Type',
      width: 110,
      minWidth: 110,
      maxWidth: 110,
    },
  ];

  const reloadRow = useCallback(async () => {
    setLoading(true);
    try {
      const [data, wizardData] = await Promise.all([
        fetchCompetitionById(competitionId),
        fetchCompetitionWizardData(),
      ]);
      setRow(data);
      setEpreuveOptions(wizardData.epreuves);
      setSaisonOptions(wizardData.saisons);
      const label = resolveCompetitionLabel(data, String(competitionId));
      setLabel(label);
      setDirty(false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [competitionId, setDirty, setLabel]);

  const reloadTours = useCallback(async () => {
    setToursLoading(true);
    try {
      const rows = await fetchCompetitionTours(competitionId);
      setTourRows(rows);
      setTourSelection([]);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setToursLoading(false);
    }
  }, [competitionId]);

  useEffect(() => {
    let disposed = false;

    const loadData = async () => {
      if (disposed) return;
      await Promise.all([reloadRow(), reloadTours()]);
    };

    void loadData();

    return () => {
      disposed = true;
      setDirty(false);
    };
  }, [reloadRow, reloadTours, setDirty]);

  const selectedTourId = Number(tourSelection[0] ?? 0);
  const selectedTourRow = tourRows.find((tour) => Number(tour.TUCLEUNIK) === selectedTourId);
  const selectedTourIndex = selectedTourRow
    ? tourRows.findIndex((tour) => Number(tour.TUCLEUNIK) === Number(selectedTourRow.TUCLEUNIK))
    : -1;
  const canMoveUp = selectedTourIndex > 0 && !tourMoveSaving && !toursLoading;
  const canMoveDown = selectedTourIndex >= 0 && selectedTourIndex < tourRows.length - 1 && !tourMoveSaving && !toursLoading;

  const openTourCreateModal = () => {
    setTourModalMode('create');
    setTourModalEditingId(undefined);
    setTourModalOpen(true);
  };

  const openTourEditModal = (tour?: CompetitionTourRow) => {
    const rowToEdit = tour ?? selectedTourRow;
    if (!rowToEdit) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un tour a modifier.' });
      return;
    }
    setTourSelection([rowToEdit.TUCLEUNIK]);
    setTourModalMode('edit');
    setTourModalEditingId(Number(rowToEdit.TUCLEUNIK));
    setTourModalOpen(true);
  };

  const openTourDeleteConfirm = () => {
    if (!selectedTourRow) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un tour a supprimer.' });
      return;
    }
    setTourDeleteConfirmOpen(true);
  };

  const handleTourDeleteConfirm = async () => {
    if (!selectedTourRow) {
      setTourDeleteConfirmOpen(false);
      return;
    }

    setTourDeleteSaving(true);
    try {
      const canDeleteResult = await canDeleteCompetitionTour(selectedTourRow.TUCLEUNIK);
      if (!canDeleteResult.canDelete) {
        const details = canDeleteResult.constraints.map((constraint) => constraint.description).join(' ; ');
        setSnackbar({ severity: 'error', message: details || 'Suppression impossible: contraintes detectees.' });
        setTourDeleteConfirmOpen(false);
        return;
      }

      await deleteCompetitionTour(selectedTourRow.TUCLEUNIK);
      await reloadTours();
      setTourDeleteConfirmOpen(false);
      setSnackbar({ severity: 'success', message: 'Tour supprime.' });
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setTourDeleteSaving(false);
    }
  };

  const handleMoveTour = async (direction: 'up' | 'down') => {
    if (!selectedTourRow || tourMoveSaving) {
      return;
    }

    setTourMoveSaving(true);
    try {
      const updatedRows = await moveCompetitionTour(selectedTourRow.TUCLEUNIK, direction);
      setTourRows(updatedRows);
      setTourSelection([selectedTourRow.TUCLEUNIK]);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setTourMoveSaving(false);
    }
  };

  const tourActions = (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title="Ajouter">
        {isMobile ? (
          <IconButton size="small" color="primary" aria-label="Ajouter" onClick={openTourCreateModal}>
            <AddCircleOutlineRoundedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" variant="outlined" startIcon={<AddCircleOutlineRoundedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={openTourCreateModal}>
            Ajouter
          </Button>
        )}
      </Tooltip>

      <Tooltip title="Modifier">
        {isMobile ? (
          <IconButton size="small" color="primary" aria-label="Modifier" onClick={() => openTourEditModal()} disabled={!selectedTourRow}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={() => openTourEditModal()} disabled={!selectedTourRow}>
            Modifier
          </Button>
        )}
      </Tooltip>

      <Tooltip title="Supprimer">
        {isMobile ? (
          <IconButton size="small" color="error" aria-label="Supprimer" onClick={openTourDeleteConfirm} disabled={!selectedTourRow || tourDeleteSaving}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" color="error" variant="outlined" startIcon={<DeleteOutlineRoundedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={openTourDeleteConfirm} disabled={!selectedTourRow || tourDeleteSaving}>
            Supprimer
          </Button>
        )}
      </Tooltip>

      <Tooltip title="Monter">
        {isMobile ? (
          <IconButton size="small" color="primary" aria-label="Monter" onClick={() => void handleMoveTour('up')} disabled={!canMoveUp}>
            <ArrowUpwardRoundedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" variant="outlined" startIcon={<ArrowUpwardRoundedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={() => void handleMoveTour('up')} disabled={!canMoveUp}>
            Haut
          </Button>
        )}
      </Tooltip>

      <Tooltip title="Descendre">
        {isMobile ? (
          <IconButton size="small" color="primary" aria-label="Descendre" onClick={() => void handleMoveTour('down')} disabled={!canMoveDown}>
            <ArrowDownwardRoundedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" variant="outlined" startIcon={<ArrowDownwardRoundedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={() => void handleMoveTour('down')} disabled={!canMoveDown}>
            Bas
          </Button>
        )}
      </Tooltip>
    </Stack>
  );

  const handleTourRowDoubleClick = (rowId: GridRowId) => {
    const clicked = tourRows.find((tour) => Number(tour.TUCLEUNIK) === Number(rowId));
    if (!clicked) return;
    setTourSelection([clicked.TUCLEUNIK]);
    openTourEditModal(clicked);
  };

  return (
    <Box sx={{ display: active ? 'block' : 'none' }}>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Chargement de la competition...</Typography>
        </Box>
      ) : row ? (
        <Stack spacing={2}>
          <CompetitionFormDialog
            open
            mode="edit"
            embedded
            primaryKey="COCLEUNIK"
            initialData={row}
            epreuveOptions={epreuveOptions}
            saisonOptions={saisonOptions}
            onClose={() => { void reloadRow(); }}
            onSubmit={async (payload) => {
              try {
                await updateCompetition(competitionId, payload);
                const refreshed = await fetchCompetitionById(competitionId);
                setRow(refreshed);
                const label = resolveCompetitionLabel(refreshed, String(competitionId));
                setLabel(label);
                setDirty(false);
                setSnackbar({ severity: 'success', message: 'Competition mise a jour.' });
                notifySaveDone();
              } catch (error) {
                setSnackbar({ severity: 'error', message: toErrorMessage(error) });
              }
            }}
            onDirtyChange={(dirty) => setDirty(dirty)}
            saveCount={saveRequestCount}
          />

          <Box sx={{ bgcolor: '#ffffff', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
            <Stack spacing={0.75}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Tours de la competition</Typography>
                {tourActions}
              </Stack>

              <Box sx={{ height: 260 }}>
                <EntityDataGrid
                  rows={tourRows}
                  columns={tourColumns}
                  loading={toursLoading}
                  getRowId={(tour) => tour.TUCLEUNIK}
                  selection={tourSelection}
                  onSelectionChange={setTourSelection}
                  onRowDoubleClick={handleTourRowDoubleClick}
                  pageSizeOptions={[10, 25, 50]}
                />
              </Box>
            </Stack>
          </Box>
        </Stack>
      ) : null}

      <TourWizardDialog
        open={tourModalOpen}
        mode={tourModalMode}
        competitionId={competitionId}
        competitionLabel={resolveCompetitionLabel(row ?? {}, String(competitionId))}
        competitionSeason={String(row?.SAISON ?? '').trim()}
        initialTourId={tourModalEditingId}
        proposedTourId={Math.max(0, ...tourRows.map((tour) => Number(tour.TUCLEUNIK) || 0)) + 1}
        proposedOrder={tourRows.length + 1}
        onClose={() => setTourModalOpen(false)}
        onSaved={async () => {
          await reloadTours();
        }}
        onError={(message) => setSnackbar({ severity: 'error', message })}
      />

      <Dialog
        open={tourDeleteConfirmOpen}
        onClose={() => { if (!tourDeleteSaving) setTourDeleteConfirmOpen(false); }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Supprimer un tour</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Voulez-vous vraiment supprimer le tour selectionne ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTourDeleteConfirmOpen(false)} color="inherit" disabled={tourDeleteSaving}>Annuler</Button>
          <Button color="error" variant="contained" onClick={() => void handleTourDeleteConfirm()} disabled={tourDeleteSaving}>Supprimer</Button>
        </DialogActions>
      </Dialog>

      <AppFeedbackSnackbar value={snackbar} onClose={() => setSnackbar(null)} />
    </Box>
  );
}
