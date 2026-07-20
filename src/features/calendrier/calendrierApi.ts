import { http } from '../../lib/http';
import type { CalendrierRow } from './types';

interface CalendarResponse {
  data: CalendrierRow[];
}

export async function fetchCalendarByDate(date: string, signal?: AbortSignal): Promise<CalendrierRow[]> {
  const { data } = await http.get<CalendarResponse>('/api/rencontres/calendar', {
    params: { date },
    signal,
  });
  return data.data ?? [];
}

interface UpdateScorePayload {
  TABDOM: number;
  BUTDOM: number;
  BUTEXT: number;
  TABEXT: number;
}

export async function updateCalendarScore(
  id: string | number,
  payload: UpdateScorePayload,
): Promise<void> {
  await http.put(`/api/admin/rencontres/${encodeURIComponent(String(id))}`, payload);
}

interface UpdateHeurePayload {
  HEURE: string;
}

export async function updateCalendarHeure(
  id: string | number,
  payload: UpdateHeurePayload,
): Promise<void> {
  await http.put(`/api/admin/rencontres/${encodeURIComponent(String(id))}`, payload);
}
