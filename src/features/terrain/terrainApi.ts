import { env } from '../../config/env';
import { http } from '../../lib/http';
import type { TerrainRow, PaginatedResponse } from './types';

export interface IntegrityConstraint {
  table: string;
  count: number;
  description: string;
}

export interface CanDeleteResponse {
  canDelete: boolean;
  constraints: IntegrityConstraint[];
}

export async function fetchTerrain(search: string, signal?: AbortSignal): Promise<PaginatedResponse<TerrainRow>> {
  const baseParams = {
    limit: 200,
    sort: 'STADE',
    order: 'asc',
    ...(search ? { search } : {}),
  };

  const { data: firstPage } = await http.get<PaginatedResponse<TerrainRow>>(env.terrainPublicResource, {
    params: {
      ...baseParams,
      page: 1,
    },
    signal,
  });

  if (firstPage.totalPages <= 1) {
    return firstPage;
  }

  const remainingRequests: Array<Promise<{ data: PaginatedResponse<TerrainRow> }>> = [];
  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    remainingRequests.push(
      http.get<PaginatedResponse<TerrainRow>>(env.terrainPublicResource, {
        params: {
          ...baseParams,
          page,
        },
        signal,
      }),
    );
  }

  const remainingPages = await Promise.all(remainingRequests);
  const allRows = [
    ...firstPage.data,
    ...remainingPages.flatMap((response) => response.data.data),
  ];

  return {
    ...firstPage,
    data: allRows,
    page: 1,
    limit: allRows.length,
    totalPages: 1,
  };
}

export async function fetchTerrainById(id: string | number): Promise<TerrainRow> {
  const { data } = await http.get<TerrainRow>(`${env.terrainPublicResource}/${id}`);
  return data;
}

export async function canDeleteTerrain(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(
    `${env.terrainAdminResource}/${id}/can-delete`,
  );
  return data;
}

export async function createTerrain(payload: TerrainRow): Promise<TerrainRow | undefined> {
  const { data } = await http.post<TerrainRow>(env.terrainAdminResource, payload);
  return data;
}

export async function updateTerrain(id: string | number, payload: TerrainRow): Promise<TerrainRow | undefined> {
  const { data } = await http.put<TerrainRow>(`${env.terrainAdminResource}/${id}`, payload);
  return data;
}

export async function deleteTerrain(id: string | number): Promise<void> {
  await http.delete(`${env.terrainAdminResource}/${id}`);
}
