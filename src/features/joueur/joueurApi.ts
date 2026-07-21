import { env } from '../../config/env';
import { http } from '../../lib/http';
import type {
  CanDeleteResponse,
  GridResponse,
  JoueurGridRow,
  JoueurRow,
  PaginatedResponse,
  PosteOption,
  SaisonRow,
} from './types';

export async function fetchJoueursGrid(
  season: string,
  search: string,
  signal?: AbortSignal,
): Promise<JoueurGridRow[]> {
  const { data } = await http.get<GridResponse<JoueurGridRow>>(`${env.joueurPublicResource}/grid`, {
    params: {
      season,
      ...(search ? { search } : {}),
    },
    signal,
  });

  return data.data ?? [];
}

export async function fetchJoueurPostes(signal?: AbortSignal): Promise<PosteOption[]> {
  const { data } = await http.get<GridResponse<PosteOption>>(`${env.joueurPublicResource}/postes`, {
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

export async function fetchJoueurById(id: string | number): Promise<JoueurRow> {
  const { data } = await http.get<JoueurRow>(`${env.joueurPublicResource}/${id}`);
  return data;
}

export async function createJoueur(payload: JoueurRow): Promise<JoueurRow | undefined> {
  const { data } = await http.post<JoueurRow>(env.joueurAdminResource, payload);
  return data;
}

export async function updateJoueur(id: string | number, payload: JoueurRow): Promise<JoueurRow | undefined> {
  const { data } = await http.put<JoueurRow>(`${env.joueurAdminResource}/${id}`, payload);
  return data;
}

export async function deleteJoueur(id: string | number): Promise<void> {
  await http.delete(`${env.joueurAdminResource}/${id}`);
}

export async function canDeleteJoueur(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(`${env.joueurAdminResource}/${id}/can-delete`);
  return data;
}
