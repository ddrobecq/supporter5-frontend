import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import TodayRoundedIcon from '@mui/icons-material/TodayRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import {
  Alert,
  Box,
  Card,
  CardContent,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridSortModel } from '@mui/x-data-grid';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateInputField, fromInputDateToDisplay, toInputDateFromDisplay } from '../../components/DateInputField';
import { useEntityImage } from '../../lib/useEntityImage';
import {
  fetchCalendarByDate,
  fetchTourClassement,
  updateCalendarHeure,
  updateCalendarScore,
  updateCalendarStatus,
} from './calendrierApi';
import {
  HeureCell,
  heureDigitsToApiValue,
  isValidHeureDigits,
  normalizeHeureDigits,
} from './HeureCell';
import { ScoreCell, type ScoreDraft } from './ScoreCell';
import { StatusCell } from './StatusCell';
import type { CalendrierRow, TourClassementRow } from './types';

const DEFAULT_SORT_MODEL: GridSortModel = [{ field: 'HEURE', sort: 'asc' }];
const CALENDRIER_DATE_STORAGE_KEY = 'supporter:calendrier:selected-date';

type RowSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

type StatusAnchor = {
  rowId: string;
  status: Exclude<RowSaveStatus, 'idle'>;
  top: number;
};

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

function ClubCell({
  clubId,
  clubName,
  alignRight = false,
  italic = false,
}: {
  clubId: string;
  clubName: string;
  alignRight?: boolean;
  italic?: boolean;
}) {
  const { src } = useEntityImage('club', clubId);

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: alignRight ? 'flex-end' : 'flex-start' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        {alignRight ? (
          <>
            <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', fontStyle: italic ? 'italic' : 'normal' }}>{clubName}</Box>
            <Box
              sx={{
                width: 22,
                height: 22,
                minWidth: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {src ? (
                <Box
                  component="img"
                  src={src}
                  alt={clubName}
                  sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', fontStyle: italic ? 'italic' : 'normal' }}
                />
              ) : (
                <ShieldOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              )}
            </Box>
          </>
        ) : (
          <>
            <Box
              sx={{
                width: 22,
                height: 22,
                minWidth: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
                <ShieldOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              )}
            </Box>
            <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: italic ? 'italic' : 'normal' }}>{clubName}</Box>
          </>
        )}
      </Stack>
    </Box>
  );
}

function ClassementClubCell({
  clubId,
  clubName,
}: {
  clubId: string;
  clubName: string;
}) {
  const { src } = useEntityImage('club', clubId);

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
    </Box>
  );
}

