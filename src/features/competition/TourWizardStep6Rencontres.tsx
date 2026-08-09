import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import NavigateBeforeRoundedIcon from '@mui/icons-material/NavigateBeforeRounded';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { type GridColDef, type GridRowId } from '@mui/x-data-grid';
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { toErrorMessage } from '../../components/useEntityPage';
import {
  type CreateTourMatchPayload,
  createTourRencontre,
  deleteTourRencontre,
  fetchCircByTourType,
  fetchTourParticipants,
  fetchTourRencontres,
  updateTourRencontre,
} from './competitionApi';
import { buildEffectiveGroupNames, getDistinctNonEmptyGroupNames } from './tourWizardGroups';
import {
  buildAvailableClubRows,
  buildFilteredCircOptions,
  buildFilteredRencontreRows,
  buildLockedParticipantKeys,
  buildParticipantMapByClubId,
  buildParticipantMapBySource,
  buildRencontreGridRows,
  type PendingRencontreModel,
  type RencontresGridModelRow,
} from './tourWizardRencontresModel';
import {
  compareDateHeure,
  formatDateDisplay,
  formatHeureDisplay,
  getParticipantIdentityKey,
  normalizeCircId,
  normalizeDate,
  normalizeHeure,
  parseDateInput,
} from './tourWizardRencontresUtils';
import { buildAdjacentSelectionState, getAdjacentSelectionValue } from './tourWizardSelection';
import { useProgrammedParticipantLabels } from './useProgrammedParticipantLabels';
import { TourParticipantGrid } from './TourParticipantGrid';
import type { CircOptionRow, TourMatchRow, TourParticipantRow } from './types';

interface TourWizardStep6RencontresProps {
  tourId: number;
  competitionId: number;
  tourType: 'ligue' | 'eliminatoire';
  isAllerRetour: boolean;
  competitionSeason: string;
  tourStartDate: string;
  tourEndDate: string;
  tourDefaultHeure: string;
  nbMatch: number;
  nbGroupe: number;
  groupNames: string[];
  onError?: (message: string) => void;
}

