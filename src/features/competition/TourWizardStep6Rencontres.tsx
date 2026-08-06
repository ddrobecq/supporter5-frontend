import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import {
  Box,
  Button,
  FormControl,
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
import { formatDateShort } from '../../components/DateInputField';
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
import { useProgrammedParticipantLabels } from './useProgrammedParticipantLabels';
import { TourParticipantGrid } from './TourParticipantGrid';
import type { CircOptionRow, TourMatchRow, TourParticipantRow } from './types';

interface TourWizardStep6RencontresProps {
  tourId: number;
  competitionId: number;
  tourType: 'ligue' | 'eliminatoire';
  competitionSeason: string;
  tourStartDate: string;
  tourDefaultHeure: string;
  nbGroupe: number;
  groupNames: string[];
  onError?: (message: string) => void;
}

interface PendingRencontre {
  date: string;
  heure: string | null;
  domicileParticipantId: string;
  domicile: string;
  domicileSource: string;
  domicileLabel: string;
}

interface RencontresGridRow extends TourMatchRow {
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
}

function normalizeDate(value: string): string {
  const trimmed = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return '';
}

function parseDateInput(value: unknown): string {
  const trimmed = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const frenchMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (frenchMatch) {
    const [, dd, mm, yyyy] = frenchMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
}

function formatDateDisplay(value: unknown): string {
  return formatDateShort(value);
}

function normalizeHeure(value: string | null | undefined): string {
  const trimmed = String(value ?? '').trim();
  const compact = /^([01]\d|2[0-3])([0-5]\d)$/.exec(trimmed);
  if (compact) {
    return `${compact[1]}:${compact[2]}`;
  }
  const withH = /^([01]\d|2[0-3])h([0-5]\d)$/i.exec(trimmed);
  if (withH) {
    return `${withH[1]}:${withH[2]}`;
  }
  const withSeconds = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.exec(trimmed);
  if (withSeconds) {
    return `${withSeconds[1]}:${withSeconds[2]}`;
  }
  if (/^\d{2}:\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 5);
  }
  return '';
}

function formatHeureDisplay(value: unknown): string {
  const dbHeure = normalizeHeure(String(value ?? ''));
  if (!dbHeure) {
    return String(value ?? '').trim();
  }
  return `${dbHeure.slice(0, 2)}h${dbHeure.slice(3, 5)}`;
}

function compareDateHeure(a: TourMatchRow, b: TourMatchRow): number {
  const left = `${String(a.DATE ?? '')} ${String(a.HEURE ?? '')}`;
  const right = `${String(b.DATE ?? '')} ${String(b.HEURE ?? '')}`;
  return left.localeCompare(right, 'fr', { sensitivity: 'base' });
}

function normalizeCircId(value: unknown): string {
  return String(value ?? '').trim();
}

function buildDefaultGroupNames(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `Groupe ${index + 1}`);
}

function getParticipantIdentityKey(row: TourParticipantRow): string {
  const clubId = String(row.IDCLUB ?? '').trim();
  if (clubId) {
    return `club:${clubId}`;
  }

  const source = String(row.PASource ?? '').trim();
  if (source) {
    return `src:${source}`;
  }

  return `pacleunik:${String(row.PACLEUNIK)}`;
}

