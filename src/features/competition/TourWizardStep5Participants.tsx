import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { type GridRowId } from '@mui/x-data-grid';
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { buildEffectiveGroupNames, getDistinctNonEmptyGroupNames } from './tourWizardGroups';
import {
  getDistinctSourceGroups,
} from './tourWizardProgrammedParticipants';
import { useTourWizardProgrammedParticipants } from './useTourWizardProgrammedParticipants';
import { useProgrammedParticipantLabels } from './useProgrammedParticipantLabels';
import { TourParticipantGrid } from './TourParticipantGrid';
import { ClubSelectionDialog } from './ClubSelectionDialog';
import type { TourParticipantRow } from './types';
import type { ClubGridRow } from '../club/types';

interface TourWizardStep5ParticipantsProps {
  competitionId: number;
  currentTourOrder: number;
  competitionSeason: string;
  nbGroupe: number;
  groupNames: string[];
  rows: TourParticipantRow[];
  onRowsChange: Dispatch<SetStateAction<TourParticipantRow[]>>;
  onError?: (message: string) => void;
}

export function TourWizardStep5Participants({ competitionId, currentTourOrder, competitionSeason, nbGroupe, groupNames, rows, onRowsChange, onError }: TourWizardStep5ParticipantsProps) {
  const [selection, setSelection] = useState<GridRowId[]>([]);
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
    const filteredRows = !hasMultipleGroups
      ? rows
      : selectedGroupId
        ? rows.filter((row) => String(row.GROUPE ?? '').trim() === selectedGroupId)
        : [];

    return [...filteredRows].sort((left, right) => getLabel(left).localeCompare(
      getLabel(right),
      'fr',
      { sensitivity: 'base' },
    ));
  }, [rows, hasMultipleGroups, selectedGroupId, getLabel]);

  const getNextLocalId = (): number => Math.min(0, ...rows.map((row) => Number(row.PACLEUNIK) || 0)) - 1;

  const handleAddClub = (clubId: string, club?: ClubGridRow) => {
    if (hasMultipleGroups && !selectedGroupId) {
      onError?.('Sélectionnez un groupe avant d\'ajouter un club.');
      return;
    }

    const normalizedClubId = String(clubId ?? '').trim();
    if (!normalizedClubId) {
      onError?.('Club invalide.');
      return;
    }

    const alreadyExists = rows.some((row) => String(row.IDCLUB ?? '').trim() === normalizedClubId);
    if (alreadyExists) {
      onError?.('Ce club est deja dans la liste des participants.');
      return;
    }

    const clubLabel = String(club?.CLUB_NOM_COMPLET ?? club?.CLUB_ABREGE ?? normalizedClubId).trim();
    const nextRow: TourParticipantRow = {
      PACLEUNIK: getNextLocalId(),
      TUCLEUNIK: 0,
      IDCLUB: normalizedClubId,
      CLUB: clubLabel,
      GROUPE: hasMultipleGroups ? selectedGroupId : '',
      PASource: '',
      PAClassement: 0,
    };

    onRowsChange((prev) => [...prev, nextRow]);
  };

  const handleRemoveSelection = () => {
    const participantIds = selection.map((value) => Number(value));
    if (participantIds.length === 0) {
      onError?.('Sélectionnez au moins un club à supprimer.');
      return;
    }

    const selected = new Set(participantIds);
    onRowsChange((prev) => prev.filter((row) => !selected.has(Number(row.PACLEUNIK))));
    setSelection([]);
  };

  const handleAddProgrammedParticipant = () => {
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

    if (hasMultipleGroups && !selectedGroupId) {
      onError?.('Sélectionnez un groupe avant d\'ajouter un participant programme.');
      return;
    }

    const sourcesToCreate: string[] = [];
    sourceGroups.forEach((groupName) => {
      selectedRanks.forEach((rank) => {
        sourcesToCreate.push(`${sourceTourId},${groupName},${rank}`);
      });
    });

    const existingKeys = new Set(
      rows
        .map((row) => String(row.PASource ?? '').trim())
        .filter(Boolean),
    );

    const localRows: TourParticipantRow[] = [];
    for (const paSource of sourcesToCreate) {
      if (existingKeys.has(paSource)) {
        continue;
      }
      existingKeys.add(paSource);
      localRows.push({
        PACLEUNIK: getNextLocalId() - localRows.length,
        TUCLEUNIK: 0,
        IDCLUB: '',
        CLUB: '',
        GROUPE: hasMultipleGroups ? selectedGroupId : '',
        PASource: paSource,
        PAClassement: Number(paSource.split(',')[2] ?? 0) || 0,
      });
    }

    if (localRows.length === 0) {
      onError?.('Aucun participant programme a ajouter (deja present).');
      return;
    }

    onRowsChange((prev) => [...prev, ...localRows]);
    setProgramDialogOpen(false);
  };

  return (
    <Stack spacing={1.5} sx={{ height: '100%', minHeight: 0 }}>
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
              Ajouter un club
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Ajouter un qualifié">
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineRoundedIcon />}
            sx={{ minWidth: 0, px: 1.1 }}
            onClick={() => setProgramDialogOpen(true)}
            disabled={hasMultipleGroups && !selectedGroupId}
          >
            Ajouter un qualifié
          </Button>
        </Tooltip>
        <Tooltip title="Supprimer">
          <Button
            size="small"
            color="error"
            variant="outlined"
            startIcon={<DeleteOutlineRoundedIcon />}
            sx={{ minWidth: 0, px: 1.1 }}
            onClick={handleRemoveSelection}
          >
            Supprimer
          </Button>
        </Tooltip>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <TourParticipantGrid
          rows={visibleRows}
          loading={false}
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
        onSelect={(clubId, club) => {
          handleAddClub(clubId, club);
        }}
      />

      <Dialog
        open={programDialogOpen}
        onClose={() => { setProgramDialogOpen(false); }}
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
          <Button onClick={() => setProgramDialogOpen(false)} color="inherit">Annuler</Button>
          <Button variant="contained" onClick={handleAddProgrammedParticipant}>Ajouter</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