export function TourWizardStep6Rencontres({
  tourId,
  competitionId,
  tourType,
  isAllerRetour,
  competitionSeason,
  tourStartDate,
  tourEndDate,
  tourDefaultHeure,
  nbMatch,
  nbGroupe,
  groupNames,
  onError,
}: TourWizardStep6RencontresProps) {
  const [participants, setParticipants] = useState<TourParticipantRow[]>([]);
  const [rencontres, setRencontres] = useState<TourMatchRow[]>([]);
  const [circOptions, setCircOptions] = useState<CircOptionRow[]>([]);
  const [selectedCircId, setSelectedCircId] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [participantSelection, setParticipantSelection] = useState<GridRowId[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');
  const getProgrammedParticipantLabel = useProgrammedParticipantLabels(participants, competitionId, competitionSeason, onError);
  const [selectedRencontre, setSelectedRencontre] = useState<GridRowId[]>([]);
  const [pending, setPending] = useState<PendingRencontreModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [retourConfirmOpen, setRetourConfirmOpen] = useState(false);
  const [pendingAutoSelectIndex, setPendingAutoSelectIndex] = useState<number | null>(null);
  const participantsGridRef = useRef<HTMLDivElement | null>(null);

  const typeId = tourType === 'eliminatoire' ? 2 : 1;
  const normalizedNbGroupe = Math.max(1, Number(nbGroupe) || 1);
  const hasMultipleGroups = normalizedNbGroupe > 1;
  const normalizedNbMatch = Math.max(0, Number(nbMatch) || 0);
  const existingGroupNames = useMemo(() => getDistinctNonEmptyGroupNames(participants), [participants]);

  const effectiveGroupNames = useMemo(() => {
    if (!hasMultipleGroups) {
      return [] as string[];
    }

    return buildEffectiveGroupNames(normalizedNbGroupe, groupNames, existingGroupNames);
  }, [groupNames, existingGroupNames, hasMultipleGroups, normalizedNbGroupe]);

  const reloadData = async () => {
    if (!Number.isInteger(tourId) || tourId <= 0) {
      setParticipants([]);
      setRencontres([]);
      setCircOptions([]);
      setPending(null);
      return;
    }

    setLoading(true);
    try {
      const [participantRows, rencontreRows, circRows] = await Promise.all([
        fetchTourParticipants(tourId),
        fetchTourRencontres(tourId),
        fetchCircByTourType(typeId),
      ]);

      const filteredCircRows = buildFilteredCircOptions(circRows, tourType, normalizedNbMatch);

      setParticipants(participantRows);
      setRencontres(rencontreRows);
      setCircOptions(filteredCircRows);
      setSelectedRencontre([]);
    } catch (error) {
      onError?.(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reloadData();
  }, [tourId, typeId, tourType, normalizedNbMatch]);

  useEffect(() => {
    setSelectedParticipantId('');
    setParticipantSelection([]);
    setPending(null);
    setSelectedGroup('');
  }, [tourId]);

  useEffect(() => {
    if (!hasMultipleGroups) {
      setSelectedGroup('');
      return;
    }

    if (selectedGroup && !effectiveGroupNames.includes(selectedGroup)) {
      setSelectedGroup('');
    }
  }, [hasMultipleGroups, selectedGroup, effectiveGroupNames]);

  const groupSelectionState = useMemo(
    () => buildAdjacentSelectionState(effectiveGroupNames, selectedGroup),
    [effectiveGroupNames, selectedGroup],
  );

  const canSelectPreviousGroup = useMemo(() => {
    return hasMultipleGroups && groupSelectionState.canSelectPrevious;
  }, [groupSelectionState.canSelectPrevious, hasMultipleGroups]);

  const canSelectNextGroup = useMemo(() => {
    return hasMultipleGroups && groupSelectionState.canSelectNext;
  }, [groupSelectionState.canSelectNext, hasMultipleGroups]);

  const selectAdjacentGroup = (direction: -1 | 1) => {
    if (!hasMultipleGroups) {
      return;
    }

    const nextGroup = getAdjacentSelectionValue(effectiveGroupNames, selectedGroup, direction);
    if (!nextGroup) {
      return;
    }

    setSelectedGroup(nextGroup);
  };

  useEffect(() => {
    // A pending draft is tied to one circumstance; clear it when the selected circumstance changes.
    setSelectedParticipantId('');
    setParticipantSelection([]);
    setPending(null);
    setSelectedRencontre([]);
  }, [selectedCircId]);

  useEffect(() => {
    if (!selectedCircId) {
      return;
    }
    const exists = circOptions.some((circ) => normalizeCircId(circ.IDCIRC) === selectedCircId);
    if (!exists) {
      setSelectedCircId('');
    }
  }, [circOptions, selectedCircId]);

  const circOptionIds = useMemo(
    () => circOptions.map((circ) => normalizeCircId(circ.IDCIRC)).filter((value) => value.length > 0),
    [circOptions],
  );

  const circSelectionState = useMemo(
    () => buildAdjacentSelectionState(circOptionIds, selectedCircId),
    [circOptionIds, selectedCircId],
  );

  const canSelectPreviousCirc = useMemo(() => {
    return circSelectionState.canSelectPrevious;
  }, [circSelectionState.canSelectPrevious]);

  const canSelectNextCirc = useMemo(() => {
    return circSelectionState.canSelectNext;
  }, [circSelectionState.canSelectNext]);

  const selectAdjacentCirc = (direction: -1 | 1) => {
    const targetCircId = getAdjacentSelectionValue(circOptionIds, selectedCircId, direction);
    if (!targetCircId) {
      return;
    }

    setSelectedCircId(targetCircId);
  };

  const participantById = useMemo(() => {
    return buildParticipantMapByClubId(participants);
  }, [participants]);

  const participantBySource = useMemo(() => {
    return buildParticipantMapBySource(participants);
  }, [participants]);

  const lockedParticipantKeys = useMemo(() => {
    return buildLockedParticipantKeys(rencontres, selectedCircId, normalizeCircId);
  }, [rencontres, selectedCircId]);

  const availableClubRows = useMemo(() => {
    return buildAvailableClubRows(
      participants,
      lockedParticipantKeys,
      hasMultipleGroups,
      selectedGroup,
      pending?.domicileParticipantId ?? null,
      getParticipantIdentityKey,
    );
  }, [participants, lockedParticipantKeys, pending, hasMultipleGroups, selectedGroup]);

  useEffect(() => {
    setSelectedParticipantId('');
    setParticipantSelection([]);
    setPending(null);
  }, [selectedGroup]);

  useEffect(() => {
    if (!selectedParticipantId) return;
    const exists = availableClubRows.some((row) => String(row.PACLEUNIK) === selectedParticipantId);
    if (!exists) {
      setSelectedParticipantId('');
      setParticipantSelection([]);
    }
  }, [availableClubRows, selectedParticipantId]);

  useEffect(() => {
    if (pendingAutoSelectIndex === null) {
      return;
    }

    if (availableClubRows.length === 0) {
      setSelectedParticipantId('');
      setParticipantSelection([]);
      setPendingAutoSelectIndex(null);
      return;
    }

    const maxIndex = availableClubRows.length - 1;
    const nextIndex = Math.min(Math.max(0, pendingAutoSelectIndex), maxIndex);
    const nextRow = availableClubRows[nextIndex];
    const nextId = String(nextRow.PACLEUNIK);

    setSelectedParticipantId(nextId);
    setParticipantSelection([nextId]);

    const focusTarget = participantsGridRef.current?.querySelector('[role="grid"]') as HTMLElement | null;
    focusTarget?.focus({ preventScroll: true });

    setPendingAutoSelectIndex(null);
  }, [availableClubRows, pendingAutoSelectIndex]);

  const rencontreRows = useMemo(
    () => [...rencontres].sort(compareDateHeure),
    [rencontres],
  );

  const filteredRencontreRows = useMemo(() => {
    return buildFilteredRencontreRows(rencontreRows, selectedCircId, normalizeCircId);
  }, [rencontreRows, selectedCircId]);

  const canGenerateRetour = tourType !== 'ligue' && isAllerRetour;

  const gridRows = useMemo<RencontresGridModelRow[]>(() => {
    return buildRencontreGridRows(
      filteredRencontreRows,
      pending,
      participantById,
      participantBySource,
      getProgrammedParticipantLabel,
    );
  }, [filteredRencontreRows, pending, participantById, participantBySource]);

  const columns = useMemo<GridColDef<RencontresGridModelRow>[]>(
    () => [
      {
        field: 'DATE',
        headerName: 'Date',
        width: 96,
        minWidth: 96,
        maxWidth: 96,
        editable: true,
        valueFormatter: (value) => formatDateDisplay(value),
      },
      {
        field: 'HEURE',
        headerName: 'Heure',
        width: 74,
        minWidth: 74,
        maxWidth: 74,
        editable: true,
        valueFormatter: (value) => formatHeureDisplay(value),
      },
      {
        field: 'DOMICILE_NOM',
        headerName: 'Domicile',
        flex: 1,
        minWidth: 120,
        renderCell: (params) => {
          const source = String(params.row.PADOMSource ?? '').trim();
          return (
            <Typography variant="body2" sx={{ fontStyle: source ? 'italic' : 'normal' }}>
              {String(params.value ?? '')}
            </Typography>
          );
        },
      },
      {
        field: 'EXTERIEUR_NOM',
        headerName: 'Extérieur',
        flex: 1,
        minWidth: 120,
        renderCell: (params) => {
          const source = String(params.row.PAEXTSource ?? '').trim();
          return (
            <Typography variant="body2" sx={{ fontStyle: source ? 'italic' : 'normal' }}>
              {String(params.value ?? '')}
            </Typography>
          );
        },
      },
    ],
    [],
  );

  const persistRencontreRowUpdate = async (
    newRow: RencontresGridModelRow,
    oldRow: RencontresGridModelRow,
  ): Promise<RencontresGridModelRow> => {
    const id = Number(newRow.RECLEUNIK ?? 0);
    if (!Number.isInteger(id) || id <= 0) {
      return oldRow;
    }

    const nextDate = normalizeDate(parseDateInput(newRow.DATE));
    const rawHeure = String(newRow.HEURE ?? '').trim();
    const nextHeure = rawHeure ? normalizeHeure(rawHeure) : null;

    if (!nextDate) {
      throw new Error('Date invalide. Format attendu: DD/MM/YYYY.');
    }
    if (rawHeure && !nextHeure) {
      throw new Error('Heure invalide. Format attendu: HHhMM.');
    }

    const prevDate = normalizeDate(parseDateInput(oldRow.DATE));
    const prevHeure = normalizeHeure(oldRow.HEURE) || null;
    const updatedRow: RencontresGridModelRow = { ...newRow, DATE: nextDate, HEURE: nextHeure };

    if (nextDate === prevDate && nextHeure === prevHeure) {
      return updatedRow;
    }

    setSaving(true);
    try {
      await updateTourRencontre(id, { DATE: nextDate, HEURE: nextHeure });
      setRencontres((prev) =>
        prev.map((row) =>
          Number(row.RECLEUNIK) === id
            ? { ...row, DATE: nextDate, HEURE: nextHeure }
            : row,
        ),
      );
      return updatedRow;
    } catch (error) {
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const onRencontreRowUpdateError = (error: unknown) => {
    onError?.(toErrorMessage(error));
  };

  const commitSelectedClub = async (explicitParticipantId?: string) => {
    if (hasMultipleGroups && !selectedGroup) {
      onError?.('Sélectionnez un groupe.');
      return;
    }

    const participantId = String(explicitParticipantId ?? selectedParticipantId ?? '').trim();
    if (!participantId) {
      onError?.('Sélectionnez un participant.');
      return;
    }

    const participant = availableClubRows.find((row) => String(row.PACLEUNIK) === participantId);
    if (!participant) {
      onError?.('Participant introuvable.');
      return;
    }

    const clubId = String(participant.IDCLUB ?? '').trim();
    const paSource = String(participant.PASource ?? '').trim();
    const participantLabel = getProgrammedParticipantLabel(participant);

    if (!pending) {
      const lastMatch = filteredRencontreRows.length > 0
        ? filteredRencontreRows[filteredRencontreRows.length - 1]
        : undefined;
      const startDate = normalizeDate(lastMatch?.DATE ?? '') || normalizeDate(tourStartDate) || new Date().toISOString().slice(0, 10);
      const startHeure = normalizeHeure(lastMatch?.HEURE ?? '') || normalizeHeure(tourDefaultHeure) || null;
      setPending({
        date: startDate,
        heure: startHeure,
        domicileParticipantId: participantId,
        domicile: clubId,
        domicileSource: paSource,
        domicileLabel: participantLabel,
      });
      setSelectedParticipantId('');
      setParticipantSelection([]);
      return;
    }

    const sameIdentity = participantId === pending.domicileParticipantId
      || (clubId && clubId === pending.domicile)
      || (paSource && paSource === pending.domicileSource);
    if (sameIdentity) {
      onError?.('Le participant extérieur doit être différent du domicile.');
      return;
    }

    if (!pending.domicile && !pending.domicileSource) {
      onError?.('Participant domicile invalide.');
      return;
    }

    if (!clubId && !paSource) {
      onError?.('Participant extérieur invalide.');
      return;
    }

    const hasResolvedSides = Boolean(pending.domicile) && Boolean(clubId);

    const payload: CreateTourMatchPayload = {
      DATE: pending.date,
      HEURE: pending.heure,
      DOMICILE: pending.domicile,
      EXTERIEUR: clubId,
      BUTDOM: 0,
      BUTEXT: 0,
      TABDOM: 0,
      TABEXT: 0,
      ETAT: hasResolvedSides ? 1 : 5,
      TUCLEUNIK: tourId,
      SAISON: String(competitionSeason ?? '').trim(),
      READMIN: 0,
      COMMENT: '',
      VID_ID: null,
      IDCIRC: selectedCircId || '',
      PADOMSource: pending.domicileSource,
      PAEXTSource: paSource,
    };

    setSaving(true);
    try {
      await createTourRencontre(payload);
      setPending(null);
      setSelectedParticipantId('');
      setParticipantSelection([]);
      await reloadData();
    } catch (error) {
      onError?.(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const removeSelectedRencontre = async () => {
    const id = Number(selectedRencontre[0] ?? 0);

    // If the selected row is the in-progress draft line, just cancel it locally.
    if (id === -1) {
      setPending(null);
      setSelectedRencontre([]);
      return;
    }

    if (!Number.isInteger(id) || id <= 0) {
      onError?.('Sélectionnez une rencontre à supprimer.');
      return;
    }

    setSaving(true);
    try {
      await deleteTourRencontre(id);
      // Immediate local update so both clubs become selectable again without waiting.
      setRencontres((prev) => prev.filter((row) => Number(row.RECLEUNIK) !== id));
      setPending(null);
      setSelectedParticipantId('');
      setParticipantSelection([]);
      setSelectedRencontre([]);
      await reloadData();
    } catch (error) {
      onError?.(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const generateRetourMatches = async () => {
    if (!canGenerateRetour) {
      return;
    }

    const endDate = normalizeDate(tourEndDate);
    if (!endDate) {
      onError?.('La date de fin du tour est requise pour creer les matches retour.');
      return;
    }

    const allerRows = rencontreRows.filter((row) => {
      const id = Number(row.RECLEUNIK ?? 0);
      return Number.isInteger(id) && id > 0 && normalizeCircId(row.IDCIRC) !== 'E02';
    });

    if (allerRows.length === 0) {
      onError?.('Aucun match aller saisi a dupliquer.');
      return;
    }

    const buildIdentityKey = (
      domicile: string,
      exterieur: string,
      domSource: string,
      extSource: string,
    ): string => [domicile, exterieur, domSource, extSource].map((part) => part.trim()).join('|');

    const existingRetourKeys = new Set(
      rencontreRows
        .filter((row) => normalizeCircId(row.IDCIRC) === 'E02')
        .map((row) => buildIdentityKey(
          String(row.DOMICILE ?? ''),
          String(row.EXTERIEUR ?? ''),
          String(row.PADOMSource ?? ''),
          String(row.PAEXTSource ?? ''),
        )),
    );

    const createdKeys = new Set<string>();
    const payloads: CreateTourMatchPayload[] = [];

    allerRows.forEach((aller) => {
      const nextDomicile = String(aller.EXTERIEUR ?? '').trim();
      const nextExterieur = String(aller.DOMICILE ?? '').trim();
      const nextDomSource = String(aller.PAEXTSource ?? '').trim();
      const nextExtSource = String(aller.PADOMSource ?? '').trim();

      if (!nextDomicile && !nextDomSource) {
        return;
      }
      if (!nextExterieur && !nextExtSource) {
        return;
      }

      const key = buildIdentityKey(nextDomicile, nextExterieur, nextDomSource, nextExtSource);
      if (existingRetourKeys.has(key) || createdKeys.has(key)) {
        return;
      }

      createdKeys.add(key);
      payloads.push({
        DATE: endDate,
        HEURE: null,
        DOMICILE: nextDomicile,
        EXTERIEUR: nextExterieur,
        BUTDOM: 0,
        BUTEXT: 0,
        TABDOM: 0,
        TABEXT: 0,
        ETAT: Number(aller.ETAT) === 1 ? 1 : 5,
        TUCLEUNIK: tourId,
        SAISON: String(competitionSeason ?? '').trim(),
        READMIN: 0,
        COMMENT: '',
        VID_ID: null,
        IDCIRC: 'E02',
        PADOMSource: nextDomSource,
        PAEXTSource: nextExtSource,
      });
    });

    if (payloads.length === 0) {
      onError?.('Aucun match retour a creer (deja presents ou donnees invalides).');
      return;
    }

    setSaving(true);
    try {
      await Promise.all(payloads.map((payload) => createTourRencontre(payload)));
      setPending(null);
      setSelectedParticipantId('');
      setParticipantSelection([]);
      setSelectedRencontre([]);
      await reloadData();
    } catch (error) {
      onError?.(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const onClubGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.code !== 'Space' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    if (saving || loading || (hasMultipleGroups && !selectedGroup)) {
      return;
    }

    if (selectedParticipantId) {
      const currentIndex = availableClubRows.findIndex((row) => String(row.PACLEUNIK) === selectedParticipantId);
      if (currentIndex >= 0) {
        setPendingAutoSelectIndex(currentIndex);
      }
    }

    void commitSelectedClub();
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Rencontres</Typography>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.25}>
        {hasMultipleGroups ? (
          <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', lg: 320 }, alignItems: 'center' }}>
            <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
              <InputLabel id="groupe-select-label">Nom du Groupe</InputLabel>
              <Select
                labelId="groupe-select-label"
                label="Nom du Groupe"
                value={selectedGroup}
                onChange={(event) => setSelectedGroup(String(event.target.value ?? ''))}
              >
                <MenuItem value="">(Aucun)</MenuItem>
                {effectiveGroupNames.map((groupName) => (
                  <MenuItem key={groupName} value={groupName}>{groupName}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Tooltip title="Groupe precedent">
              <span>
                <IconButton
                  size="small"
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flexShrink: 0 }}
                  onClick={() => selectAdjacentGroup(-1)}
                  disabled={saving || loading || !canSelectPreviousGroup}
                  aria-label="Selectionner le groupe precedent"
                >
                  <NavigateBeforeRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Groupe suivant">
              <span>
                <IconButton
                  size="small"
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flexShrink: 0 }}
                  onClick={() => selectAdjacentGroup(1)}
                  disabled={saving || loading || !canSelectNextGroup}
                  aria-label="Selectionner le groupe suivant"
                >
                  <NavigateNextRoundedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        ) : null}

        <Stack direction="row" spacing={1} sx={{ flex: 1, minWidth: 0, alignItems: 'center' }}>
          <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
            <InputLabel id="circ-select-label">Nom de la Manche</InputLabel>
            <Select
              labelId="circ-select-label"
              label="Nom de la Manche"
              value={selectedCircId}
              onChange={(event) => setSelectedCircId(String(event.target.value ?? ''))}
            >
              <MenuItem value="">(Aucune)</MenuItem>
              {circOptions.map((circ) => (
                <MenuItem key={circ.IDCIRC} value={circ.IDCIRC}>{circ.CIRC}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="Manche precedente">
            <span>
              <IconButton
                size="small"
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flexShrink: 0 }}
                onClick={() => selectAdjacentCirc(-1)}
                disabled={saving || loading || !canSelectPreviousCirc}
                aria-label="Selectionner la manche precedente"
              >
                <NavigateBeforeRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Manche suivante">
            <span>
              <IconButton
                size="small"
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flexShrink: 0 }}
                onClick={() => selectAdjacentCirc(1)}
                disabled={saving || loading || !canSelectNextCirc}
                aria-label="Selectionner la manche suivante"
              >
                <NavigateNextRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          {canGenerateRetour ? (
            <Tooltip title="Creer les matches retour depuis les matches aller">
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AutorenewRoundedIcon />}
                  sx={{ minWidth: 0, px: 1.1, whiteSpace: 'nowrap', flexShrink: 0 }}
                  onClick={() => setRetourConfirmOpen(true)}
                  disabled={saving || loading}
                >
                  Retours
                </Button>
              </span>
            </Tooltip>
          ) : null}
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ minHeight: 0 }}>
        <Box sx={{ width: { xs: '100%', md: 300 }, minWidth: 0 }}>
          <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 600 }}>
            Participants
          </Typography>
          <Box
            ref={participantsGridRef}
            sx={{ height: 286, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            onKeyDownCapture={onClubGridKeyDown}
          >
            <TourParticipantGrid
              rows={availableClubRows}
              loading={loading}
              selection={participantSelection}
              onSelectionChange={(sel) => {
                const id = sel.length > 0 ? String(sel[0]) : '';
                setParticipantSelection(id ? [id] : []);
                setSelectedParticipantId(id);
              }}
              getLabel={getProgrammedParticipantLabel}
              onRowDoubleClick={(rowId) => {
                const id = String(rowId ?? '').trim();
                if (!id || saving || loading || (hasMultipleGroups && !selectedGroup)) return;
                setSelectedParticipantId(id);
                setParticipantSelection([id]);
                void commitSelectedClub(id);
              }}
            />
          </Box>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ mb: 0.75 }}>
            <Tooltip title="Ajouter">
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddCircleOutlineRoundedIcon />}
                sx={{ minWidth: 0, px: 1.1 }}
                onClick={() => void commitSelectedClub()}
                disabled={saving || loading || (hasMultipleGroups && !selectedGroup)}
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
                onClick={() => void removeSelectedRencontre()}
                disabled={saving || loading}
              >
                Supprimer
              </Button>
            </Tooltip>
          </Stack>

          <Box sx={{ height: 286, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <EntityDataGrid<RencontresGridModelRow>
              rows={gridRows}
              columns={columns}
              loading={loading}
              getRowId={(row) => row.RECLEUNIK}
              selection={selectedRencontre}
              onSelectionChange={setSelectedRencontre}
              onRowClick={(rowId) => setSelectedRencontre([rowId])}
              disableRowSelectionOnClick
              editMode="cell"
              processRowUpdate={persistRencontreRowUpdate}
              onProcessRowUpdateError={onRencontreRowUpdateError}
              isCellEditable={(params) => Number(params.row.RECLEUNIK) > 0 && (params.field === 'DATE' || params.field === 'HEURE')}
            />
          </Box>
        </Box>
      </Stack>

      <Dialog
        open={retourConfirmOpen}
        onClose={() => {
          if (!saving) {
            setRetourConfirmOpen(false);
          }
        }}
      >
        <DialogTitle>Generer les matches retour</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Confirmez-vous la creation automatique des matches retour a partir des matches aller deja saisis ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRetourConfirmOpen(false)} disabled={saving} color="inherit">Annuler</Button>
          <Button
            variant="contained"
            onClick={() => {
              setRetourConfirmOpen(false);
              void generateRetourMatches();
            }}
            disabled={saving}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
