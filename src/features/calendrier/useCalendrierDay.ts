import { useEffect, useMemo, useState } from 'react';
import { useDepsChanged } from '../../lib/useDepsChanged';
import { fetchCalendarByDate } from './calendrierApi';
import { CALENDRIER_DATE_STORAGE_KEY, getInitialCalendrierDate } from './calendrierUtils';
import type { CalendrierRow } from './types';

/**
 * Matches of the selected day: date (persisted in sessionStorage), loading/error state,
 * and the selected row (kept on an existing row, first row by default).
 */
export function useCalendrierDay() {
  const [date, setDate] = useState<string>(() => getInitialCalendrierDate());
  const [rows, setRows] = useState<CalendrierRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | number | null>(null);

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
    if (typeof window === 'undefined') {
      return;
    }
    window.sessionStorage.setItem(CALENDRIER_DATE_STORAGE_KEY, date);
  }, [date]);

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

  const selectedRow = useMemo(
    () => rows.find((row) => String(row.RECLEUNIK) === String(selectedRowId ?? '')) ?? null,
    [rows, selectedRowId],
  );

  return {
    date,
    setDate,
    rows,
    setRows,
    loading,
    error,
    setError,
    selectedRowId,
    setSelectedRowId,
    selectedRow,
  };
}
