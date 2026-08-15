import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import TodayRoundedIcon from '@mui/icons-material/TodayRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import {
  Alert,
  Box,
  Card,
  CardContent,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { type GridColDef, type GridSortModel } from '@mui/x-data-grid';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DateInputField, fromInputDateToDisplay, toInputDateFromDisplay } from '../../components/DateInputField';
import { MatchDataGrid } from '../../components/MatchDataGrid';
import { buildMatchGridColumns } from '../../components/matchGridColumns';
import { useEntityImage } from '../../lib/useEntityImage';
import {
  fetchCalendarByDate,
  fetchTourClassement,
  fetchTourQualifs,
  updateCalendarHeure,
  updateCalendarScore,
  updateCalendarStatus,
} from './calendrierApi';
import {
  heureDigitsToApiValue,
  isValidHeureDigits,
  normalizeHeureDigits,
  sanitizeHeureDigits,
} from './HeureCell';
import type { ScoreDraft } from './ScoreCell';
import type { CalendrierRow, TourClassementRow, TourQualifRow } from './types';

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

function formatInputDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getInitialCalendrierDate(): string {
  const fallback = formatInputDate(new Date());
  if (typeof window === 'undefined') {
    return fallback;
  }

  const stored = window.sessionStorage.getItem(CALENDRIER_DATE_STORAGE_KEY) ?? '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(stored)) {
    return stored;
  }
  return fallback;
}

function shiftDate(date: string, deltaDays: number): string {
  const [year, month, day] = date.split('-').map((part) => Number(part));
  const base = new Date(year, month - 1, day);
  base.setDate(base.getDate() + deltaDays);
  return formatInputDate(base);
}

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

function ClassementClubCell({
  clubId,
  clubName,
  lockedQualifAbrege,
  lockedQualifLibelle,
  lockedQualifCouleur,
}: {
  clubId: string;
  clubName: string;
  lockedQualifAbrege?: string | null;
  lockedQualifLibelle?: string | null;
  lockedQualifCouleur?: number | null;
}) {
  const { src } = useEntityImage('club', clubId);
  const lockedLabel = String(lockedQualifLibelle ?? '').trim();
  const lockedAbrege = String(lockedQualifAbrege ?? '').trim();
  const lockedColor = qualifColorToCss(lockedQualifCouleur);
  const pill = lockedAbrege ? (
    <Tooltip title={`Verrouillé : ${lockedLabel || lockedAbrege}`}>
      <Box
        component="span"
        sx={{
          ml: 0.3,
          px: 0.25,
          minWidth: 14,
          height: 14,
          borderRadius: 10,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: lockedColor,
          color: '#fff',
          fontSize: '0.5rem',
          fontWeight: 700,
          lineHeight: 1,
          flexShrink: 0,
          position: 'relative',
          top: '-0.35em',
        }}
      >
        {lockedAbrege}
      </Box>
    </Tooltip>
  ) : null;

  return (
    <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', minWidth: 0 }}>
      <Box
        sx={{
          width: 18,
          height: 18,
          minWidth: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mr: 0.75,
          flexShrink: 0,
        }}
      >
        {src ? (
          <Box
            component="img"
            src={src}
            alt={clubName}
            sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        ) : (
          <ShieldOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
        )}
      </Box>
      <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
        {clubName}
      </Box>
      {pill}
    </Box>
  );
}

function normalizeGroupName(value: unknown): string {
  return String(value ?? '').trim();
}

function qualifColorToCss(value: unknown): string {
  const color = Number(value);
  if (!Number.isInteger(color) || color < 0 || color > 0xFFFFFF) {
    return '#64748b';
  }
  const red = color & 0xFF;
  const green = (color >> 8) & 0xFF;
  const blue = (color >> 16) & 0xFF;
  return `rgb(${red}, ${green}, ${blue})`;
}

function hasMultipleGroups(rows: TourClassementRow[]): boolean {
  const groups = new Set(
    rows
      .map((row) => normalizeGroupName(row.GROUPE))
      .filter((group) => group.length > 0),
  );
  return groups.size > 1;
}

