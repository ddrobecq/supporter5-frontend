import { Box, Button, MenuItem, Stack, TextField, Tooltip } from '@mui/material';
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
  nbGroupe: number;
  groupNames: string[];
  onError?: (message: string) => void;
}

function buildDefaultGroupNames(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `Groupe ${index + 1}`);
}

export function TourWizardStep5Participants({ tourId, nbGroupe, groupNames, onError }: TourWizardStep5ParticipantsProps) {
  const [rows, setRows] = useState<TourParticipantRow[]>([]);
  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  const normalizedNbGroupe = Math.max(1, Number(nbGroupe) || 1);
  const hasMultipleGroups = normalizedNbGroupe > 1;

  const effectiveGroupNames = useMemo(() => {
    if (!hasMultipleGroups) {
      return [] as string[];
    }

    const names = groupNames
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0);
    if (names.length >= normalizedNbGroupe) {
      return names.slice(0, normalizedNbGroupe);
    }

    const defaults = buildDefaultGroupNames(normalizedNbGroupe);
    return defaults.map((defaultName, index) => names[index] ?? defaultName);
  }, [groupNames, hasMultipleGroups, normalizedNbGroupe]);

  useEffect(() => {
    if (!hasMultipleGroups) {
      setSelectedGroupId('');
      return;
    }

    if (selectedGroupId && !effectiveGroupNames.includes(selectedGroupId)) {
      setSelectedGroupId('');
    }
  }, [hasMultipleGroups, selectedGroupId, effectiveGroupNames]);

  useEffect(() => {
    setSelection([]);
  }, [selectedGroupId]);

  const participantsHeaderLabel = useMemo(
    () => (hasMultipleGroups
      ? `Liste des particpants pour le ${selectedGroupId || '...'}`
      : 'Liste des participants'),
    [hasMultipleGroups, selectedGroupId],
  );

  const columns = useMemo<GridColDef<TourParticipantRow>[]>(
    () => [
      { field: 'CLUB', headerName: participantsHeaderLabel, flex: 1, minWidth: 260 },
    ],
    [participantsHeaderLabel],
  );

  const visibleRows = useMemo(() => {
    if (!hasMultipleGroups) {
      return rows;
    }
    if (!selectedGroupId) {
      return [];
    }
    return rows.filter((row) => String(row.GROUPE ?? '').trim() === selectedGroupId);
  }, [rows, hasMultipleGroups, selectedGroupId]);

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
      if (hasMultipleGroups && !selectedGroupId) {
        onError?.('Sélectionnez un groupe avant d\'ajouter un club.');
        return;
      }

      await addTourParticipant(tourId, clubId, hasMultipleGroups ? selectedGroupId : '');
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
      {hasMultipleGroups ? (
        <TextField
          select
          label="Liste des Groupes"
          size="small"
          value={selectedGroupId}
          onChange={(event) => setSelectedGroupId(event.target.value)}
          sx={{ width: { xs: '100%', md: 320 } }}
        >
          <MenuItem value="">Aucun groupe sélectionné</MenuItem>
          {effectiveGroupNames.map((groupName) => (
            <MenuItem key={groupName} value={groupName}>
              {groupName}
            </MenuItem>
          ))}
        </TextField>
      ) : null}

      <Stack direction="row" spacing={0.75}>
        <Tooltip title="Ajouter">
          <span>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddCircleOutlineRoundedIcon />}
              sx={{ minWidth: 0, px: 1.1 }}
              onClick={() => setSelectorOpen(true)}
              disabled={hasMultipleGroups && !selectedGroupId}
            >
              Ajouter
            </Button>
          </span>
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

      <Box sx={{ height: 260, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <EntityDataGrid<TourParticipantRow>
          rows={visibleRows}
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
