import { http } from '../../lib/http';
import type { TourMatchRow } from '../competition/types';
import type { RencontreDetailRow } from './types';

export async function fetchRencontreDetailById(rencontreId: string | number): Promise<RencontreDetailRow> {
  const { data } = await http.get<RencontreDetailRow>(`/api/rencontres/${encodeURIComponent(String(rencontreId))}/detail`);
  return data;
}

export async function updateRencontreDetail(
  rencontreId: string | number,
  payload: Partial<TourMatchRow>,
): Promise<TourMatchRow | undefined> {
  const { data } = await http.put<TourMatchRow>(`/api/admin/rencontres/${encodeURIComponent(String(rencontreId))}`, payload);
  return data;
}
