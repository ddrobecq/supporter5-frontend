import { env } from '../../config/env';
import { http } from '../../lib/http';
import type { CircRow, PaginatedResponse } from './types';

export interface IntegrityConstraint {
  table: string;
  count: number;
  description: string;
}

export interface CanDeleteResponse {
  canDelete: boolean;
  constraints: IntegrityConstraint[];
}

export async function fetchCirc(search: string, signal?: AbortSignal): Promise<PaginatedResponse<CircRow>> {
  const { data } = await http.get<PaginatedResponse<CircRow>>(env.circPublicResource, {
    params: { limit: 200, sort: 'IDCIRC', order: 'asc', ...(search ? { search } : {}), page: 1 },
    signal,
  });
  return data;
}

export async function fetchCircById(id: string | number): Promise<CircRow> {
  const { data } = await http.get<CircRow>(`${env.circPublicResource}/${id}`);
  return data;
}

export async function canDeleteCirc(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(`${env.circAdminResource}/${id}/can-delete`);
  return data;
}

export async function createCirc(payload: CircRow): Promise<CircRow | undefined> {
  const { data } = await http.post<CircRow>(env.circAdminResource, payload);
  return data;
}

export async function updateCirc(id: string | number, payload: CircRow): Promise<CircRow | undefined> {
  const { data } = await http.put<CircRow>(`${env.circAdminResource}/${id}`, payload);
  return data;
}

export async function deleteCirc(id: string | number): Promise<void> {
  await http.delete(`${env.circAdminResource}/${id}`);
}