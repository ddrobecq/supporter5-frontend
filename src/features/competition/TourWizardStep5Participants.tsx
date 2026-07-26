import { Box, Button, Stack, Tooltip, Typography } from '@mui/material';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { type GridColDef, type GridRowId } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { toErrorMessage } from '../../components/useEntityPage';
import { addTourParticipant, fetchTourParticipants, removeTourParticipants } from './competitionApi';
import { ClubSelectionDialog } from './ClubSelectionDialog';
import type { TourParticipantRow } from './types';

interface TourWizardStep5ParticipantsProps {
  tourId: number;
  onError?: (message: string) => void;
}

export function TourWizardStep5Participants({ tourId, onError }: TourWizardStep5ParticipantsProps) {
  const [rows, setRows] = useState<TourParticipantRow[]>([]);
  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const columns = useMemo<GridColDef<TourParticipantRow>[]>(
    () => [
      { field: 'CLUB', headerName: 'Club', flex: 1, minWidth: 260 },
    ],
    [],
  );

  const loadParticipants = async () => {
    if (!Number.isInteger(tourId) || tourId <= 0) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchTourParticipants(tourId);
      setRows(data);
    } catch (error) {
      onError?.(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadParticipants();
  }, [tourId]);

  const handleAddClub = async (clubId: string) => {
    try {
      await addTourParticipant(tourId, clubId);
      await loadParticipants();
    } catch (error) {
      onError?.(toErrorMessage(error));
    }
  };

  const handleRemoveSelection = async () => {
    const clubIds = selection.map((value) => String(value));
    if (clubIds.length === 0) {
      onError?.('Sélectionnez au moins un club à supprimer.');
      return;
    }

    try {
      await removeTourParticipants(tourId, clubIds);
      setSelection([]);
      await loadParticipants();
    } catch (error) {
      onError?.(toErrorMessage(error));
    }
  };

  return (
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        spacing={0.75}
        sx={{ justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Typography variant="subtitle2">Clubs sélectionnés</Typography>
        <Stack direction="row" spacing={0.75}>
          <Tooltip title="Ajouter">
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddCircleOutlineRoundedIcon />}
              sx={{ minWidth: 0, px: 1.1 }}
              onClick={() => setSelectorOpen(true)}
            >
              Ajouter
            </Button>
          </Tooltip>
          <Tooltip title="Supprimer">
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<DeleteOutlineRoundedIcon />}
              sx={{ minWidth: 0, px: 1.1 }}
              onClick={() => void handleRemoveSelection()}
            >
              Supprimer
            </Button>
          </Tooltip>
        </Stack>
      </Stack>

      <Box sx={{ height: 260, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <EntityDataGrid<TourParticipantRow>
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.IDCLUB}
          selection={selection}
          onSelectionChange={setSelection}
          onRowClick={(rowId) => {
            const key = String(rowId);
            setSelection((prev) => {
              const exists = prev.some((id) => String(id) === key);
              if (exists) {
                return prev.filter((id) => String(id) !== key);
              }
              return [...prev, rowId];
            });
          }}
          disableRowSelectionOnClick
          multiSelection
          checkboxSelection
          hideCheckboxSelectionColumn
        />
      </Box>

      <ClubSelectionDialog
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={(clubId) => {
          void handleAddClub(clubId);
        }}
      />
    </Stack>
  );
}
