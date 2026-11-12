import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import {
  Alert,
  Box,
  Card,
  CardContent,
  IconButton,
  Stack,
  Tooltip,
} from '@mui/material';
import { type GridColDef, type GridSortModel } from '@mui/x-data-grid';
import { MatchDataGrid } from '../../components/MatchDataGrid';
import { buildMatchGridColumns } from '../../components/matchGridColumns';
import { toLocalIsoDate } from '../../components/dateUtils';
import {
  fetchCalendarByDate,
  fetchTourClassement,
  updateCalendarHeure,
  updateCalendarScore,
  updateCalendarStatus,
} from './calendrierApi';
import { CalendarDateNavigator } from './CalendarDateNavigator';
import { entityPath } from '../../lib/entityNavigation';
import { useDepsChanged } from '../../lib/useDepsChanged';
import { isHttpUrl } from '../../lib/safeUrl';
import {
  heureDigitsToApiValue,
  isValidHeureDigits,
  normalizeHeureDigits,
  sanitizeHeureDigits,
} from '../../components/heureUtils';
import type { ScoreDraft } from './ScoreCell';
import { TourClassementCard, type TourClassementCardHandle } from './TourClassementCard';
import { normalizeGroupName, resolveMatchGroup } from './tourClassementUtils';
import type { CalendrierRow, TourClassementRow } from './types';
import { canEditScore, parseScoreInputValue, rowStatusClass, scoreToInputValue } from '../../lib/matchStatus';
import { emitTabOpen } from '../../lib/useTabMetaEvents';

const DEFAULT_SORT_MODEL: GridSortModel = [{ field: 'HEURE', sort: 'asc' }];
const CALENDRIER_DATE_STORAGE_KEY = 'supporter:calendrier:selected-date';

type RowSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

function compareValues(a: unknown, b: unknown): number {
  const aNum = Number(a);
  const bNum = Number(b);
  const aIsNum = Number.isFinite(aNum);
  const bIsNum = Number.isFinite(bNum);

  if (aIsNum && bIsNum) {
    return aNum - bNum;
  }

  return String(a ?? '').localeCompare(String(b ?? ''), 'fr', { sensitivity: 'base' });
}

function getSortedRows(rows: CalendrierRow[], sortModel: GridSortModel): CalendrierRow[] {
  if (!sortModel.length) {
    return rows;
  }

  const [{ field, sort }] = sortModel;
  if (!sort) {
    return rows;
  }

  const multiplier = sort === 'asc' ? 1 : -1;
  const sortableFields = new Set(['ETAT', 'HEURE', 'DOMICILE_NOM', 'EXTERIEUR_NOM']);
  if (!sortableFields.has(field)) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    const cmp = compareValues(
      left[field as keyof CalendrierRow],
      right[field as keyof CalendrierRow],
    );
    if (cmp !== 0) {
      return cmp * multiplier;
    }
    return compareValues(left.RECLEUNIK, right.RECLEUNIK);
  });
}

function getInitialCalendrierDate(): string {
  const fallback = toLocalIsoDate(new Date());
  if (typeof window === 'undefined') {
    return fallback;
  }

  const stored = window.sessionStorage.getItem(CALENDRIER_DATE_STORAGE_KEY) ?? '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(stored)) {
    return stored;
  }
  return fallback;
}

function resolveCompetitionSeasonLabel(saison: unknown, coAnnee: unknown): string {
  const season = String(saison ?? '').trim();
  if (!season) return '';
  if (Number(coAnnee) === 1) {
    const match = season.match(/^(\d{4})-(\d{4})$/);
    if (match) return match[1];
  }
  return season;
}

function buildClassementBlockLabel(row: CalendrierRow | null): string {
  if (!row) return '';

  const circ = String(row.CIRC ?? '').trim();
  const tour = String(row.TOUR_NOM ?? '').trim();
  const competition = String(row.COMPET_NOM ?? '').trim();
  const season = resolveCompetitionSeasonLabel(row.SAISON, row.CO_ANNEE);
  const competitionWithSeason = [competition, season].filter((part) => part.length > 0).join(' ');

  const core = [tour, competitionWithSeason].filter((part) => part.length > 0).join(' de ');
  if (!core) return '';
  if (!circ) return core;
  return `${circ} de ${core}`;
}

