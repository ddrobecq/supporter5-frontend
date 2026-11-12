import { env } from '../../config/env';
import type { CanDeleteResponse } from '../../lib/apiTypes';
import { fetchAllPages } from '../../lib/fetchAllPages';
import { http } from '../../lib/http';
import { encodePathSegment } from '../../lib/urlPath';
import type { DeviseRow, PaginatedResponse } from './types';

export async function fetchDevise(search: string, signal?: AbortSignal): Promise<PaginatedResponse<DeviseRow>> {
  return fetchAllPages<DeviseRow>(env.devisePublicResource, {
    limit: 200,
    sort: 'NOM',
    order: 'asc',
    ...(search ? { search } : {}),
  }, signal);
}

export async function fetchDeviseById(id: string | number): Promise<DeviseRow> {
  const { data } = await http.get<DeviseRow>(`${env.devisePublicResource}/${encodePathSegment(id)}`);
  return data;
}

export async function canDeleteDevise(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(`${env.deviseAdminResource}/${encodePathSegment(id)}/can-delete`);
  return data;
}

export async function createDevise(payload: DeviseRow): Promise<DeviseRow | undefined> {
  const { data } = await http.post<DeviseRow>(env.deviseAdminResource, payload);
  return data;
}

export async function updateDevise(id: string | number, payload: DeviseRow): Promise<DeviseRow | undefined> {
  const { data } = await http.put<DeviseRow>(`${env.deviseAdminResource}/${encodePathSegment(id)}`, payload);
  return data;
}

export async function deleteDevise(id: string | number): Promise<void> {
  await http.delete(`${env.deviseAdminResource}/${encodePathSegment(id)}`);
}
