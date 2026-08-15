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
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMediaQuery, useTheme } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { DateGridEditor } from '../../components/DateGridEditor';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { MatchDataGrid } from '../../components/MatchDataGrid';
import { buildMatchGridColumns } from '../../components/matchGridColumns';
import { formatDateShort, fromInputDateToDisplay, toInputDateFromDisplay } from '../../components/DateInputField';
import { useTabFormPaneBridge } from '../../lib/useTabFormPaneBridge';
import { toErrorMessage } from '../../components/useEntityPage';
import { CompetitionFormDialog } from './CompetitionFormDialog';
import { TourWizardDialog } from './TourWizardDialog';
import {
  canDeleteCompetitionTour,
  deleteCompetitionTour,
  fetchCircByTourType,
  fetchCompetitionById,
  fetchTourParticipants,
  fetchTourRencontres,
  fetchCompetitionTours,
  fetchCompetitionWizardData,
  moveCompetitionTour,
  updateTourRencontre,
  updateCompetition,
} from './competitionApi';
import type { CompetitionRow, CompetitionTourRow, EpreuveOption, SaisonOption } from './types';
import type { CalendrierRow } from '../calendrier/types';
import { heureDigitsToApiValue, isValidHeureDigits, normalizeHeureDigits, sanitizeHeureDigits } from '../calendrier/HeureCell';
import type { ScoreDraft } from '../calendrier/ScoreCell';
import { useProgrammedParticipantResolver } from './useProgrammedParticipantLabels';

interface CompetitionTabFormPaneProps {
  tabPath: string;
  competitionId: string;
  active: boolean;
}

type CompetitionTabKey = 'info' | 'deroules';
type RowSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

function rowStatusClass(etat: number): string {
  switch (Number(etat)) {
    case 1:
      return 'status-en-attente';
    case 2:
      return 'status-en-cours';
    case 3:
      return 'status-terminee';
    case 5:
      return 'status-programmee';
    case 4:
      return 'status-non-jouee';
    default:
      return 'status-default';
  }
}

function scoreToInputValue(value: unknown): string {
  if (value === null || value === undefined) return '0';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';
  return String(Math.max(0, Math.trunc(numeric)));
}

function parseScoreInputValue(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.trunc(numeric);
}

function canEditScore(etat: number): boolean {
  return etat !== 4 && etat !== 5;
}

