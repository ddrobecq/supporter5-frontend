import { env } from '../../config/env';
import { http } from '../../lib/http';
import type { DeviseRow, PaginatedResponse } from './types';

export interface IntegrityConstraint {
  table: string;
  count: number;
  description: string;
}

export interface CanDeleteResponse {
  canDelete: boolean;
  constraints: IntegrityConstraint[];
}

export async function fetchDevise(search: string, signal?: AbortSignal): Promise<PaginatedResponse<DeviseRow>> {
  const { data } = await http.get<PaginatedResponse<DeviseRow>>(env.devisePublicResource, {
    params: { limit: 200, sort: 'NOM', order: 'asc', ...(search ? { search } : {}), page: 1 },
    signal,
  });
  return data;
}

export async function fetchDeviseById(id: string | number): Promise<DeviseRow> {
  const { data } = await http.get<DeviseRow>(`${env.devisePublicResource}/${id}`);
  return data;
}

export async function canDeleteDevise(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(`${env.deviseAdminResource}/${id}/can-delete`);
  return data;
}

export async function createDevise(payload: DeviseRow): Promise<DeviseRow | undefined> {
  const { data } = await http.post<DeviseRow>(env.deviseAdminResource, payload);
  return data;
}

export async function updateDevise(id: string | number, payload: DeviseRow): Promise<DeviseRow | undefined> {
  const { data } = await http.put<DeviseRow>(`${env.deviseAdminResource}/${id}`, payload);
  return data;
}

export async function deleteDevise(id: string | number): Promise<void> {
  await http.delete(`${env.deviseAdminResource}/${id}`);
}
