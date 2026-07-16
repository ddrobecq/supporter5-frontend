import { env } from '../../config/env';
import { http } from '../../lib/http';
import type { NatioRow, PaginatedResponse } from './types';

export interface IntegrityConstraint {
  table: string;
  count: number;
  description: string;
}

export interface CanDeleteResponse {
  canDelete: boolean;
  constraints: IntegrityConstraint[];
}

export async function fetchNatio(search: string, signal?: AbortSignal): Promise<PaginatedResponse<NatioRow>> {
  const baseParams = {
    limit: 200,
    sort: 'PAYS',
    order: 'asc',
    ...(search ? { search } : {}),
  };

  const { data: firstPage } = await http.get<PaginatedResponse<NatioRow>>(env.natioPublicResource, {
    params: {
      ...baseParams,
      page: 1,
    },
    signal,
  });

  if (firstPage.totalPages <= 1) {
    return firstPage;
  }

  const remainingRequests: Array<Promise<{ data: PaginatedResponse<NatioRow> }>> = [];
  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    remainingRequests.push(
      http.get<PaginatedResponse<NatioRow>>(env.natioPublicResource, {
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

export async function fetchNatioById(id: string | number): Promise<NatioRow> {
  const { data } = await http.get<NatioRow>(`${env.natioPublicResource}/${id}`);
  return data;
}

export async function canDeleteNatio(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(
    `${env.natioAdminResource}/${id}/can-delete`,
  );
  return data;
}

export async function createNatio(payload: NatioRow): Promise<NatioRow | undefined> {
  const { data } = await http.post<NatioRow>(env.natioAdminResource, payload);
  return data;
}

export async function updateNatio(id: string | number, payload: NatioRow): Promise<NatioRow | undefined> {
  const { data } = await http.put<NatioRow>(`${env.natioAdminResource}/${id}`, payload);
  return data;
}

export async function deleteNatio(id: string | number): Promise<void> {
  await http.delete(`${env.natioAdminResource}/${id}`);
}