function parseRowDateTime(dateValue: string, heureValue: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return null;
  }

  const heureDigits = normalizeHeureDigits(heureValue);
  if (!/^\d{4}$/.test(heureDigits)) {
    return null;
  }

  const year = Number(dateValue.slice(0, 4));
  const month = Number(dateValue.slice(5, 7));
  const day = Number(dateValue.slice(8, 10));
  const hours = Number(heureDigits.slice(0, 2));
  const minutes = Number(heureDigits.slice(2, 4));

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
    return null;
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function getStatusAfterScoreEdit(row: CalendrierRow): number {
  const currentStatus = Number(row.ETAT);
  if (currentStatus !== 1 && currentStatus !== 2) {
    return currentStatus;
  }

  const rowDateTime = parseRowDateTime(String(row.DATE ?? ''), String(row.HEURE ?? ''));
  const now = new Date();

  if (!rowDateTime) {
    // No valid time: fall back to date-only — if the date is strictly in the past, the match is over.
    const dateStr = String(row.DATE ?? '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (new Date(dateStr) < startOfToday) {
        return 3;
      }
    }
    return currentStatus;
  }
  const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));

  if (rowDateTime <= twoHoursAgo) {
    return 3;
  }

  if (rowDateTime <= now) {
    return 2;
  }

  if (currentStatus === 2) {
    return 2;
  }

  return 1;
}

type Handlers = Record<string, (...args: never[]) => unknown>;

/**
 * Returns stable wrappers that always call the latest version of each handler (refreshed after every
 * commit), so memoized grid columns can use them without listing every handler as a dependency.
 */
function useLatestHandlers<T extends Handlers>(handlers: T): T {
  const latestRef = useRef(handlers);
  useLayoutEffect(() => {
    latestRef.current = handlers;
  });
  const [stableHandlers] = useState(() => {
    const wrappers: Handlers = {};
    for (const key of Object.keys(handlers)) {
      wrappers[key] = (...args: never[]) => (latestRef.current as Handlers)[key](...args);
    }
    return wrappers as T;
  });
  return stableHandlers;
}

function isProgrammedUnresolvedSide(sourceValue: unknown, clubIdValue: unknown): boolean {
  const source = String(sourceValue ?? '').trim();
  const clubId = String(clubIdValue ?? '').trim();
  return source.length > 0 && clubId.length === 0;
}