function resolveMatchGroup(rows: TourClassementRow[], match: CalendrierRow | null): string | null {
  if (!match) return null;
  const domId = String(match.DOMICILE ?? '').trim();
  const extId = String(match.EXTERIEUR ?? '').trim();

  const domGroup = normalizeGroupName(rows.find((row) => String(row.IDCLUB ?? '').trim() === domId)?.GROUPE);
  const extGroup = normalizeGroupName(rows.find((row) => String(row.IDCLUB ?? '').trim() === extId)?.GROUPE);

  if (domGroup && extGroup && domGroup === extGroup) return domGroup;
  if (domGroup) return domGroup;
  if (extGroup) return extGroup;
  return null;
}

function isProgrammedUnresolvedSide(sourceValue: unknown, clubIdValue: unknown): boolean {
  const source = String(sourceValue ?? '').trim();
  const clubId = String(clubIdValue ?? '').trim();
  return source.length > 0 && clubId.length === 0;
}

export function CalendrierPage() {
  const [date, setDate] = useState<string>(() => getInitialCalendrierDate());
  const [dateDraft, setDateDraft] = useState<string>(() => fromInputDateToDisplay(getInitialCalendrierDate()));
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
  const [classementRows, setClassementRows] = useState<TourClassementRow[]>([]);
  const [classementQualifRows, setClassementQualifRows] = useState<TourQualifRow[]>([]);
  const [classementLoading, setClassementLoading] = useState(false);
  const [classementTourId, setClassementTourId] = useState<number | null>(null);
  const [classementGroup, setClassementGroup] = useState<string | null>(null);
  const savingScoreRowIdRef = useRef<string | number | null>(null);
  const savedIconTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const classementCacheRef = useRef<Map<number, TourClassementRow[]>>(new Map());
  const classementQualifCacheRef = useRef<Map<number, TourQualifRow[]>>(new Map());
  const classementRequestTokenRef = useRef(0);
  const scoreInitialDraftRef = useRef<ScoreDraft | null>(null);
  const heureInitialDraftRef = useRef<string>('');
  const statusInitialValueRef = useRef<number | null>(null);
  const previousTourGroupRef = useRef<{ tourId: number | null; group: string | null }>({ tourId: null, group: null });

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
  const classementHasMultipleGroups = useMemo(() => hasMultipleGroups(classementRows), [classementRows]);
  const selectedMatchGroup = useMemo(
    () => resolveMatchGroup(classementRows, selectedRow),
    [classementRows, selectedRow],
  );
  const classementBlockLabel = useMemo(
    () => buildClassementBlockLabel(selectedRow),
    [selectedRow],
  );
  const displayedClassementRows = useMemo(() => {
    if (!classementHasMultipleGroups || !classementGroup) {
      return classementRows;
    }
    return classementRows.filter((row) => normalizeGroupName(row.GROUPE) === classementGroup);
  }, [classementHasMultipleGroups, classementGroup, classementRows]);
  const classementGridHeight = useMemo(() => {
    const visibleRows = Math.max(displayedClassementRows.length, 1);
    const headerHeight = 56;
    const compactRowHeight = 36;
    const verticalPadding = 8;
    return Math.max(120, headerHeight + (visibleRows * compactRowHeight) + verticalPadding);
  }, [displayedClassementRows.length]);
  const useRatioGoalAverage = useMemo(
    () => Number(classementRows[0]?.TDCalculDiffBut ?? 1) === 2,
    [classementRows],
  );

  const isEliminatoryMatchWinner = useCallback((row: CalendrierRow, side: 'domicile' | 'exterieur'): boolean => {
    if (Number(row.TYPE_TOUR ?? 0) !== 2 || Number(row.TUCLEUNIK) !== Number(classementTourId ?? 0)) {
      return false;
    }

    const group = resolveMatchGroup(classementRows, row);
    const candidates = classementRows.filter((candidate) => (
      !group || normalizeGroupName(candidate.GROUPE) === group
    ));
    const winners = candidates.filter((candidate) => Number(candidate.PAClassement ?? 0) === 1);
    if (winners.length !== 1) {
      return false;
    }

    const clubId = side === 'domicile' ? row.DOMICILE : row.EXTERIEUR;
    return String(clubId ?? '').trim() !== ''
      && String(winners[0]?.IDCLUB ?? '').trim() === String(clubId).trim();
  }, [classementRows, classementTourId]);
  const competitionId = Number(selectedRow?.COCLEUNIK ?? 0);
  const competitionWebUrl = String(selectedRow?.CO_WEB ?? '').trim();
  const canOpenCompetitionWeb = useMemo(() => {
    if (!competitionWebUrl) {
      return false;
    }
    try {
      const url = new URL(competitionWebUrl);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }, [competitionWebUrl]);

  const openCompetitionTab = () => {
    if (!Number.isInteger(competitionId) || competitionId <= 0) {
      return;
    }
    window.dispatchEvent(new CustomEvent('supporter:tab-open', {
      detail: {
        path: `/admin/competitions/${encodeURIComponent(String(competitionId))}`,
        label: `${String(selectedRow?.COMPET_NOM ?? '').trim()} ${String(selectedRow?.SAISON ?? '').trim()}`.trim() || 'Competition',
        unique: true,
        uniqueByPath: true,
      },
    }));
  };

  const openCompetitionWeb = () => {
    if (!canOpenCompetitionWeb) {
      return;
    }
    window.open(competitionWebUrl, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void fetchCalendarByDate(date, controller.signal)
      .then((data) => setRows(data))
      .catch((err: unknown) => {
        if ((err as { code?: string })?.code === 'ERR_CANCELED') return;
        setError('Impossible de charger le calendrier.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [date]);

  const loadClassementForTour = useCallback(async (tourId: number, force = false) => {
    if (!Number.isInteger(tourId) || tourId <= 0) {
      setClassementRows([]);
      setClassementQualifRows([]);
      setClassementTourId(null);
      return;
    }

    if (!force) {
      const cached = classementCacheRef.current.get(tourId);
      if (cached) {
        setClassementRows(cached);
        setClassementQualifRows(classementQualifCacheRef.current.get(tourId) ?? []);
        setClassementTourId(tourId);
        return;
      }
    }

    const token = ++classementRequestTokenRef.current;
    setClassementLoading(true);
    try {
      const [data, qualifs] = await Promise.all([
        fetchTourClassement(tourId),
        fetchTourQualifs(tourId),
      ]);
      if (token !== classementRequestTokenRef.current) {
        return;
      }
      classementCacheRef.current.set(tourId, data);
      classementQualifCacheRef.current.set(tourId, qualifs);
      setClassementRows(data);
      setClassementQualifRows(qualifs);
      setClassementTourId(tourId);
    } catch {
      if (token !== classementRequestTokenRef.current) {
        return;
      }
      setError('Impossible de charger le classement du tour.');
      setClassementRows([]);
      setClassementQualifRows([]);
      setClassementTourId(null);
    } finally {
      if (token === classementRequestTokenRef.current) {
        setClassementLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedRowId(null);
      setClassementRows([]);
      setClassementQualifRows([]);
      setClassementTourId(null);
      return;
    }

    const currentExists = rows.some((row) => String(row.RECLEUNIK) === String(selectedRowId ?? ''));
    if (!currentExists) {
      setSelectedRowId(rows[0].RECLEUNIK);
    }
  }, [rows, selectedRowId]);

  useEffect(() => {
    if (isSelectedProgrammedEncounter) {
      setClassementRows([]);
      setClassementQualifRows([]);
      setClassementTourId(null);
      setClassementGroup(null);
      return;
    }

    if (activeTourId == null) {
      setClassementRows([]);
      setClassementQualifRows([]);
      setClassementTourId(null);
      setClassementGroup(null);
      return;
    }

    void loadClassementForTour(activeTourId, false);
  }, [activeTourId, isSelectedProgrammedEncounter, loadClassementForTour]);

  useEffect(() => {
    if (isSelectedProgrammedEncounter) {
      previousTourGroupRef.current = { tourId: activeTourId, group: null };
      setClassementGroup(null);
      return;
    }

    if (activeTourId == null) {
      previousTourGroupRef.current = { tourId: null, group: null };
      setClassementGroup(null);
      return;
    }

    const nextGroup = classementHasMultipleGroups ? selectedMatchGroup : null;
    setClassementGroup(nextGroup);

    const previous = previousTourGroupRef.current;
    const sameTour = previous.tourId === activeTourId;
    const groupChanged = previous.group !== nextGroup;

    previousTourGroupRef.current = { tourId: activeTourId, group: nextGroup };

    if (sameTour && groupChanged && nextGroup) {
      void loadClassementForTour(activeTourId, true);
    }
  }, [activeTourId, classementHasMultipleGroups, isSelectedProgrammedEncounter, selectedMatchGroup, loadClassementForTour]);

  useEffect(() => () => {
    Object.values(savedIconTimersRef.current).forEach((timer) => clearTimeout(timer));
    savedIconTimersRef.current = {};
  }, []);

  useEffect(() => {
    setDateDraft(fromInputDateToDisplay(date));
  }, [date]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.sessionStorage.setItem(CALENDRIER_DATE_STORAGE_KEY, date);
  }, [date]);

  const handleDateDraftChange = useCallback((nextDate: string) => {
    setDateDraft(nextDate);
    const isoDate = toInputDateFromDisplay(nextDate);
    if (isoDate) {
      setDate(isoDate);
    }
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
        void loadClassementForTour(activeTourId, true);
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
        void loadClassementForTour(activeTourId, true);
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

  const columns = useMemo<GridColDef<CalendrierRow>[]>(() => buildMatchGridColumns({
    status: {
      editingRowId: editingStatusRowId,
      draftValue: statusDraft,
      onStartEdit: startStatusEdit,
      onDraftChange: (row, nextValue) => updateStatusDraft(row.RECLEUNIK, nextValue),
      onCommit: commitStatusEdit,
      onCancel: cancelStatusEdit,
      onTabOut: handleStatusTabOut,
      sortable: true,
    },
    heure: {
      editingRowId: editingHeureRowId,
      draftDigits: heureDraftDigits,
      onStartEdit: startHeureEdit,
      onDraftChange: (row, digits) => updateHeureDraft(row.RECLEUNIK, digits),
      onCommit: commitHeureEdit,
      onCancel: cancelHeureEdit,
      onMoveVertical: moveHeureEditToAdjacentRow,
      onTabOut: handleHeureTabOut,
      sortable: true,
    },
    score: {
      editingRowId: editingScoreRowId,
      draft: scoreDraft,
      canEdit: (row) => canEditScore(Number(row.ETAT)),
      onStartEdit: startScoreEdit,
      onDraftChange: (row, patch) => updateScoreDraft(row.RECLEUNIK, patch),
      onUserInput: (row) => setRowModifiedFlag(row.RECLEUNIK, true),
      onCommit: commitScoreEdit,
      onCancel: cancelScoreEdit,
      onMoveVertical: moveScoreEditToAdjacentRow,
      onTabOut: handleScoreTabOut,
    },
    isDomicileWinner: (row) => isEliminatoryMatchWinner(row, 'domicile'),
    isExterieurWinner: (row) => isEliminatoryMatchWinner(row, 'exterieur'),
  }), [editingHeureRowId, editingScoreRowId, editingStatusRowId, heureDraftDigits, isEliminatoryMatchWinner, scoreDraft, statusDraft]);

  const classementColumns = useMemo<GridColDef<TourClassementRow>[]>(() => {
    const columns: GridColDef<TourClassementRow>[] = [
    {
      field: 'PAClassement',
      headerName: '#',
      width: 50,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row) => Number(row.PAClassement ?? 0),
      renderCell: (params) => {
        const rank = Number(params.row.PAClassement ?? 0);
        const qualif = classementQualifRows.find((row) => (
          rank >= Number(row.CLASS_MinRang ?? 0)
          && rank <= Number(row.CLASS_MaxRang ?? 0)
        ));
        const label = String(qualif?.CLASS_Libelle ?? '').trim();
        const rankCircle = (
          <Box
            component="span"
            sx={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: qualif ? '2px solid' : 'none',
              borderColor: qualif ? qualifColorToCss(qualif.CLASS_Couleur) : 'transparent',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {rank}
          </Box>
        );
        return label ? <Tooltip title={label}>{rankCircle}</Tooltip> : rankCircle;
      },
    },
    {
      field: 'CLUB',
      headerName: 'Club',
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (
        <ClassementClubCell
          clubId={String(params.row.IDCLUB ?? '')}
          clubName={String(params.row.CLUB ?? '')}
          lockedQualifAbrege={params.row.LOCKED_QUALIF_ABREGE}
          lockedQualifLibelle={params.row.LOCKED_QUALIF_LIBELLE}
          lockedQualifCouleur={params.row.LOCKED_QUALIF_COULEUR}
        />
      ),
    },
    {
      field: 'PANbPoints',
      headerName: 'Pts',
      width: 56,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row) => Number(row.PANbPoints ?? 0),
    },
    {
      field: 'PANbMatch',
      headerName: 'J',
      width: 48,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row) => Number(row.PANbMatch ?? 0),
    },
    {
      field: 'PANbV',
      headerName: 'V',
      width: 48,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row) => Number(row.PANbVD ?? 0) + Number(row.PANbVE ?? 0),
    },
    {
      field: 'PANbN',
      headerName: 'N',
      width: 48,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row) => Number(row.PANbND ?? 0) + Number(row.PANbNE ?? 0),
    },
    {
      field: 'PANbD',
      headerName: 'D',
      width: 48,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row) => Number(row.PANbDD ?? 0) + Number(row.PANbDE ?? 0),
    },
    {
      field: 'PANbBP',
      headerName: 'BP',
      width: 52,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row) => Number(row.PANbBP ?? 0),
    },
    {
      field: 'PANbBC',
      headerName: 'BC',
      width: 52,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row) => Number(row.PANbBC ?? 0),
    },
    {
      field: 'PADiff',
      headerName: 'Diff',
      width: 56,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row) => Number(row.PADiff ?? 0),
      valueFormatter: (value) => {
        const numeric = Number(value ?? 0);
        if (!Number.isFinite(numeric)) return '0';
        if (numeric > 0) return `+${numeric}`;
        return String(numeric);
      },
    },
    {
      field: 'PARatio',
      headerName: 'Ratio',
      width: 64,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row) => Number(row.PARatio ?? 0),
      valueFormatter: (value) => {
        const numeric = Number(value ?? 0);
        if (!Number.isFinite(numeric)) return '0';
        return numeric.toFixed(2);
      },
    },
  ];

    return columns.filter((column) => {
      if (column.field === 'PADiff') return !useRatioGoalAverage;
      if (column.field === 'PARatio') return useRatioGoalAverage;
      return true;
    });
  }, [classementQualifRows, useRatioGoalAverage]);

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', width: '100%', flexWrap: 'nowrap' }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>Calendrier</Typography>

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '1px', flexWrap: 'nowrap' }}>
            <IconButton
              color="primary"
              aria-label="Précédent"
              onClick={() => setDate((current) => shiftDate(current, -1))}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flex: '0 0 auto' }}
            >
              <ChevronLeftRoundedIcon />
            </IconButton>

            <DateInputField
              label="Date"
              value={dateDraft}
              onChange={handleDateDraftChange}
              calendarAriaLabel="Calendrier"
              sx={{ width: { xs: 162, sm: 162 }, minWidth: 162, maxWidth: 162, flex: '0 0 auto' }}
            />

            <IconButton
              color="primary"
              aria-label="Aujourd'hui"
              onClick={() => setDate(formatInputDate(new Date()))}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flex: '0 0 auto' }}
            >
              <TodayRoundedIcon sx={{ fontSize: 18 }} />
            </IconButton>

            <IconButton
              color="primary"
              aria-label="Suivant"
              onClick={() => setDate((current) => shiftDate(current, 1))}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flex: '0 0 auto' }}
            >
              <ChevronRightRoundedIcon />
            </IconButton>
          </Box>
        </Box>
      </Stack>

      <Card>
        <CardContent>
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
              openMatchOnDoubleClick
              disableColumnMenu
              density="compact"
              pageSizeOptions={[25, 50, 100]}
              isDefaultHeureSort={isDefaultHeureSort}
            />
          </Box>
        </CardContent>
      </Card>

      {!isSelectedProgrammedEncounter && activeTourId !== null ? (
        <Card>
          <CardContent>
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {activeTourId == null
                    ? 'Sélectionnez un match dans la liste du calendrier pour afficher le classement.'
                    : `${classementBlockLabel || 'Classement du tour'}${classementTourId === activeTourId ? '' : ' - chargement...'}`}
                </Typography>
                <Stack direction="row" spacing={0.25}>
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
                </Stack>
              </Stack>

              <Box sx={{ height: classementGridHeight, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <MatchDataGrid
                  rows={displayedClassementRows}
                  columns={classementColumns}
                  loading={classementLoading}
                  getRowId={(row) => row.PACLEUNIK}
                  disableColumnMenu
                  disableRowSelectionOnClick
                  hideFooter
                  density="compact"
                  sx={{ width: '100%' }}
                />
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}