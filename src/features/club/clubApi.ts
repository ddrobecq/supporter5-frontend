import { env } from '../../config/env';
import { http } from '../../lib/http';
import type { ClubGridRow, ClubSuggestionRow, GridResponse } from './types';

export interface IntegrityConstraint {
  table: string;
  count: number;
  description: string;
}

export interface CanDeleteResponse {
  canDelete: boolean;
  constraints: IntegrityConstraint[];
}

export async function fetchClubsGrid(
  search: string,
  signal?: AbortSignal,
): Promise<GridResponse<ClubGridRow>> {
  const params = {
    ...(search ? { search } : {}),
  };

  try {
    const { data } = await http.get<GridResponse<ClubGridRow>>(`${env.clubPublicResource}/grid`, {
      params,
      signal,
      timeout: 60000,
    });
    return data;
  } catch (error: unknown) {
    // Render cold starts can exceed the default timeout; retry once with the same extended timeout.
    if (
      typeof error === 'object'
      && error !== null
      && 'code' in error
      && (error as { code?: string }).code === 'ECONNABORTED'
    ) {
      const { data } = await http.get<GridResponse<ClubGridRow>>(`${env.clubPublicResource}/grid`, {
        params,
        signal,
        timeout: 60000,
      });
      return data;
    }
    throw error;
  }
}

export async function canDeleteClub(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(`${env.clubAdminResource}/${id}/can-delete`);
  return data;
}

export async function deleteClub(id: string | number): Promise<void> {
  await http.delete(`${env.clubAdminResource}/${id}`);
}

export async function fetchClubSuggestions(
  search: string,
  signal?: AbortSignal,
): Promise<GridResponse<ClubSuggestionRow>> {
  const params = {
    search,
    limit: 12,
  };

  const { data } = await http.get<GridResponse<ClubSuggestionRow>>(`${env.clubPublicResource}/suggest`, {
    params,
    signal,
    timeout: 30000,
  });
  return data;
}
