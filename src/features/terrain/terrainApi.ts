import { env } from '../../config/env';
import type { CanDeleteResponse } from '../../lib/apiTypes';
import { fetchAllPages } from '../../lib/fetchAllPages';
import { http } from '../../lib/http';
import { encodePathSegment } from '../../lib/urlPath';
import type { TerrainRow, PaginatedResponse } from './types';

export async function fetchTerrain(search: string, signal?: AbortSignal): Promise<PaginatedResponse<TerrainRow>> {
  return fetchAllPages<TerrainRow>(env.terrainPublicResource, {
    limit: 200,
    sort: 'STADE',
    order: 'asc',
    ...(search ? { search } : {}),
  }, signal);
}

export async function fetchTerrainById(id: string | number): Promise<TerrainRow> {
  const { data } = await http.get<TerrainRow>(`${env.terrainPublicResource}/${encodePathSegment(id)}`);
  return data;
}

export async function canDeleteTerrain(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(
    `${env.terrainAdminResource}/${encodePathSegment(id)}/can-delete`,
  );
  return data;
}

export async function createTerrain(payload: TerrainRow): Promise<TerrainRow | undefined> {
  const { data } = await http.post<TerrainRow>(env.terrainAdminResource, payload);
  return data;
}

export async function updateTerrain(id: string | number, payload: TerrainRow): Promise<TerrainRow | undefined> {
  const { data } = await http.put<TerrainRow>(`${env.terrainAdminResource}/${encodePathSegment(id)}`, payload);
  return data;
}

export async function deleteTerrain(id: string | number): Promise<void> {
  await http.delete(`${env.terrainAdminResource}/${encodePathSegment(id)}`);
}