function normalizeCircId(value: unknown): string {
  return String(value ?? '').trim();
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
  const [activeTab, setActiveTab] = useState<CompetitionTabKey>('info');
  const [tourMatchRows, setTourMatchRows] = useState<CalendrierRow[]>([]);
  const [tourMatchesLoading, setTourMatchesLoading] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | number | null>(null);
  const [tourParticipants, setTourParticipants] = useState<import('./types').TourParticipantRow[]>([]);
  const [editingStatusRowId, setEditingStatusRowId] = useState<string | number | null>(null);
  const [statusDraft, setStatusDraft] = useState<number>(5);
  const [editingDateRowId, setEditingDateRowId] = useState<string | number | null>(null);
  const [dateDraft, setDateDraft] = useState<string>('');
  const [editingHeureRowId, setEditingHeureRowId] = useState<string | number | null>(null);
  const [heureDraftDigits, setHeureDraftDigits] = useState<string>('');
  const [editingScoreRowId, setEditingScoreRowId] = useState<string | number | null>(null);
  const [scoreDraft, setScoreDraft] = useState<ScoreDraft>({ tabDom: '', butDom: '', butExt: '', tabExt: '' });
  const [rowSaveStatus, setRowSaveStatus] = useState<Record<string, RowSaveStatus>>({});
  const savedIconTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);
  const handleProgrammedResolveError = useCallback((message: string) => {
    setSnackbar({ severity: 'error', message });
  }, []);
  const programmedSources = useMemo(
    () => tourMatchRows.flatMap((rowItem) => [rowItem.PADOMSource, rowItem.PAEXTSource]),
    [tourMatchRows],
  );
  const resolveProgrammedParticipantName = useProgrammedParticipantResolver(
    tourParticipants,
    Number(row?.COCLEUNIK ?? competitionId ?? 0),
    String(row?.SAISON ?? ''),
    programmedSources,
    handleProgrammedResolveError,
  );

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
      setTourSelection((current) => {
        const selected = String(current[0] ?? '');
        if (selected && rows.some((tour) => String(tour.TUCLEUNIK) === selected)) {
          return [current[0]];
        }
        if (rows.length > 0) {
          return [rows[0].TUCLEUNIK];
        }
        return [];
      });
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

  const orderedMatchRows = useMemo(() => {
    const participantById = new Map<string, import('./types').TourParticipantRow>();
    const participantBySource = new Map<string, import('./types').TourParticipantRow>();
    tourParticipants.forEach((participant) => {
      const clubId = String(participant.IDCLUB ?? '').trim();
      const source = String(participant.PASource ?? '').trim();
      if (clubId) {
        participantById.set(clubId, participant);
      }
      if (source) {
        participantBySource.set(source, participant);
      }
    });

    const resolvedRows = tourMatchRows.map((rowItem) => {
      const domId = String(rowItem.DOMICILE ?? '').trim();
      const extId = String(rowItem.EXTERIEUR ?? '').trim();
      const domSource = String(rowItem.PADOMSource ?? '').trim();
      const extSource = String(rowItem.PAEXTSource ?? '').trim();
      return {
        ...rowItem,
        DOMICILE_NOM: resolveProgrammedParticipantName({
          participant: domId ? participantById.get(domId) : (domSource ? participantBySource.get(domSource) : undefined),
          source: domSource,
          fallbackClubName: rowItem.DOMICILE_NOM,
          mode: 'dynamic',
        }),
        EXTERIEUR_NOM: resolveProgrammedParticipantName({
          participant: extId ? participantById.get(extId) : (extSource ? participantBySource.get(extSource) : undefined),
          source: extSource,
          fallbackClubName: rowItem.EXTERIEUR_NOM,
          mode: 'dynamic',
        }),
      };
    });

    return resolvedRows.sort((a, b) => {
      const dateCmp = String(a.DATE ?? '').localeCompare(String(b.DATE ?? ''));
      if (dateCmp !== 0) return dateCmp;
      const heureCmp = String(a.HEURE ?? '').localeCompare(String(b.HEURE ?? ''));
      if (heureCmp !== 0) return heureCmp;
      return Number(a.RECLEUNIK) - Number(b.RECLEUNIK);
    });
  }, [resolveProgrammedParticipantName, tourMatchRows, tourParticipants]);
  const orderedMatchRowsRef = useRef<CalendrierRow[]>(orderedMatchRows);
  useEffect(() => {
    orderedMatchRowsRef.current = orderedMatchRows;
  }, [orderedMatchRows]);

  const reloadSelectedTourMatches = useCallback(async () => {
    if (!selectedTourRow) {
      setTourMatchRows([]);
      setTourParticipants([]);
      setSelectedMatchId(null);
      return;
    }

    setTourMatchesLoading(true);
    try {
      const [rencontres, participants, circOptions] = await Promise.all([
        fetchTourRencontres(selectedTourRow.TUCLEUNIK),
        fetchTourParticipants(selectedTourRow.TUCLEUNIK),
        fetchCircByTourType(Number(selectedTourRow.TYPE_ID) || 1),
      ]);
      setTourParticipants(participants);

      const circById = new Map<string, string>();
      circOptions.forEach((entry) => {
        const id = normalizeCircId(entry.IDCIRC);
        if (id) {
          circById.set(id, String(entry.CIRC ?? '').trim() || id);
        }
      });

      const mappedRows: CalendrierRow[] = rencontres.map((entry) => {
        const domId = String(entry.DOMICILE ?? '').trim();
        const extId = String(entry.EXTERIEUR ?? '').trim();
        const domSource = String(entry.PADOMSource ?? '').trim();
        const extSource = String(entry.PAEXTSource ?? '').trim();
        const circId = normalizeCircId(entry.IDCIRC);

        return {
          RECLEUNIK: entry.RECLEUNIK,
          TUCLEUNIK: Number(entry.TUCLEUNIK ?? selectedTourRow.TUCLEUNIK),
          DATE: String(entry.DATE ?? ''),
          HEURE: String(entry.HEURE ?? ''),
          ETAT: Number(entry.ETAT ?? 1) || 1,
          IDCIRC: circId || null,
          CIRC: circById.get(circId) ?? (circId || null),
          TOUR_NOM: String(selectedTourRow.TOUR ?? ''),
          COMPET_NOM: String(row?.NOM ?? ''),
          SAISON: String(row?.SAISON ?? ''),
          CO_ANNEE: Number(row?.CO_ANNEE ?? 0) || 0,
          DOMICILE: domId,
          EXTERIEUR: extId,
          BUTDOM: Number(entry.BUTDOM ?? 0) || 0,
          BUTEXT: Number(entry.BUTEXT ?? 0) || 0,
          TABDOM: Number(entry.TABDOM ?? 0) || 0,
          TABEXT: Number(entry.TABEXT ?? 0) || 0,
          PADOMSource: domSource || null,
          PAEXTSource: extSource || null,
          DOMICILE_NOM: domId,
          EXTERIEUR_NOM: extId,
        };
      });

      setTourMatchRows(mappedRows);
      setSelectedMatchId((current) => {
        if (current != null && mappedRows.some((match) => String(match.RECLEUNIK) === String(current))) {
          return current;
        }
        return mappedRows[0]?.RECLEUNIK ?? null;
      });
    } catch (error) {
      setTourMatchRows([]);
      setTourParticipants([]);
      setSelectedMatchId(null);
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setTourMatchesLoading(false);
    }
  }, [selectedTourRow, row]);

  useEffect(() => {
    void reloadSelectedTourMatches();
  }, [reloadSelectedTourMatches]);

  useEffect(() => () => {
    Object.values(savedIconTimersRef.current).forEach((timer) => clearTimeout(timer));
    savedIconTimersRef.current = {};
  }, []);

  const setRowStatusWithAutoHide = (rowId: string | number, status: RowSaveStatus): void => {
    const key = String(rowId);
    const timer = savedIconTimersRef.current[key];
    if (timer) {
      clearTimeout(timer);
      delete savedIconTimersRef.current[key];
    }

    setRowSaveStatus((prev) => ({ ...prev, [key]: status }));

    if (status === 'saved') {
      savedIconTimersRef.current[key] = setTimeout(() => {
        setRowSaveStatus((prev) => {
          if ((prev[key] ?? 'idle') !== 'saved') {
            return prev;
          }
          return { ...prev, [key]: 'idle' };
        });
        delete savedIconTimersRef.current[key];
      }, 3500);
    }
  };

  const startStatusEdit = (item: CalendrierRow) => {
    setEditingDateRowId(null);
    setEditingHeureRowId(null);
    setEditingScoreRowId(null);
    setEditingStatusRowId(item.RECLEUNIK);
    setStatusDraft(Number(item.ETAT ?? 1));
  };

  const cancelStatusEdit = () => {
    setEditingStatusRowId(null);
  };

  const commitStatusEdit = async (item: CalendrierRow, nextValue?: number): Promise<boolean> => {
    const rowId = item.RECLEUNIK;
    const value = typeof nextValue === 'number' ? nextValue : statusDraft;
    if (value === Number(item.ETAT)) {
      setEditingStatusRowId(null);
      return true;
    }

    setRowStatusWithAutoHide(rowId, 'saving');
    try {
      await updateTourRencontre(rowId, { ETAT: value });
      setTourMatchRows((prev) => prev.map((rowItem) => (
        String(rowItem.RECLEUNIK) === String(rowId)
          ? { ...rowItem, ETAT: value }
          : rowItem
      )));
      setRowStatusWithAutoHide(rowId, 'saved');
      setEditingStatusRowId(null);
      return true;
    } catch (error) {
      setRowStatusWithAutoHide(rowId, 'failed');
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    }
  };

  const startDateEdit = (item: CalendrierRow) => {
    setEditingStatusRowId(null);
    setEditingHeureRowId(null);
    setEditingScoreRowId(null);
    setEditingDateRowId(item.RECLEUNIK);
    setDateDraft(fromInputDateToDisplay(String(item.DATE ?? '')));
  };

  const cancelDateEdit = () => {
    setEditingDateRowId(null);
    setDateDraft('');
  };

  const commitDateEdit = async (item: CalendrierRow, normalizedDisplayDate?: string): Promise<boolean> => {
    const rowId = item.RECLEUNIK;
    const displayDate = typeof normalizedDisplayDate === 'string' ? normalizedDisplayDate : dateDraft;
    const isoDate = toInputDateFromDisplay(displayDate);
    if (!isoDate) {
      setSnackbar({ severity: 'error', message: 'Date invalide.' });
      return false;
    }
    if (isoDate === String(item.DATE ?? '')) {
      setEditingDateRowId(null);
      return true;
    }

    setRowStatusWithAutoHide(rowId, 'saving');
    try {
      await updateTourRencontre(rowId, { DATE: isoDate });
      setTourMatchRows((prev) => prev.map((rowItem) => (
        String(rowItem.RECLEUNIK) === String(rowId)
          ? { ...rowItem, DATE: isoDate }
          : rowItem
      )));
      setRowStatusWithAutoHide(rowId, 'saved');
      setEditingDateRowId(null);
      setDateDraft('');
      return true;
    } catch (error) {
      setRowStatusWithAutoHide(rowId, 'failed');
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    }
  };

  const startHeureEdit = (item: CalendrierRow) => {
    setEditingStatusRowId(null);
    setEditingDateRowId(null);
    setEditingScoreRowId(null);
    setEditingHeureRowId(item.RECLEUNIK);
    setHeureDraftDigits(sanitizeHeureDigits(normalizeHeureDigits(item.HEURE)));
  };

  const cancelHeureEdit = () => {
    setEditingHeureRowId(null);
    setHeureDraftDigits('');
  };

  const commitHeureEdit = async (item: CalendrierRow): Promise<boolean> => {
    const rowId = item.RECLEUNIK;
    if (!isValidHeureDigits(heureDraftDigits)) {
      setSnackbar({ severity: 'error', message: 'Heure invalide.' });
      return false;
    }
    const nextValue = heureDigitsToApiValue(heureDraftDigits);
    if (!nextValue || nextValue === String(item.HEURE ?? '')) {
      setEditingHeureRowId(null);
      return true;
    }

    setRowStatusWithAutoHide(rowId, 'saving');
    try {
      await updateTourRencontre(rowId, { HEURE: nextValue });
      setTourMatchRows((prev) => prev.map((rowItem) => (
        String(rowItem.RECLEUNIK) === String(rowId)
          ? { ...rowItem, HEURE: nextValue }
          : rowItem
      )));
      setRowStatusWithAutoHide(rowId, 'saved');
      setEditingHeureRowId(null);
      setHeureDraftDigits('');
      return true;
    } catch (error) {
      setRowStatusWithAutoHide(rowId, 'failed');
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    }
  };

  const moveHeureEditToAdjacentRow = async (item: CalendrierRow, direction: 'up' | 'down') => {
    const currentIndex = orderedMatchRows.findIndex((rowItem) => String(rowItem.RECLEUNIK) === String(item.RECLEUNIK));
    await commitHeureEdit(item);
    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= orderedMatchRows.length) {
      return;
    }
    startHeureEdit(orderedMatchRows[nextIndex]);
  };

  const startScoreEdit = (item: CalendrierRow) => {
    if (!canEditScore(Number(item.ETAT))) {
      return;
    }
    setEditingStatusRowId(null);
    setEditingDateRowId(null);
    setEditingHeureRowId(null);
    setEditingScoreRowId(item.RECLEUNIK);
    setScoreDraft({
      tabDom: scoreToInputValue(item.TABDOM),
      butDom: scoreToInputValue(item.BUTDOM),
      butExt: scoreToInputValue(item.BUTEXT),
      tabExt: scoreToInputValue(item.TABEXT),
    });
  };

  const cancelScoreEdit = () => {
    setEditingScoreRowId(null);
  };

  const commitScoreEdit = async (item: CalendrierRow): Promise<boolean> => {
    const rowId = item.RECLEUNIK;
    const payload = {
      TABDOM: parseScoreInputValue(scoreDraft.tabDom),
      BUTDOM: parseScoreInputValue(scoreDraft.butDom),
      BUTEXT: parseScoreInputValue(scoreDraft.butExt),
      TABEXT: parseScoreInputValue(scoreDraft.tabExt),
    };

    setRowStatusWithAutoHide(rowId, 'saving');
    try {
      await updateTourRencontre(rowId, payload);
      setTourMatchRows((prev) => prev.map((rowItem) => (
        String(rowItem.RECLEUNIK) === String(rowId)
          ? { ...rowItem, ...payload }
          : rowItem
      )));
      setRowStatusWithAutoHide(rowId, 'saved');
      setEditingScoreRowId(null);
      return true;
    } catch (error) {
      setRowStatusWithAutoHide(rowId, 'failed');
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    }
  };

  const moveScoreEditToAdjacentRow = async (item: CalendrierRow, direction: 'up' | 'down') => {
    const currentIndex = orderedMatchRows.findIndex((rowItem) => String(rowItem.RECLEUNIK) === String(item.RECLEUNIK));
    await commitScoreEdit(item);
    const step = direction === 'up' ? -1 : 1;
    for (let index = currentIndex + step; index >= 0 && index < orderedMatchRows.length; index += step) {
      const nextRow = orderedMatchRows[index];
      if (!canEditScore(Number(nextRow.ETAT))) continue;
      startScoreEdit(nextRow);
      return;
    }
  };

  const findLatestOrderedMatchRowById = (rowId: string | number): CalendrierRow | undefined => {
    return orderedMatchRowsRef.current.find((rowItem) => String(rowItem.RECLEUNIK) === String(rowId));
  };

  const openFieldForMatchRowId = (rowId: string | number, field: 'status' | 'date' | 'heure' | 'score'): void => {
    window.requestAnimationFrame(() => {
      const latestRow = findLatestOrderedMatchRowById(rowId);
      if (!latestRow) {
        return;
      }

      if (field === 'status') {
        startStatusEdit(latestRow);
        return;
      }
      if (field === 'date') {
        startDateEdit(latestRow);
        return;
      }
      if (field === 'heure') {
        startHeureEdit(latestRow);
        return;
      }

      if (!canEditScore(Number(latestRow.ETAT))) {
        startStatusEdit(latestRow);
        return;
      }
      startScoreEdit(latestRow);
    });
  };

  const handleStatusTabOut = async (item: CalendrierRow, direction: 'next' | 'prev') => {
    const rowId = item.RECLEUNIK;
    const committed = await commitStatusEdit(item);
    if (!committed) {
      return;
    }

    if (direction === 'next') {
      openFieldForMatchRowId(rowId, 'date');
      return;
    }

    openFieldForMatchRowId(rowId, 'score');
  };

  const handleDateTabOut = async (item: CalendrierRow, direction: 'next' | 'prev') => {
    const rowId = item.RECLEUNIK;
    const committed = await commitDateEdit(item);
    if (!committed) {
      return;
    }

    if (direction === 'next') {
      openFieldForMatchRowId(rowId, 'heure');
      return;
    }

    openFieldForMatchRowId(rowId, 'status');
  };

  const handleHeureTabOut = async (item: CalendrierRow, direction: 'next' | 'prev') => {
    const rowId = item.RECLEUNIK;
    const committed = await commitHeureEdit(item);
    if (!committed) {
      return;
    }

    if (direction === 'next') {
      openFieldForMatchRowId(rowId, 'score');
      return;
    }

    openFieldForMatchRowId(rowId, 'date');
  };

  const handleScoreTabOut = async (item: CalendrierRow, direction: 'next' | 'prev') => {
    const rowId = item.RECLEUNIK;
    const committed = await commitScoreEdit(item);
    if (!committed) {
      return;
    }

    if (direction === 'next') {
      openFieldForMatchRowId(rowId, 'status');
      return;
    }

    openFieldForMatchRowId(rowId, 'heure');
  };

  const matchColumns = useMemo<GridColDef<CalendrierRow>[]>(() => buildMatchGridColumns({
    status: {
      editingRowId: editingStatusRowId,
      draftValue: statusDraft,
      onStartEdit: startStatusEdit,
      onDraftChange: (_row, nextValue) => setStatusDraft(nextValue),
      onCommit: commitStatusEdit,
      onCancel: () => cancelStatusEdit(),
      onTabOut: handleStatusTabOut,
      sortable: false,
    },
    date: {
      enabled: true,
      width: 110,
      sortable: false,
      renderCell: (item) => {
        const isEditing = String(editingDateRowId) === String(item.RECLEUNIK);
        if (isEditing) {
          return (
            <DateGridEditor
              value={dateDraft}
              onChange={setDateDraft}
              onCommit={(nextDisplayDate) => commitDateEdit(item, nextDisplayDate)}
              onCancel={cancelDateEdit}
              onTabOut={(direction) => {
                void handleDateTabOut(item, direction);
              }}
            />
          );
        }

        return (
          <Box
            sx={{ width: '100%', textAlign: 'center', cursor: 'text' }}
            onClick={(event) => {
              event.stopPropagation();
              startDateEdit(item);
            }}
          >
            {formatDateShort(item.DATE)}
          </Box>
        );
      },
    },
    heure: {
      editingRowId: editingHeureRowId,
      draftDigits: heureDraftDigits,
      onStartEdit: startHeureEdit,
      onDraftChange: (_row, digits) => setHeureDraftDigits(digits),
      onCommit: commitHeureEdit,
      onCancel: () => cancelHeureEdit(),
      onMoveVertical: moveHeureEditToAdjacentRow,
      onTabOut: handleHeureTabOut,
      sortable: false,
    },
    circ: {
      enabled: true,
      width: 118,
      sortable: false,
    },
    score: {
      editingRowId: editingScoreRowId,
      draft: scoreDraft,
      canEdit: (row) => canEditScore(Number(row.ETAT)),
      onStartEdit: startScoreEdit,
      onDraftChange: (_row, patch) => setScoreDraft((prev) => ({ ...prev, ...patch })),
      onUserInput: () => undefined,
      onCommit: commitScoreEdit,
      onCancel: () => cancelScoreEdit(),
      onMoveVertical: moveScoreEditToAdjacentRow,
      onTabOut: handleScoreTabOut,
    },
  }), [
    dateDraft,
    editingDateRowId,
    editingHeureRowId,
    editingScoreRowId,
    editingStatusRowId,
    heureDraftDigits,
    scoreDraft,
    statusDraft,
  ]);

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
          <Tabs
            value={activeTab}
            onChange={(_event, value: CompetitionTabKey) => setActiveTab(value)}
            sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36 } }}
          >
            <Tab value="info" label="Informations" />
            <Tab value="deroules" label="Deroules" />
          </Tabs>

          {activeTab === 'info' ? (
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
          ) : (
            <Stack spacing={2}>
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

              <Box sx={{ bgcolor: '#ffffff', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Stack spacing={0.75}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                    Rencontres du tour selectionne
                  </Typography>

                  <Box sx={{ height: 380 }}>
                    <MatchDataGrid
                      rows={orderedMatchRows}
                      columns={matchColumns}
                      loading={tourMatchesLoading}
                      rowSaveStatusMap={rowSaveStatus}
                      getRowId={(rowItem) => rowItem.RECLEUNIK}
                      openMatchOnDoubleClick
                      rowSelectionModel={{
                        type: 'include',
                        ids: new Set(selectedMatchId != null ? [selectedMatchId] : []),
                      }}
                      onRowSelectionModelChange={(model) => {
                        const first = model.ids.values().next().value;
                        setSelectedMatchId(first != null ? first : null);
                      }}
                      getRowClassName={(params) => rowStatusClass(Number(params.row.ETAT ?? 0))}
                      disableColumnMenu
                      density="compact"
                      pageSizeOptions={[10, 25, 50]}
                    />
                  </Box>
                </Stack>
              </Box>
            </Stack>
          )}
        </Stack>
      ) : null}

      <TourWizardDialog
        open={tourModalOpen}
        mode={tourModalMode}
        competitionId={competitionId}
        competitionLabel={resolveCompetitionLabel(row ?? {}, String(competitionId))}
        competitionSeason={String(row?.SAISON ?? '').trim()}
        initialTourId={tourModalEditingId}
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
