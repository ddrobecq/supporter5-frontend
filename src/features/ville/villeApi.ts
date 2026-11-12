import { env } from '../../config/env';
import type { CanDeleteResponse } from '../../lib/apiTypes';
import { fetchAllPages } from '../../lib/fetchAllPages';
import { http } from '../../lib/http';
import { encodePathSegment } from '../../lib/urlPath';
import type { VilleRow, PaginatedResponse } from './types';

export async function fetchVille(search: string, signal?: AbortSignal): Promise<PaginatedResponse<VilleRow>> {
  return fetchAllPages<VilleRow>(env.villePublicResource, {
    pageSize: 200,
    sort: 'NOM',
    order: 'asc',
    ...(search ? { search } : {}),
  }, signal);
}

export async function fetchVilleById(id: string | number): Promise<VilleRow> {
  const { data } = await http.get<VilleRow>(`${env.villePublicResource}/${encodePathSegment(id)}`);
  return data;
}

export async function canDeleteVille(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(
    `${env.villeAdminResource}/${encodePathSegment(id)}/can-delete`,
  );
  return data;
}

export async function createVille(payload: VilleRow): Promise<VilleRow | undefined> {
  const { data } = await http.post<VilleRow>(env.villeAdminResource, payload);
  return data;
}

export async function updateVille(id: string | number, payload: VilleRow): Promise<VilleRow | undefined> {
  const { data } = await http.put<VilleRow>(`${env.villeAdminResource}/${encodePathSegment(id)}`, payload);
  return data;
}

export async function deleteVille(id: string | number): Promise<void> {
  await http.delete(`${env.villeAdminResource}/${encodePathSegment(id)}`);
}
