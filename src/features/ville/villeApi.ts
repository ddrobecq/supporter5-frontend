import { env } from '../../config/env';
import { http } from '../../lib/http';
import type { VilleRow, PaginatedResponse } from './types';

export interface IntegrityConstraint {
  table: string;
  count: number;
  description: string;
}

export interface CanDeleteResponse {
  canDelete: boolean;
  constraints: IntegrityConstraint[];
}

export async function fetchVille(search: string, signal?: AbortSignal): Promise<PaginatedResponse<VilleRow>> {
  const baseParams = {
    limit: 200,
    sort: 'NOM',
    order: 'asc',
    ...(search ? { search } : {}),
  };

  const { data: firstPage } = await http.get<PaginatedResponse<VilleRow>>(env.villePublicResource, {
    params: {
      ...baseParams,
      page: 1,
    },
    signal,
  });

  if (firstPage.totalPages <= 1) {
    return firstPage;
  }

  const remainingRequests: Array<Promise<{ data: PaginatedResponse<VilleRow> }>> = [];
  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    remainingRequests.push(
      http.get<PaginatedResponse<VilleRow>>(env.villePublicResource, {
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

export async function fetchVilleById(id: string | number): Promise<VilleRow> {
  const { data } = await http.get<VilleRow>(`${env.villePublicResource}/${id}`);
  return data;
}

export async function canDeleteVille(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(
    `${env.villeAdminResource}/${id}/can-delete`,
  );
  return data;
}

export async function createVille(payload: VilleRow): Promise<VilleRow | undefined> {
  const { data } = await http.post<VilleRow>(env.villeAdminResource, payload);
  return data;
}

export async function updateVille(id: string | number, payload: VilleRow): Promise<VilleRow | undefined> {
  const { data } = await http.put<VilleRow>(`${env.villeAdminResource}/${id}`, payload);
  return data;
}

export async function deleteVille(id: string | number): Promise<void> {
  await http.delete(`${env.villeAdminResource}/${id}`);
}
