import { env } from '../../config/env';
import type { CanDeleteResponse } from '../../lib/apiTypes';
import { http } from '../../lib/http';
import { encodePathSegment } from '../../lib/urlPath';
import type { TourDefRow, PaginatedResponse } from './types';

export async function fetchTourDefs(search: string, signal?: AbortSignal): Promise<PaginatedResponse<TourDefRow>> {
  const { data } = await http.get<PaginatedResponse<TourDefRow>>(env.tourDefPublicResource, {
    params: {
      limit: 300,
      sort: 'NOM',
      order: 'asc',
      ...(search ? { search } : {}),
      page: 1,
    },
    signal,
  });
  return data;
}

export async function fetchTourDefById(id: string | number): Promise<TourDefRow> {
  const { data } = await http.get<TourDefRow>(`${env.tourDefPublicResource}/${encodePathSegment(id)}`);
  return data;
}

export async function createTourDef(payload: TourDefRow): Promise<TourDefRow | undefined> {
  const { data } = await http.post<TourDefRow>(env.tourDefAdminResource, payload);
  return data;
}

export async function updateTourDef(id: string | number, payload: TourDefRow): Promise<TourDefRow | undefined> {
  const { data } = await http.put<TourDefRow>(`${env.tourDefAdminResource}/${encodePathSegment(id)}`, payload);
  return data;
}

export async function deleteTourDef(id: string | number): Promise<void> {
  await http.delete(`${env.tourDefAdminResource}/${encodePathSegment(id)}`);
}

export async function canDeleteTourDef(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(`${env.tourDefAdminResource}/${encodePathSegment(id)}/can-delete`);
  return data;
}