export function TourWizardStep6Rencontres({
  tourId,
  competitionId,
  tourType,
  competitionSeason,
  tourStartDate,
  tourDefaultHeure,
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
  const [pending, setPending] = useState<PendingRencontre | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingAutoSelectIndex, setPendingAutoSelectIndex] = useState<number | null>(null);
  const participantsGridRef = useRef<HTMLDivElement | null>(null);

  const typeId = tourType === 'eliminatoire' ? 2 : 1;
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

      setParticipants(participantRows);
      setRencontres(rencontreRows);
      setCircOptions(circRows);
      setSelectedRencontre([]);
    } catch (error) {
      onError?.(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reloadData();
  }, [tourId, typeId]);

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

  useEffect(() => {
    // A pending draft is tied to one circumstance; clear it when the selected circumstance changes.
    setSelectedParticipantId('');
    setParticipantSelection([]);
    setPending(null);
    setSelectedRencontre([]);
  }, [selectedCircId]);

  const participantById = useMemo(() => {
    const map = new Map<string, TourParticipantRow>();
    participants.forEach((row) => {
      const clubId = String(row.IDCLUB ?? '').trim();
      if (clubId) {
        map.set(clubId, row);
      }
    });
    return map;
  }, [participants]);

  const participantBySource = useMemo(() => {
    const map = new Map<string, TourParticipantRow>();
    participants.forEach((row) => {
      const source = String(row.PASource ?? '').trim();
      if (source) {
        map.set(source, row);
      }
    });
    return map;
  }, [participants]);

  const lockedParticipantKeys = useMemo(() => {
    const keys = new Set<string>();
    const selectedCirc = normalizeCircId(selectedCircId);
    rencontres.forEach((match) => {
      const matchCirc = normalizeCircId(match.IDCIRC);
      if (matchCirc !== selectedCirc) {
        return;
      }

      const dom = String(match.DOMICILE ?? '').trim();
      const ext = String(match.EXTERIEUR ?? '').trim();
      const domSource = String(match.PADOMSource ?? '').trim();
      const extSource = String(match.PAEXTSource ?? '').trim();
      if (dom) keys.add(`club:${dom}`);
      if (ext) keys.add(`club:${ext}`);
      if (domSource) keys.add(`src:${domSource}`);
      if (extSource) keys.add(`src:${extSource}`);
    });
    return keys;
  }, [rencontres, selectedCircId]);

  const availableClubRows = useMemo(() => {
    let rows = participants.filter((row) => !lockedParticipantKeys.has(getParticipantIdentityKey(row)));

    if (hasMultipleGroups) {
      if (!selectedGroup) {
        return [];
      }
      rows = rows.filter((row) => String(row.GROUPE ?? '').trim() === selectedGroup);
    }

    if (pending?.domicileParticipantId) {
      return rows.filter((row) => String(row.PACLEUNIK) !== pending.domicileParticipantId);
    }
    return rows;
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
    const selectedCirc = normalizeCircId(selectedCircId);
    return rencontreRows.filter((row) => normalizeCircId(row.IDCIRC) === selectedCirc);
  }, [rencontreRows, selectedCircId]);

  const gridRows = useMemo<RencontresGridRow[]>(() => {
    const rows = filteredRencontreRows.map((match) => {
      const domicileClubId = String(match.DOMICILE ?? '').trim();
      const domicileSource = String(match.PADOMSource ?? '').trim();
      const domicileParticipant = domicileClubId
        ? participantById.get(domicileClubId)
        : (domicileSource ? participantBySource.get(domicileSource) : undefined);

      const exterieurClubId = String(match.EXTERIEUR ?? '').trim();
      const exterieurSource = String(match.PAEXTSource ?? '').trim();
      const exterieurParticipant = exterieurClubId
        ? participantById.get(exterieurClubId)
        : (exterieurSource ? participantBySource.get(exterieurSource) : undefined);

      return {
        ...match,
        DOMICILE_NOM: domicileParticipant
          ? getProgrammedParticipantLabel(domicileParticipant)
          : (domicileClubId || (domicileSource ? `Programme (${domicileSource})` : '')),
        EXTERIEUR_NOM: exterieurParticipant
          ? getProgrammedParticipantLabel(exterieurParticipant)
          : (exterieurClubId || (exterieurSource ? `Programme (${exterieurSource})` : '')),
      };
    });

    if (pending) {
      rows.push({
        RECLEUNIK: -1,
        DATE: pending.date,
        HEURE: pending.heure ?? '',
        DOMICILE: pending.domicile,
        EXTERIEUR: '',
        PADOMSource: pending.domicileSource,
        PAEXTSource: '',
        DOMICILE_NOM: pending.domicileLabel,
        EXTERIEUR_NOM: '',
      } as RencontresGridRow);
    }

    return rows;
  }, [filteredRencontreRows, pending, participantById, participantBySource]);

  const columns = useMemo<GridColDef<RencontresGridRow>[]>(
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
    newRow: RencontresGridRow,
    oldRow: RencontresGridRow,
  ): Promise<RencontresGridRow> => {
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
    const updatedRow: RencontresGridRow = { ...newRow, DATE: nextDate, HEURE: nextHeure };

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
          <FormControl size="small" sx={{ width: { xs: '100%', lg: 320 } }}>
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
        ) : null}

        <FormControl fullWidth size="small">
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
            <EntityDataGrid<RencontresGridRow>
              rows={gridRows}
              columns={columns}
              loading={loading}
              getRowId={(row) => row.RECLEUNIK}
              selection={selectedRencontre}
              onSelectionChange={setSelectedRencontre}
              disableRowSelectionOnClick
              editMode="cell"
              processRowUpdate={persistRencontreRowUpdate}
              onProcessRowUpdateError={onRencontreRowUpdateError}
              isCellEditable={(params) => Number(params.row.RECLEUNIK) > 0 && (params.field === 'DATE' || params.field === 'HEURE')}
            />
          </Box>
        </Box>
      </Stack>
    </Stack>
  );
}