export function CalendrierPage({ readOnly = false }: { readOnly?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [date, setDate] = useState<string>(() => getInitialCalendrierDate());
  const [rows, setRows] = useState<CalendrierRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowSaveStatus, setRowSaveStatus] = useState<Record<string, RowSaveStatus>>({});
  const [editingScoreRowId, setEditingScoreRowId] = useState<string | number | null>(null);
  const [editingHeureRowId, setEditingHeureRowId] = useState<string | number | null>(null);
  const [editingStatusRowId, setEditingStatusRowId] = useState<string | number | null>(null);
  const [scoreDraft, setScoreDraft] = useState<ScoreDraft>({ tabDom: '', butDom: '', butExt: '', tabExt: '' });
  const [heureDraftDigits, setHeureDraftDigits] = useState<string>('');
  const [statusDraft, setStatusDraft] = useState<number>(5);
  const [rowModified, setRowModified] = useState<Record<string, boolean>>({});
  const rowModifiedRef = useRef<Record<string, boolean>>({});
  const [sortModel, setSortModel] = useState(DEFAULT_SORT_MODEL);
  const [selectedRowId, setSelectedRowId] = useState<string | number | null>(null);
  const savingScoreRowIdRef = useRef<string | number | null>(null);
  const savedIconTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const classementCacheRef = useRef<Map<number, TourClassementRow[]>>(new Map());
  const [tourClassementByTour, setTourClassementByTour] = useState<Map<number, TourClassementRow[]>>(new Map());
  const tourClassementLoadingRef = useRef<Set<number>>(new Set());
  const classementCardRef = useRef<TourClassementCardHandle | null>(null);
  const scoreInitialDraftRef = useRef<ScoreDraft | null>(null);
  const heureInitialDraftRef = useRef<string>('');
  const statusInitialValueRef = useRef<number | null>(null);

  const isDefaultHeureSort =
    sortModel.length === 1 && sortModel[0].field === 'HEURE' && sortModel[0].sort === 'asc';

  const orderedRows = useMemo(() => getSortedRows(rows, sortModel), [rows, sortModel]);
  const orderedRowsRef = useRef<CalendrierRow[]>(orderedRows);
  useEffect(() => {
    orderedRowsRef.current = orderedRows;
  }, [orderedRows]);
  const compactMatchListHeight = useMemo(() => {
    const visibleRows = Math.max(rows.length, 1);
    // Approximate DataGrid chrome in compact density (header + footer + paddings).
    const estimatedGridChrome = 116;
    const estimatedRowHeight = 33;
    return Math.max(150, estimatedGridChrome + (visibleRows * estimatedRowHeight));
  }, [rows.length]);
  const selectedRow = useMemo(
    () => rows.find((row) => String(row.RECLEUNIK) === String(selectedRowId ?? '')) ?? null,
    [rows, selectedRowId],
  );
  const isSelectedProgrammedEncounter = useMemo(() => {
    if (!selectedRow) {
      return false;
    }

    return isProgrammedUnresolvedSide(selectedRow.PADOMSource, selectedRow.DOMICILE)
      || isProgrammedUnresolvedSide(selectedRow.PAEXTSource, selectedRow.EXTERIEUR);
  }, [selectedRow]);
  const activeTourId = useMemo(() => {
    const candidate = Number(selectedRow?.TUCLEUNIK ?? 0);
    if (!Number.isInteger(candidate) || candidate <= 0) {
      return null;
    }
    return candidate;
  }, [selectedRow]);
  const classementBlockLabel = useMemo(
    () => buildClassementBlockLabel(selectedRow),
    [selectedRow],
  );

  const openClub = useCallback((clubId: string, clubName: string) => {
    const normalizedId = clubId.trim();
    if (!normalizedId) return;
    const path = entityPath('club', normalizedId, location.pathname);
    if (readOnly) {
      navigate(path);
      return;
    }
    emitTabOpen(path, clubName.trim() || normalizedId);
  }, [location.pathname, navigate, readOnly]);

  const isEliminatoryMatchWinner = useCallback((row: CalendrierRow, side: 'domicile' | 'exterieur'): boolean => {
    if (Number(row.TYPE_TOUR ?? 0) !== 2) {
      return false;
    }

    const tourRows = tourClassementByTour.get(Number(row.TUCLEUNIK)) ?? [];
    if (tourRows.length === 0) {
      return false;
    }

    const group = resolveMatchGroup(tourRows, row);
    const candidates = tourRows.filter((candidate) => (
      !group || normalizeGroupName(candidate.GROUPE) === group
    ));
    const winners = candidates.filter((candidate) => Number(candidate.PAClassement ?? 0) === 1);
    if (winners.length !== 1) {
      return false;
    }

    const clubId = side === 'domicile' ? row.DOMICILE : row.EXTERIEUR;
    return String(clubId ?? '').trim() !== ''
      && String(winners[0]?.IDCLUB ?? '').trim() === String(clubId).trim();
  }, [tourClassementByTour]);
  const competitionId = Number(selectedRow?.COCLEUNIK ?? 0);
  const competitionWebUrl = String(selectedRow?.CO_WEB ?? '').trim();
  const canOpenCompetitionWeb = useMemo(() => isHttpUrl(competitionWebUrl), [competitionWebUrl]);

  const openCompetitionTab = () => {
    if (!Number.isInteger(competitionId) || competitionId <= 0) {
      return;
    }
    const path = entityPath('competition', competitionId, location.pathname);
    if (readOnly) {
      navigate(path);
      return;
    }
    emitTabOpen(path, `${String(selectedRow?.COMPET_NOM ?? '').trim()} ${String(selectedRow?.SAISON ?? '').trim()}`.trim() || 'Compétition');
  };

  const openCompetitionWeb = () => {
    if (!canOpenCompetitionWeb) {
      return;
    }
    window.open(competitionWebUrl, '_blank', 'noopener,noreferrer');
  };

  // Loading flags are set while rendering, on the same dependency as the fetch effect below.
  const dateChanged = useDepsChanged([date]);
  if (dateChanged) {
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    const controller = new AbortController();

    void fetchCalendarByDate(date, controller.signal)
      .then((data) => setRows(data))
      .catch((err: unknown) => {
        if ((err as { code?: string })?.code === 'ERR_CANCELED') return;
        setError('Impossible de charger le calendrier.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [date]);

  useEffect(() => {
    const eliminatoireTourIds = Array.from(new Set(
      rows
        .filter((row) => Number(row.TYPE_TOUR ?? 0) === 2)
        .map((row) => Number(row.TUCLEUNIK))
        .filter((tourId) => Number.isInteger(tourId) && tourId > 0),
    ));

    const missing = eliminatoireTourIds.filter((tourId) => (
      !classementCacheRef.current.has(tourId) && !tourClassementLoadingRef.current.has(tourId)
    ));

    const applyFromCache = () => {
      setTourClassementByTour((prev) => {
        let changed = eliminatoireTourIds.length !== prev.size;
        const next = new Map<number, TourClassementRow[]>();
        for (const tourId of eliminatoireTourIds) {
          const cached = classementCacheRef.current.get(tourId) ?? [];
          next.set(tourId, cached);
          if (prev.get(tourId) !== cached) {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };

    if (missing.length === 0) {
      applyFromCache();
      return;
    }

    missing.forEach((tourId) => tourClassementLoadingRef.current.add(tourId));
    void Promise.all(missing.map((tourId) => (
      fetchTourClassement(tourId, readOnly)
        .then((data) => {
          classementCacheRef.current.set(tourId, data);
        })
        .catch(() => {
          classementCacheRef.current.set(tourId, []);
        })
        .finally(() => {
          tourClassementLoadingRef.current.delete(tourId);
        })
    ))).then(applyFromCache);
  }, [rows, readOnly]);

  // Keep the selection on an existing row (first row by default), adjusted while rendering.
  const selectionDepsChanged = useDepsChanged([rows, selectedRowId]);
  if (selectionDepsChanged) {
    if (rows.length === 0) {
      if (selectedRowId !== null) setSelectedRowId(null);
    } else if (!rows.some((row) => String(row.RECLEUNIK) === String(selectedRowId ?? ''))
      && !Object.is(selectedRowId, rows[0].RECLEUNIK)) {
      setSelectedRowId(rows[0].RECLEUNIK);
    }
  }

  const displayedActiveTourId = isSelectedProgrammedEncounter ? null : activeTourId;

  useEffect(() => () => {
    Object.values(savedIconTimersRef.current).forEach((timer) => clearTimeout(timer));
    savedIconTimersRef.current = {};
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.sessionStorage.setItem(CALENDRIER_DATE_STORAGE_KEY, date);
  }, [date]);

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

  const setRowModifiedFlag = (rowId: string | number, modified: boolean): void => {
    const key = String(rowId);
    rowModifiedRef.current[key] = modified;
    setRowModified((prev) => {
      if ((prev[key] ?? false) === modified) {
        return prev;
      }
      return { ...prev, [key]: modified };
    });
  };

  const startScoreEdit = (row: CalendrierRow): void => {
    if (!canEditScore(Number(row.ETAT))) {
      return;
    }

    setSelectedRowId(row.RECLEUNIK);
    setEditingStatusRowId(null);
    setEditingHeureRowId(null);
    setEditingScoreRowId(row.RECLEUNIK);
    const initialDraft = {
      tabDom: scoreToInputValue(row.TABDOM),
      butDom: scoreToInputValue(row.BUTDOM),
      butExt: scoreToInputValue(row.BUTEXT),
      tabExt: scoreToInputValue(row.TABEXT),
    };
    scoreInitialDraftRef.current = initialDraft;
    setScoreDraft(initialDraft);
    setRowModifiedFlag(row.RECLEUNIK, false);
  };

  const cancelScoreEdit = (row: CalendrierRow): void => {
    setScoreDraft({
      tabDom: scoreToInputValue(row.TABDOM),
      butDom: scoreToInputValue(row.BUTDOM),
      butExt: scoreToInputValue(row.BUTEXT),
      tabExt: scoreToInputValue(row.TABEXT),
    });
    scoreInitialDraftRef.current = null;
    setRowModifiedFlag(row.RECLEUNIK, false);
    setEditingScoreRowId((current) => (current === row.RECLEUNIK ? null : current));
  };

  const startHeureEdit = (row: CalendrierRow): void => {
    setSelectedRowId(row.RECLEUNIK);
    setEditingStatusRowId(null);
    setEditingScoreRowId(null);
    setEditingHeureRowId(row.RECLEUNIK);
    const initialDigits = sanitizeHeureDigits(normalizeHeureDigits(row.HEURE));
    heureInitialDraftRef.current = initialDigits;
    setHeureDraftDigits(initialDigits);
    setRowModifiedFlag(row.RECLEUNIK, false);
  };

  const cancelHeureEdit = (row: CalendrierRow): void => {
    const initialDigits = sanitizeHeureDigits(normalizeHeureDigits(row.HEURE));
    setHeureDraftDigits(initialDigits);
    heureInitialDraftRef.current = '';
    setRowModifiedFlag(row.RECLEUNIK, false);
    setEditingHeureRowId((current) => (current === row.RECLEUNIK ? null : current));
  };

  const updateScoreDraft = (rowId: string | number, patch: Partial<ScoreDraft>): void => {
    setScoreDraft((prev) => {
      const next = { ...prev, ...patch };
      // Any keystroke counts as a modification, even if the resulting value is unchanged.
      setRowModifiedFlag(rowId, true);
      return next;
    });
  };

  const updateHeureDraft = (rowId: string | number, digits: string): void => {
    setHeureDraftDigits(digits);
    setRowModifiedFlag(rowId, digits !== heureInitialDraftRef.current);
  };

  const startStatusEdit = (row: CalendrierRow): void => {
    setSelectedRowId(row.RECLEUNIK);
    setEditingScoreRowId(null);
    setEditingHeureRowId(null);
    setEditingStatusRowId(row.RECLEUNIK);
    const initialValue = Number(row.ETAT);
    statusInitialValueRef.current = initialValue;
    setStatusDraft(initialValue);
    setRowModifiedFlag(row.RECLEUNIK, false);
  };

  const updateStatusDraft = (rowId: string | number, nextValue: number): void => {
    setStatusDraft(nextValue);
    setRowModifiedFlag(rowId, nextValue !== statusInitialValueRef.current);
  };

  const cancelStatusEdit = (row: CalendrierRow): void => {
    setStatusDraft(Number(row.ETAT));
    statusInitialValueRef.current = null;
    setRowModifiedFlag(row.RECLEUNIK, false);
    setEditingStatusRowId((current) => (current === row.RECLEUNIK ? null : current));
  };

  const commitStatusEdit = async (row: CalendrierRow, nextValue?: number): Promise<boolean> => {
    const rowId = row.RECLEUNIK;
    if (editingStatusRowId !== rowId) return false;
    if (savingScoreRowIdRef.current === rowId) return false;

    const effectiveStatus = typeof nextValue === 'number' ? nextValue : statusDraft;
    const isModified = effectiveStatus !== Number(row.ETAT);

    if (!isModified) {
      statusInitialValueRef.current = null;
      setRowModifiedFlag(rowId, false);
      setEditingStatusRowId((current) => (current === rowId ? null : current));
      return true;
    }

    savingScoreRowIdRef.current = rowId;
    setRowStatusWithAutoHide(rowId, 'saving');

    try {
      await updateCalendarStatus(rowId, { ETAT: effectiveStatus });
      setRows((prev) => prev.map((item) => (
        item.RECLEUNIK === rowId
          ? { ...item, ETAT: effectiveStatus }
          : item
      )));
      if (activeTourId != null && Number(row.TUCLEUNIK) === activeTourId) {
        classementCardRef.current?.refresh();
      }
      setRowStatusWithAutoHide(rowId, 'saved');
      return true;
    } catch {
      setError('Impossible d\'enregistrer le statut.');
      setRowStatusWithAutoHide(rowId, 'failed');
      return false;
    } finally {
      savingScoreRowIdRef.current = null;
      statusInitialValueRef.current = null;
      setRowModifiedFlag(rowId, false);
      setEditingStatusRowId((current) => (current === rowId ? null : current));
    }
  };

  const commitHeureEdit = async (row: CalendrierRow): Promise<boolean> => {
    const rowId = row.RECLEUNIK;
    if (editingHeureRowId !== rowId) return false;
    if (savingScoreRowIdRef.current === rowId) return false;
    if (!isValidHeureDigits(heureDraftDigits)) return false;

    if (!(rowModifiedRef.current[String(rowId)] ?? rowModified[String(rowId)] ?? false)) {
      setEditingHeureRowId((current) => (current === rowId ? null : current));
      heureInitialDraftRef.current = '';
      return true;
    }

    savingScoreRowIdRef.current = rowId;
    const heureValue = heureDigitsToApiValue(heureDraftDigits);
    if (!heureValue) {
      savingScoreRowIdRef.current = null;
      return false;
    }

    setRowStatusWithAutoHide(rowId, 'saving');

    try {
      await updateCalendarHeure(rowId, { HEURE: heureValue });
      setRows((prev) => prev.map((item) => (
        item.RECLEUNIK === rowId
          ? { ...item, HEURE: heureValue }
          : item
      )));
      setRowStatusWithAutoHide(rowId, 'saved');
      return true;
    } catch {
      setError('Impossible d\'enregistrer l\'heure.');
      setRowStatusWithAutoHide(rowId, 'failed');
      return false;
    } finally {
      savingScoreRowIdRef.current = null;
      heureInitialDraftRef.current = '';
      setRowModifiedFlag(rowId, false);
      setEditingHeureRowId((current) => (current === rowId ? null : current));
    }
  };

  const moveHeureEditToAdjacentRow = async (row: CalendrierRow, direction: 'up' | 'down'): Promise<void> => {
    const currentIndex = orderedRows.findIndex((item) => item.RECLEUNIK === row.RECLEUNIK);
    if (currentIndex < 0) {
      return;
    }
    if (!isValidHeureDigits(heureDraftDigits)) {
      return;
    }

    await commitHeureEdit(row);

    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= orderedRows.length) {
      return;
    }

    const nextRow = orderedRows[nextIndex];
    startHeureEdit(nextRow);
  };

  const commitScoreEdit = async (row: CalendrierRow): Promise<boolean> => {
    const rowId = row.RECLEUNIK;
    if (editingScoreRowId !== rowId) return false;
    if (savingScoreRowIdRef.current === rowId) return false;
    if (!canEditScore(Number(row.ETAT))) {
      scoreInitialDraftRef.current = null;
      setEditingScoreRowId((current) => (current === rowId ? null : current));
      return false;
    }

    if (!(rowModifiedRef.current[String(rowId)] ?? rowModified[String(rowId)] ?? false)) {
      scoreInitialDraftRef.current = null;
      setEditingScoreRowId((current) => (current === rowId ? null : current));
      return true;
    }

    savingScoreRowIdRef.current = rowId;
    const payload = {
      TABDOM: parseScoreInputValue(scoreDraft.tabDom),
      BUTDOM: parseScoreInputValue(scoreDraft.butDom),
      BUTEXT: parseScoreInputValue(scoreDraft.butExt),
      TABEXT: parseScoreInputValue(scoreDraft.tabExt),
    } as {
      TABDOM: number;
      BUTDOM: number;
      BUTEXT: number;
      TABEXT: number;
      ETAT?: number;
    };

    const nextStatus = getStatusAfterScoreEdit(row);
    if (nextStatus !== Number(row.ETAT)) {
      payload.ETAT = nextStatus;
    }

    setRowStatusWithAutoHide(rowId, 'saving');

    try {
      await updateCalendarScore(rowId, payload);
      setRows((prev) => prev.map((item) => (
        item.RECLEUNIK === rowId
          ? {
              ...item,
              TABDOM: payload.TABDOM,
              BUTDOM: payload.BUTDOM,
              BUTEXT: payload.BUTEXT,
              TABEXT: payload.TABEXT,
              ETAT: payload.ETAT ?? item.ETAT,
            }
          : item
      )));
      if (activeTourId != null && Number(row.TUCLEUNIK) === activeTourId) {
        classementCardRef.current?.refresh();
      }
      setRowStatusWithAutoHide(rowId, 'saved');
      return true;
    } catch {
      setError('Impossible d\'enregistrer le score.');
      setRowStatusWithAutoHide(rowId, 'failed');
      return false;
    } finally {
      savingScoreRowIdRef.current = null;
      scoreInitialDraftRef.current = null;
      setRowModifiedFlag(rowId, false);
      setEditingScoreRowId((current) => (current === rowId ? null : current));
    }
  };

  const moveScoreEditToAdjacentRow = async (row: CalendrierRow, direction: 'up' | 'down'): Promise<void> => {
    const currentIndex = orderedRows.findIndex((item) => item.RECLEUNIK === row.RECLEUNIK);
    if (currentIndex < 0) {
      return;
    }

    await commitScoreEdit(row);

    const step = direction === 'up' ? -1 : 1;
    for (let index = currentIndex + step; index >= 0 && index < orderedRows.length; index += step) {
      const nextRow = orderedRows[index];
      if (!canEditScore(Number(nextRow.ETAT))) {
        continue;
      }
      startScoreEdit(nextRow);
      return;
    }
  };

  const findLatestOrderedRowById = (rowId: string | number): CalendrierRow | undefined => {
    return orderedRowsRef.current.find((item) => String(item.RECLEUNIK) === String(rowId));
  };

  const openFieldForRowId = (rowId: string | number, field: 'status' | 'heure' | 'score'): void => {
    window.requestAnimationFrame(() => {
      const latestRow = findLatestOrderedRowById(rowId);
      if (!latestRow) {
        return;
      }

      if (field === 'status') {
        startStatusEdit(latestRow);
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

  const handleStatusTabOut = async (row: CalendrierRow, direction: 'next' | 'prev') => {
    const rowId = row.RECLEUNIK;
    const committed = await commitStatusEdit(row);
    if (!committed) {
      return;
    }

    if (direction === 'next') {
      openFieldForRowId(rowId, 'heure');
      return;
    }

    openFieldForRowId(rowId, 'score');
  };

  const handleHeureTabOut = async (row: CalendrierRow, direction: 'next' | 'prev') => {
    const rowId = row.RECLEUNIK;
    const committed = await commitHeureEdit(row);
    if (!committed) {
      return;
    }

    if (direction === 'next') {
      openFieldForRowId(rowId, 'score');
      return;
    }

    openFieldForRowId(rowId, 'status');
  };

  const handleScoreTabOut = async (row: CalendrierRow, direction: 'next' | 'prev') => {
    const rowId = row.RECLEUNIK;
    const committed = await commitScoreEdit(row);
    if (!committed) {
      return;
    }

    if (direction === 'next') {
      openFieldForRowId(rowId, 'status');
      return;
    }

    openFieldForRowId(rowId, 'heure');
  };

  const gridHandlers = useLatestHandlers({
    startStatusEdit,
    updateStatusDraft,
    commitStatusEdit,
    cancelStatusEdit,
    handleStatusTabOut,
    startHeureEdit,
    updateHeureDraft,
    commitHeureEdit,
    cancelHeureEdit,
    moveHeureEditToAdjacentRow,
    handleHeureTabOut,
    startScoreEdit,
    updateScoreDraft,
    setRowModifiedFlag,
    commitScoreEdit,
    cancelScoreEdit,
    moveScoreEditToAdjacentRow,
    handleScoreTabOut,
  });

  const columns = useMemo<GridColDef<CalendrierRow>[]>(() => buildMatchGridColumns({
    status: readOnly ? { mode: 'readonly' } : {
      editingRowId: editingStatusRowId,
      draftValue: statusDraft,
      onStartEdit: gridHandlers.startStatusEdit,
      onDraftChange: (row, nextValue) => gridHandlers.updateStatusDraft(row.RECLEUNIK, nextValue),
      onCommit: gridHandlers.commitStatusEdit,
      onCancel: gridHandlers.cancelStatusEdit,
      onTabOut: gridHandlers.handleStatusTabOut,
      sortable: true,
    },
    heure: readOnly ? { mode: 'readonly' } : {
      editingRowId: editingHeureRowId,
      draftDigits: heureDraftDigits,
      onStartEdit: gridHandlers.startHeureEdit,
      onDraftChange: (row, digits) => gridHandlers.updateHeureDraft(row.RECLEUNIK, digits),
      onCommit: gridHandlers.commitHeureEdit,
      onCancel: gridHandlers.cancelHeureEdit,
      onMoveVertical: gridHandlers.moveHeureEditToAdjacentRow,
      onTabOut: gridHandlers.handleHeureTabOut,
      sortable: true,
    },
    score: readOnly ? { mode: 'readonly' } : {
      editingRowId: editingScoreRowId,
      draft: scoreDraft,
      canEdit: (row) => canEditScore(Number(row.ETAT)),
      onStartEdit: gridHandlers.startScoreEdit,
      onDraftChange: (row, patch) => gridHandlers.updateScoreDraft(row.RECLEUNIK, patch),
      onUserInput: (row) => gridHandlers.setRowModifiedFlag(row.RECLEUNIK, true),
      onCommit: gridHandlers.commitScoreEdit,
      onCancel: gridHandlers.cancelScoreEdit,
      onMoveVertical: gridHandlers.moveScoreEditToAdjacentRow,
      onTabOut: gridHandlers.handleScoreTabOut,
    },
    isDomicileWinner: (row) => isEliminatoryMatchWinner(row, 'domicile'),
    isExterieurWinner: (row) => isEliminatoryMatchWinner(row, 'exterieur'),
    onClubClick: openClub,
  }), [editingHeureRowId, editingScoreRowId, editingStatusRowId, gridHandlers, heureDraftDigits, isEliminatoryMatchWinner, openClub, readOnly, scoreDraft, statusDraft]);

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
        <Box
          sx={{
            ml: 'auto',
            flex: 1,
            minWidth: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <CalendarDateNavigator date={date} onDateChange={setDate} />
        </Box>

          {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}

            <Box sx={{ mt: 2, height: compactMatchListHeight, minHeight: 150 }}>
            <MatchDataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              rowSaveStatusMap={rowSaveStatus}
              sortModel={sortModel}
              onSortModelChange={(model) => setSortModel(model)}
              getRowId={(row) => row.RECLEUNIK}
              getRowClassName={(params) => {
                const statusClass = rowStatusClass(Number(params.row.ETAT));
                const isSelected = String(params.row.RECLEUNIK) === String(selectedRowId ?? '');
                return isSelected ? `${statusClass} selected-calendar-row` : statusClass;
              }}
              disableRowSelectionOnClick
              onRowClick={(params) => {
                setSelectedRowId(params.row.RECLEUNIK);
              }}
              openMatchOnDoubleClick={!readOnly}
              onRowDoubleClick={readOnly ? (params) => {
                navigate(`/rencontres/${encodeURIComponent(String(params.row.RECLEUNIK))}`);
              } : undefined}
              disableColumnMenu
              density="compact"
              pageSizeOptions={[25, 50, 100]}
              isDefaultHeureSort={isDefaultHeureSort}
              initialScrollRight={readOnly}
            />
          </Box>
        </CardContent>
      </Card>

      {displayedActiveTourId !== null ? (
        <TourClassementCard
          ref={classementCardRef}
          tourId={displayedActiveTourId}
          publicMode={readOnly}
          matchForGroup={selectedRow}
          title={classementBlockLabel || 'Classement du tour'}
          onOpenClub={openClub}
          actions={
            <>
              <Tooltip title="Ouvrir la fiche de la compétition">
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={openCompetitionTab}
                    disabled={competitionId <= 0}
                    aria-label="Ouvrir la fiche de la compétition"
                  >
                    <EmojiEventsRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Ouvrir le site de la compétition">
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={openCompetitionWeb}
                    disabled={!canOpenCompetitionWeb}
                    aria-label="Ouvrir le site de la compétition"
                  >
                    <OpenInNewRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          }
        />
      ) : null}
    </Stack>
  );
}