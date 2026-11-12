import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  heureDigitsToApiValue,
  isValidHeureDigits,
  normalizeHeureDigits,
  sanitizeHeureDigits,
} from '../../components/heureUtils';
import { canEditScore, parseScoreInputValue, scoreToInputValue } from '../../lib/matchStatus';
import { useLatestHandlers } from '../../lib/useLatestHandlers';
import { updateCalendarHeure, updateCalendarScore, updateCalendarStatus } from './calendrierApi';
import { getStatusAfterScoreEdit } from './calendrierUtils';
import type { ScoreDraft } from './ScoreCell';
import type { CalendrierRow } from './types';

export type RowSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

export interface CalendrierRowEditingOptions {
  /** Rows in display order, used to move the editor to the adjacent row. */
  orderedRows: CalendrierRow[];
  setRows: Dispatch<SetStateAction<CalendrierRow[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setSelectedRowId: Dispatch<SetStateAction<string | number | null>>;
  /** Called after a saved status or score change (the tour ranking may have changed). */
  onResultSaved: (row: CalendrierRow) => void;
}

/**
 * Inline editing of status / time / score in the calendar grid: one editor at a time, drafts,
 * save to the API, keyboard moves (Tab between fields, up/down between rows) and per-row save status.
 * Returned `handlers` are stable (see useLatestHandlers).
 */
export function useCalendrierRowEditing({
  orderedRows,
  setRows,
  setError,
  setSelectedRowId,
  onResultSaved,
}: CalendrierRowEditingOptions) {
  const [rowSaveStatus, setRowSaveStatus] = useState<Record<string, RowSaveStatus>>({});
  const [editingScoreRowId, setEditingScoreRowId] = useState<string | number | null>(null);
  const [editingHeureRowId, setEditingHeureRowId] = useState<string | number | null>(null);
  const [editingStatusRowId, setEditingStatusRowId] = useState<string | number | null>(null);
  const [scoreDraft, setScoreDraft] = useState<ScoreDraft>({ tabDom: '', butDom: '', butExt: '', tabExt: '' });
  const [heureDraftDigits, setHeureDraftDigits] = useState<string>('');
  const [statusDraft, setStatusDraft] = useState<number>(5);
  const [rowModified, setRowModified] = useState<Record<string, boolean>>({});
  const rowModifiedRef = useRef<Record<string, boolean>>({});
  const savingScoreRowIdRef = useRef<string | number | null>(null);
  const savedIconTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const scoreInitialDraftRef = useRef<ScoreDraft | null>(null);
  const heureInitialDraftRef = useRef<string>('');
  const statusInitialValueRef = useRef<number | null>(null);

  const orderedRowsRef = useRef<CalendrierRow[]>(orderedRows);
  useEffect(() => {
    orderedRowsRef.current = orderedRows;
  }, [orderedRows]);

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
      onResultSaved(row);
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
      onResultSaved(row);
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

  const handlers = useLatestHandlers({
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

  return {
    rowSaveStatus,
    editingStatusRowId,
    statusDraft,
    editingHeureRowId,
    heureDraftDigits,
    editingScoreRowId,
    scoreDraft,
    handlers,
  };
}

export type CalendrierRowEditing = ReturnType<typeof useCalendrierRowEditing>;
