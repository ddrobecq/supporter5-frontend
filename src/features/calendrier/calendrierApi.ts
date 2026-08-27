import { http } from '../../lib/http';
import type { CalendrierRow, TourClassementRow } from './types';
import { env } from '../../config/env';
import type { TourQualifRow } from './types';

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
  ETAT?: number;
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

interface UpdateStatusPayload {
  ETAT: number;
}

export async function updateCalendarStatus(
  id: string | number,
  payload: UpdateStatusPayload,
): Promise<void> {
  await http.put(`/api/admin/rencontres/${encodeURIComponent(String(id))}`, payload);
}

export async function fetchTourClassement(tourId: string | number, publicMode = false): Promise<TourClassementRow[]> {
  const resource = publicMode ? '/api/tours' : '/api/admin/tours';
  const { data } = await http.get<{ data: TourClassementRow[] }>(`${resource}/${encodeURIComponent(String(tourId))}/participants`);
  return data.data ?? [];
}

export async function fetchTourQualifs(tourId: string | number): Promise<TourQualifRow[]> {
  const { data } = await http.get<{ data: TourQualifRow[] }>(env.qualifPublicResource, {
    params: { limit: 200, sort: 'CLASS_MinRang', order: 'asc', tucleunik: tourId, page: 1 },
  });
  return data.data ?? [];
}
