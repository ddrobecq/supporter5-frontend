import { http } from '../../lib/http';
import type { GridResponse, JoueurGridRow, PaginatedResponse, SaisonRow } from './types';

export async function fetchJoueursGrid(
  season: string,
  search: string,
  signal?: AbortSignal,
): Promise<JoueurGridRow[]> {
  const { data } = await http.get<GridResponse<JoueurGridRow>>('/api/joueurs/grid', {
    params: {
      season,
      ...(search ? { search } : {}),
    },
    signal,
  });

  return data.data ?? [];
}

export async function fetchSaisons(signal?: AbortSignal): Promise<SaisonRow[]> {
  const baseParams = {
    limit: 200,
    sort: 'SAISON',
    order: 'desc',
  };

  const { data: firstPage } = await http.get<PaginatedResponse<SaisonRow>>('/api/saisons', {
    params: {
      ...baseParams,
      page: 1,
    },
    signal,
  });

  if (firstPage.totalPages <= 1) {
    return firstPage.data ?? [];
  }

  const remainingRequests: Array<Promise<{ data: PaginatedResponse<SaisonRow> }>> = [];
  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    remainingRequests.push(
      http.get<PaginatedResponse<SaisonRow>>('/api/saisons', {
        params: {
          ...baseParams,
          page,
        },
        signal,
      }),
    );
  }

  const remainingPages = await Promise.all(remainingRequests);
  return [
    ...(firstPage.data ?? []),
    ...remainingPages.flatMap((response) => response.data.data ?? []),
  ];
}
