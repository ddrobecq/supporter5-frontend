import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { type GridRowId } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { toErrorMessage } from '../../components/useEntityPage';
import { addTourParticipant, fetchTourParticipants, removeTourParticipants } from './competitionApi';
import { buildEffectiveGroupNames, getDistinctNonEmptyGroupNames } from './tourWizardGroups';
import {
  getDistinctSourceGroups,
} from './tourWizardProgrammedParticipants';
import { useTourWizardProgrammedParticipants } from './useTourWizardProgrammedParticipants';
import { useProgrammedParticipantLabels } from './useProgrammedParticipantLabels';
import { TourParticipantGrid } from './TourParticipantGrid';
import { ClubSelectionDialog } from './ClubSelectionDialog';
import type { TourParticipantRow } from './types';

interface TourWizardStep5ParticipantsProps {
  tourId: number;
  competitionId: number;
  currentTourOrder: number;
  competitionSeason: string;
  nbGroupe: number;
  groupNames: string[];
  onError?: (message: string) => void;
}

export function TourWizardStep5Participants({ tourId, competitionId, currentTourOrder, competitionSeason, nbGroupe, groupNames, onError }: TourWizardStep5ParticipantsProps) {
  const [rows, setRows] = useState<TourParticipantRow[]>([]);
  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const getLabel = useProgrammedParticipantLabels(rows, competitionId, competitionSeason, onError);

  const {
    seasonOptions,
    programSeason,
    setProgramSeason,
    programCompetitions,
    programCompetitionId,
    setProgramCompetitionId,
    programTours,
    programTourId,
    setProgramTourId,
    programSourceParticipants,
    programSourceRanks,
    setProgramSourceRanks,
    sourceRankSelectOptions,
    isSelectedProgramTourEliminatoire,
    possibleProgrammedClubsByGroup,
  } = useTourWizardProgrammedParticipants({
    competitionId,
    competitionSeason,
    currentTourOrder,
    programDialogOpen,
    onError,
  });

  const normalizedNbGroupe = Math.max(1, Number(nbGroupe) || 1);
  const hasMultipleGroups = normalizedNbGroupe > 1;
  const existingGroupNames = useMemo(() => getDistinctNonEmptyGroupNames(rows), [rows]);

  const effectiveGroupNames = useMemo(() => {
    if (!hasMultipleGroups) {
      return [] as string[];
    }

    return buildEffectiveGroupNames(normalizedNbGroupe, groupNames, existingGroupNames);
  }, [groupNames, existingGroupNames, hasMultipleGroups, normalizedNbGroupe]);

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
    const participantIds = selection.map((value) => Number(value));
    if (participantIds.length === 0) {
      onError?.('Sélectionnez au moins un club à supprimer.');
      return;
    }

    try {
      await removeTourParticipants(tourId, [], participantIds);
      setSelection([]);
      await loadParticipants();
    } catch (error) {
      onError?.(toErrorMessage(error));
    }
  };

  const handleAddProgrammedParticipant = async () => {
    const sourceTourId = Number(programTourId);
    const selectedRanks = Array.from(new Set(programSourceRanks.map(Number).filter((rank) => Number.isInteger(rank) && rank > 0)));

    if (!Number.isInteger(sourceTourId) || sourceTourId <= 0) {
      onError?.('Sélectionnez un tour source.');
      return;
    }
    if (selectedRanks.length === 0) {
      onError?.('Sélectionnez au moins un classement source.');
      return;
    }

    const sourceGroups = getDistinctSourceGroups(programSourceParticipants);
    if (sourceGroups.length === 0) {
      onError?.('Aucun groupe source disponible pour ce tour.');
      return;
    }

    const sourcesToCreate: string[] = [];
    sourceGroups.forEach((groupName) => {
      selectedRanks.forEach((rank) => {
        sourcesToCreate.push(`${sourceTourId},${groupName},${rank}`);
      });
    });

    setSaving(true);
    try {
      for (const paSource of sourcesToCreate) {
        await addTourParticipant(tourId, '', hasMultipleGroups ? selectedGroupId : '', paSource);
      }
      setProgramDialogOpen(false);
      await loadParticipants();
    } catch (error) {
      onError?.(toErrorMessage(error));
    } finally {
      setSaving(false);
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
        <Tooltip title="Ajouter un participant programme">
          <Button
            size="small"
            variant="outlined"
            sx={{ minWidth: 0, px: 1.1 }}
            onClick={() => setProgramDialogOpen(true)}
            disabled={saving || loading || (hasMultipleGroups && !selectedGroupId)}
          >
            Ajouter un participant programme
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

      <Box sx={{ height: 260, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <TourParticipantGrid
          rows={visibleRows}
          loading={loading}
          selection={selection}
          onSelectionChange={setSelection}
          getLabel={getLabel}
          headerLabel={participantsHeaderLabel}
          onRowClick={(rowId) => {
            const key = String(rowId);
            setSelection((prev) => {
              const exists = prev.some((id) => String(id) === key);
              return exists ? prev.filter((id) => String(id) !== key) : [...prev, rowId];
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

      <Dialog
        open={programDialogOpen}
        onClose={() => { if (!saving) setProgramDialogOpen(false); }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Ajouter un participant programme</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <InputLabel id="prog5-season-label">Saison</InputLabel>
                <Select labelId="prog5-season-label" label="Saison" value={programSeason} onChange={(event) => setProgramSeason(String(event.target.value ?? ''))}>
                  {seasonOptions.map((season) => (<MenuItem key={season} value={season}>{season}</MenuItem>))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="prog5-competition-label">Competition</InputLabel>
                <Select labelId="prog5-competition-label" label="Competition" value={programCompetitionId} onChange={(event) => setProgramCompetitionId(String(event.target.value ?? ''))}>
                  {programCompetitions.map((competition) => {
                    const id = String(competition.COCLEUNIK ?? '').trim();
                    const name = String(competition.NOM ?? '').trim();
                    const season = String(competition.SAISON ?? '').trim();
                    return <MenuItem key={id} value={id}>{[name, season].filter(Boolean).join(' ') || id}</MenuItem>;
                  })}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="prog5-tour-label">Tour</InputLabel>
                <Select labelId="prog5-tour-label" label="Tour" value={programTourId} onChange={(event) => setProgramTourId(String(event.target.value ?? ''))}>
                  <MenuItem value="">(Aucun)</MenuItem>
                  {programTours.map((tour) => (<MenuItem key={tour.TUCLEUNIK} value={String(tour.TUCLEUNIK)}>{String(tour.TOUR ?? '').trim() || `Tour ${tour.TUCLEUNIK}`}</MenuItem>))}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="prog5-rank-label">Classement</InputLabel>
                <Select
                  labelId="prog5-rank-label"
                  label="Classement"
                  multiple
                  value={programSourceRanks}
                  onChange={(event) => {
                    const value = event.target.value;
                    setProgramSourceRanks(Array.isArray(value) ? value.map(String) : String(value ?? '').split(',').map((e) => e.trim()).filter(Boolean));
                  }}
                  renderValue={(selected) => {
                    const vals = Array.isArray(selected) ? selected.map(String) : String(selected ?? '').split(',').map((e) => e.trim()).filter(Boolean);
                    return sourceRankSelectOptions.filter((o) => vals.includes(o.value)).map((o) => o.label).join(' / ');
                  }}
                >
                  {sourceRankSelectOptions.map((option) => (<MenuItem key={`rank-${option.value}`} value={option.value}>{option.label}</MenuItem>))}
                </Select>
              </FormControl>
            </Stack>
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">
                {isSelectedProgramTourEliminatoire ? 'Clubs possibles' : 'Clubs possibles par groupe'}
              </Typography>
              {possibleProgrammedClubsByGroup.length > 0
                ? possibleProgrammedClubsByGroup.map((entry) => (
                  <Typography key={`possible-${entry.group || '__empty__'}`} variant="caption" color="text.secondary">
                    {isSelectedProgramTourEliminatoire
                      ? (entry.clubs.length > 0 ? entry.clubs.join(' / ') : '-')
                      : `${entry.group || '(Aucun groupe)'}: ${entry.clubs.length > 0 ? entry.clubs.join(' / ') : '-'}`}
                  </Typography>
                ))
                : <Typography variant="caption" color="text.secondary">Indetermine pour l instant</Typography>
              }
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProgramDialogOpen(false)} disabled={saving} color="inherit">Annuler</Button>
          <Button variant="contained" onClick={() => void handleAddProgrammedParticipant()} disabled={saving || loading}>Ajouter</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