function normalizeGroupName(value: unknown): string {
  return String(value ?? '').trim();
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
  const navigate = useNavigate();
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
  const [sortModel, setSortModel] = useState(DEFAULT_SORT_MODEL);
  const [selectedRowId, setSelectedRowId] = useState<string | number | null>(null);
  const [classementRows, setClassementRows] = useState<TourClassementRow[]>([]);
  const [classementLoading, setClassementLoading] = useState(false);
  const [classementTourId, setClassementTourId] = useState<number | null>(null);
  const [classementGroup, setClassementGroup] = useState<string | null>(null);
  const savingScoreRowIdRef = useRef<string | number | null>(null);
  const savedIconTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const classementCacheRef = useRef<Map<number, TourClassementRow[]>>(new Map());
  const classementRequestTokenRef = useRef(0);
  const gridWrapperRef = useRef<HTMLDivElement | null>(null);
  const [statusAnchors, setStatusAnchors] = useState<StatusAnchor[]>([]);
  const scoreInitialDraftRef = useRef<ScoreDraft | null>(null);
  const heureInitialDraftRef = useRef<string>('');
  const statusInitialValueRef = useRef<number | null>(null);
  const previousTourGroupRef = useRef<{ tourId: number | null; group: string | null }>({ tourId: null, group: null });

  const isDefaultHeureSort =
    sortModel.length === 1 && sortModel[0].field === 'HEURE' && sortModel[0].sort === 'asc';

  const orderedRows = useMemo(() => getSortedRows(rows, sortModel), [rows, sortModel]);
  const isCompactMatchList = rows.length < 10;
  const compactMatchListHeight = useMemo(() => {
    const visibleRows = Math.max(rows.length, 1);
    // Approximate DataGrid chrome in compact density (header + footer + paddings).
    const estimatedGridChrome = 116;
    const estimatedRowHeight = 33;
    return Math.max(220, estimatedGridChrome + (visibleRows * estimatedRowHeight));
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
  const useRatioGoalAverage = useMemo(
    () => Number(classementRows[0]?.TDCalculDiffBut ?? 1) === 2,
    [classementRows],
  );

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
      setClassementTourId(null);
      return;
    }

    if (!force) {
      const cached = classementCacheRef.current.get(tourId);
      if (cached) {
        setClassementRows(cached);
        setClassementTourId(tourId);
        return;
      }
    }

    const token = ++classementRequestTokenRef.current;
    setClassementLoading(true);
    try {
      const data = await fetchTourClassement(tourId);
      if (token !== classementRequestTokenRef.current) {
        return;
      }
      classementCacheRef.current.set(tourId, data);
      setClassementRows(data);
      setClassementTourId(tourId);
    } catch {
      if (token !== classementRequestTokenRef.current) {
        return;
      }
      setError('Impossible de charger le classement du tour.');
      setClassementRows([]);
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
      setClassementTourId(null);
      setClassementGroup(null);
      return;
    }

    if (activeTourId == null) {
      setClassementRows([]);
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

  const updateStatusAnchors = useCallback(() => {
    const wrapper = gridWrapperRef.current;
    if (!wrapper) {
      setStatusAnchors([]);
      return;
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    const statusCells = wrapper.querySelectorAll<HTMLElement>('.MuiDataGrid-cell[data-field="ETAT"]');
    const nextAnchors: StatusAnchor[] = [];

    statusCells.forEach((cell) => {
      const rowId = cell.parentElement?.getAttribute('data-id') ?? '';
      if (!rowId) return;

      const status = rowSaveStatus[rowId] ?? 'idle';
      if (status === 'idle') return;

      const cellRect = cell.getBoundingClientRect();
      nextAnchors.push({
        rowId,
        status,
        top: cellRect.top - wrapperRect.top + (cellRect.height / 2),
      });
    });

    setStatusAnchors(nextAnchors);
  }, [rowSaveStatus]);

  useEffect(() => {
    const wrapper = gridWrapperRef.current;
    if (!wrapper) return;

    const refresh = () => {
      window.requestAnimationFrame(updateStatusAnchors);
    };

    const virtualScroller = wrapper.querySelector<HTMLElement>('.MuiDataGrid-virtualScroller');
    const renderZone = wrapper.querySelector<HTMLElement>('.MuiDataGrid-virtualScrollerRenderZone');

    refresh();
    virtualScroller?.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', refresh);

    const observer = new MutationObserver(refresh);
    if (renderZone) {
      observer.observe(renderZone, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'data-id'],
      });
    }

    return () => {
      virtualScroller?.removeEventListener('scroll', refresh);
      window.removeEventListener('resize', refresh);
      observer.disconnect();
    };
  }, [loading, orderedRows, sortModel, updateStatusAnchors]);

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
    const initialDigits = normalizeHeureDigits(row.HEURE);
    heureInitialDraftRef.current = initialDigits;
    setHeureDraftDigits(initialDigits);
    setRowModifiedFlag(row.RECLEUNIK, false);
  };

  const cancelHeureEdit = (row: CalendrierRow): void => {
    const initialDigits = normalizeHeureDigits(row.HEURE);
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

  const commitStatusEdit = async (row: CalendrierRow, nextValue?: number): Promise<void> => {
    const rowId = row.RECLEUNIK;
    if (editingStatusRowId !== rowId) return;
    if (savingScoreRowIdRef.current === rowId) return;

    const effectiveStatus = typeof nextValue === 'number' ? nextValue : statusDraft;
    const isModified = effectiveStatus !== Number(row.ETAT);

    if (!isModified) {
      statusInitialValueRef.current = null;
      setRowModifiedFlag(rowId, false);
      setEditingStatusRowId((current) => (current === rowId ? null : current));
      return;
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
    } catch {
      setError('Impossible d\'enregistrer le statut.');
      setRowStatusWithAutoHide(rowId, 'failed');
    } finally {
      savingScoreRowIdRef.current = null;
      statusInitialValueRef.current = null;
      setRowModifiedFlag(rowId, false);
      setEditingStatusRowId((current) => (current === rowId ? null : current));
    }
  };

  const commitHeureEdit = async (row: CalendrierRow): Promise<void> => {
    const rowId = row.RECLEUNIK;
    if (editingHeureRowId !== rowId) return;
    if (savingScoreRowIdRef.current === rowId) return;
    if (!isValidHeureDigits(heureDraftDigits)) return;

    if (!(rowModified[String(rowId)] ?? false)) {
      setEditingHeureRowId((current) => (current === rowId ? null : current));
      heureInitialDraftRef.current = '';
      return;
    }

    savingScoreRowIdRef.current = rowId;
    const heureValue = heureDigitsToApiValue(heureDraftDigits);
    if (!heureValue) {
      savingScoreRowIdRef.current = null;
      return;
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
    } catch {
      setError('Impossible d\'enregistrer l\'heure.');
      setRowStatusWithAutoHide(rowId, 'failed');
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

  const commitScoreEdit = async (row: CalendrierRow): Promise<void> => {
    const rowId = row.RECLEUNIK;
    if (editingScoreRowId !== rowId) return;
    if (savingScoreRowIdRef.current === rowId) return;
    if (!canEditScore(Number(row.ETAT))) {
      scoreInitialDraftRef.current = null;
      setEditingScoreRowId((current) => (current === rowId ? null : current));
      return;
    }

    if (!(rowModified[String(rowId)] ?? false)) {
      scoreInitialDraftRef.current = null;
      setEditingScoreRowId((current) => (current === rowId ? null : current));
      return;
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
    } catch {
      setError('Impossible d\'enregistrer le score.');
      setRowStatusWithAutoHide(rowId, 'failed');
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

  const columns = useMemo<GridColDef<CalendrierRow>[]>(() => [
    {
      field: 'ETAT',
      headerName: 'Statut',
      width: 90,
      sortable: true,
      renderCell: (params) => {
        const row = params.row;
        const isEditing = editingStatusRowId === row.RECLEUNIK;
        return (
          <StatusCell
            value={Number(row.ETAT)}
            isEditing={isEditing}
            draftValue={statusDraft}
            onStartEdit={() => startStatusEdit(row)}
            onDraftChange={(nextValue) => updateStatusDraft(row.RECLEUNIK, nextValue)}
            onCommit={(nextValue) => commitStatusEdit(row, nextValue)}
            onCancel={() => cancelStatusEdit(row)}
          />
        );
      },
    },
    {
      field: 'HEURE',
      headerName: 'Heure',
      width: 70,
      align: 'center',
      headerAlign: 'center',
      sortable: true,
      renderCell: (params) => {
        const row = params.row;
        const isEditing = editingHeureRowId === row.RECLEUNIK;
        return (
          <HeureCell
            value={row.HEURE}
            isEditing={isEditing}
            draftDigits={heureDraftDigits}
            onStartEdit={() => startHeureEdit(row)}
            onDraftChange={(digits) => updateHeureDraft(row.RECLEUNIK, digits)}
            onCommit={() => commitHeureEdit(row)}
            onCancel={() => cancelHeureEdit(row)}
            onMoveVertical={(direction) => moveHeureEditToAdjacentRow(row, direction)}
          />
        );
      },
    },
    {
      field: 'DOMICILE_NOM',
      headerName: 'Domicile',
      headerAlign: 'right',
      minWidth: 120,
      flex: 1,
      resizable: false,
      sortable: true,
      renderCell: (params) => (
        <ClubCell
          clubId={String(params.row.DOMICILE ?? '')}
          clubName={String(params.row.DOMICILE_NOM ?? '')}
          alignRight
          italic={
            String(params.row.PADOMSource ?? '').trim().length > 0
            && String(params.row.DOMICILE ?? '').trim().length === 0
          }
        />
      ),
    },
    {
      field: 'SCORE',
      headerName: 'Score',
      width: 72,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => {
        const row = params.row;
        const isEditing = editingScoreRowId === row.RECLEUNIK;
        return (
          <ScoreCell
            row={row}
            isEditing={isEditing}
            canEdit={canEditScore(Number(row.ETAT))}
            draft={scoreDraft}
            onStartEdit={() => startScoreEdit(row)}
            onDraftChange={(patch) => updateScoreDraft(row.RECLEUNIK, patch)}
            onUserInput={() => setRowModifiedFlag(row.RECLEUNIK, true)}
            onCommit={() => commitScoreEdit(row)}
            onCancel={() => cancelScoreEdit(row)}
            onMoveVertical={(direction) => moveScoreEditToAdjacentRow(row, direction)}
          />
        );
      },
    },
    {
      field: 'EXTERIEUR_NOM',
      headerName: 'Extérieur',
      minWidth: 120,
      flex: 1,
      resizable: false,
      sortable: true,
      renderCell: (params) => (
        <ClubCell
          clubId={String(params.row.EXTERIEUR ?? '')}
          clubName={String(params.row.EXTERIEUR_NOM ?? '')}
          italic={
            String(params.row.PAEXTSource ?? '').trim().length > 0
            && String(params.row.EXTERIEUR ?? '').trim().length === 0
          }
        />
      ),
    },
  ], [editingHeureRowId, editingScoreRowId, editingStatusRowId, heureDraftDigits, rowModified, scoreDraft, statusDraft]);

  const classementColumns = useMemo<GridColDef<TourClassementRow>[]>(() => {
    const columns: GridColDef<TourClassementRow>[] = [
    {
      field: 'PAClassement',
      headerName: '#',
      width: 50,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_value, row) => Number(row.PAClassement ?? 0),
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
  }, [useRatioGoalAverage]);

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
              sx={{ width: { xs: 142, sm: 142 }, minWidth: 142, maxWidth: 142, flex: '0 0 auto' }}
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

          <Box
            ref={gridWrapperRef}
            sx={{
              mt: 2,
              height: isCompactMatchList ? compactMatchListHeight : 'calc(100vh - 270px)',
              minHeight: isCompactMatchList ? 220 : 420,
              position: 'relative',
            }}
          >
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
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
              onRowDoubleClick={(params) => {
                navigate(`/admin/rencontres/${encodeURIComponent(String(params.row.RECLEUNIK ?? ''))}`);
              }}
              disableColumnMenu
              density="compact"
              pageSizeOptions={[25, 50, 100]}
              sx={{
                width: '100%',
                '@keyframes spin': {
                  from: { transform: 'rotate(0deg)' },
                  to: { transform: 'rotate(360deg)' },
                },
                '& .MuiDataGrid-cell': { cursor: 'default' },
                '& .MuiDataGrid-row.status-terminee .MuiDataGrid-cell': { color: 'common.black' },
                '& .MuiDataGrid-row.status-en-cours .MuiDataGrid-cell': { color: 'success.main' },
                '& .MuiDataGrid-row.status-en-attente .MuiDataGrid-cell': { color: 'text.secondary' },
                '& .MuiDataGrid-row.status-programmee .MuiDataGrid-cell': { color: 'text.secondary' },
                '& .MuiDataGrid-row.status-non-jouee .MuiDataGrid-cell': { color: 'text.disabled' },
                '& .MuiDataGrid-row.selected-calendar-row': {
                  backgroundColor: 'action.hover',
                },
                ...(isDefaultHeureSort
                  ? {
                      '& .MuiDataGrid-columnHeader[data-field="HEURE"] .MuiDataGrid-iconButtonContainer': {
                        visibility: 'hidden',
                        width: 0,
                      },
                    }
                  : {}),
              }}
            />

            <Box
              sx={{
                position: 'absolute',
                left: -14,
                top: 0,
                width: 14,
                height: '100%',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              {statusAnchors.map((anchor) => (
                <Box
                  key={`${anchor.rowId}-${anchor.status}`}
                  sx={{
                    position: 'absolute',
                    top: anchor.top,
                    left: 0,
                    transform: 'translateY(-50%)',
                    width: 14,
                    height: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {anchor.status === 'saving' ? (
                    <AutorenewRoundedIcon sx={{ fontSize: 14, color: 'info.main', animation: 'spin 1s linear infinite' }} />
                  ) : anchor.status === 'saved' ? (
                    <CheckCircleRoundedIcon sx={{ fontSize: 14, color: 'success.main' }} />
                  ) : (
                    <ErrorOutlineRoundedIcon sx={{ fontSize: 14, color: 'error.main' }} />
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {!isSelectedProgrammedEncounter ? (
        <Card>
          <CardContent>
            <Stack spacing={1.25}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {activeTourId == null
                  ? 'Sélectionnez un match dans la liste du calendrier pour afficher le classement.'
                  : `${classementBlockLabel || 'Classement du tour'}${classementTourId === activeTourId ? '' : ' - chargement...'}`}
              </Typography>

              <Box sx={{ height: 320, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <DataGrid
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