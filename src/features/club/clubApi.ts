import { env } from '../../config/env';
import { http } from '../../lib/http';
import type {
  ClubCreateWizardPayload,
  ClubGridRow,
  ClubNameHistoryRow,
  ClubProfileRow,
  ClubSuggestionRow,
  ClubTerrainHistoryRow,
  GridResponse,
} from './types';

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

export async function fetchClubGridById(
  id: string,
  signal?: AbortSignal,
): Promise<ClubGridRow> {
  const { data } = await http.get<ClubGridRow>(`${env.clubPublicResource}/grid/${encodeURIComponent(id)}`, {
    signal,
    timeout: 30000,
  });
  return data;
}

export async function fetchClubProfileById(
  id: string,
  signal?: AbortSignal,
): Promise<ClubProfileRow> {
  const { data } = await http.get<ClubProfileRow>(`${env.clubPublicResource}/grid/${encodeURIComponent(id)}/profile`, {
    signal,
    timeout: 30000,
  });
  return data;
}

export async function fetchClubNameHistory(
  id: string,
  signal?: AbortSignal,
): Promise<ClubNameHistoryRow[]> {
  const { data } = await http.get<GridResponse<ClubNameHistoryRow>>(`${env.clubPublicResource}/grid/${encodeURIComponent(id)}/names-history`, {
    signal,
    timeout: 30000,
  });
  return data.data ?? [];
}

export async function fetchClubTerrainHistory(
  id: string,
  signal?: AbortSignal,
): Promise<ClubTerrainHistoryRow[]> {
  const { data } = await http.get<GridResponse<ClubTerrainHistoryRow>>(`${env.clubPublicResource}/grid/${encodeURIComponent(id)}/terrains-history`, {
    signal,
    timeout: 30000,
  });
  return data.data ?? [];
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

export async function createClubWithWizard(payload: ClubCreateWizardPayload): Promise<ClubGridRow> {
  const { data } = await http.post<ClubGridRow>(`${env.clubAdminResource}/wizard-create`, payload);
  return data;
}

export async function updateClubColors(
  id: string,
  payload: { fond: string | number | null; texte: string | number | null },
): Promise<ClubProfileRow> {
  const { data } = await http.put<ClubProfileRow>(`${env.clubAdminResource}/${encodeURIComponent(id)}/colors`, payload);
  return data;
}

export async function updateClubProfile(
  id: string,
  payload: { name: string; natioId: string; villeId?: string | number | null; fond?: string | number | null; texte?: string | number | null },
): Promise<ClubProfileRow> {
  const { data } = await http.put<ClubProfileRow>(`${env.clubAdminResource}/${encodeURIComponent(id)}/profile`, payload);
  return data;
}
