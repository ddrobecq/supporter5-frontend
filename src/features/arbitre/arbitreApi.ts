import { env } from '../../config/env';
import { http } from '../../lib/http';
import type { ArbitreCreateWizardPayload, ArbitreRow, ArbitreSuggestionRow, PaginatedResponse } from './types';

export interface IntegrityConstraint {
  table: string;
  count: number;
  description: string;
}

export interface CanDeleteResponse {
  canDelete: boolean;
  constraints: IntegrityConstraint[];
}

export async function fetchArbitre(search: string, signal?: AbortSignal): Promise<PaginatedResponse<ArbitreRow>> {
  const baseParams = {
    limit: 200,
    sort: 'NOM',
    order: 'asc',
    ...(search ? { search } : {}),
  };

  const { data: firstPage } = await http.get<PaginatedResponse<ArbitreRow>>(env.arbitrePublicResource, {
    params: {
      ...baseParams,
      page: 1,
    },
    signal,
  });

  if (firstPage.totalPages <= 1) {
    return firstPage;
  }

  const remainingRequests: Array<Promise<{ data: PaginatedResponse<ArbitreRow> }>> = [];
  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    remainingRequests.push(
      http.get<PaginatedResponse<ArbitreRow>>(env.arbitrePublicResource, {
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

export async function fetchArbitreById(id: string | number): Promise<ArbitreRow> {
  const { data } = await http.get<ArbitreRow>(`${env.arbitrePublicResource}/${id}`);
  return data;
}

export async function fetchArbitreSuggestions(search: string, signal?: AbortSignal): Promise<{ data: ArbitreSuggestionRow[] }> {
  const params = {
    search,
    limit: 12,
  };
  const { data } = await http.get<{ data: ArbitreSuggestionRow[] }>(`${env.arbitrePublicResource}/suggest`, {
    params,
    signal,
    timeout: 30000,
  });
  return data;
}

export async function canDeleteArbitre(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(
    `${env.arbitreAdminResource}/${id}/can-delete`,
  );
  return data;
}

export async function createArbitre(payload: ArbitreRow): Promise<ArbitreRow | undefined> {
  const { data } = await http.post<ArbitreRow>(env.arbitreAdminResource, payload);
  return data;
}

export async function createArbitreWithWizard(payload: ArbitreCreateWizardPayload): Promise<ArbitreRow | undefined> {
  const { data } = await http.post<ArbitreRow>(`${env.arbitreAdminResource}/wizard-create`, payload);
  return data;
}

export async function updateArbitre(id: string | number, payload: ArbitreRow): Promise<ArbitreRow | undefined> {
  const { data } = await http.put<ArbitreRow>(`${env.arbitreAdminResource}/${id}`, payload);
  return data;
}

export async function deleteArbitre(id: string | number): Promise<void> {
  await http.delete(`${env.arbitreAdminResource}/${id}`);
}
