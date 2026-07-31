import { env } from '../../config/env';
import { http } from '../../lib/http';
import type { TourDefRow, PaginatedResponse } from './types';

export interface IntegrityConstraint {
  table: string;
  count: number;
  description: string;
}

export interface CanDeleteResponse {
  canDelete: boolean;
  constraints: IntegrityConstraint[];
}

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
  const { data } = await http.get<TourDefRow>(`${env.tourDefPublicResource}/${id}`);
  return data;
}

export async function createTourDef(payload: TourDefRow): Promise<TourDefRow | undefined> {
  const { data } = await http.post<TourDefRow>(env.tourDefAdminResource, payload);
  return data;
}

export async function updateTourDef(id: string | number, payload: TourDefRow): Promise<TourDefRow | undefined> {
  const { data } = await http.put<TourDefRow>(`${env.tourDefAdminResource}/${id}`, payload);
  return data;
}

export async function deleteTourDef(id: string | number): Promise<void> {
  await http.delete(`${env.tourDefAdminResource}/${id}`);
}

export async function canDeleteTourDef(_id: string | number): Promise<CanDeleteResponse> {
  return { canDelete: true, constraints: [] };
}
