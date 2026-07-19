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
