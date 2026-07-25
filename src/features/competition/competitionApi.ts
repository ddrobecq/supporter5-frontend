import { env } from '../../config/env';
import { http } from '../../lib/http';
import type {
  CompetitionCreateWizardPayload,
  CompetitionRow,
  CompetitionTourRow,
  EpreuveOption,
  PaginatedResponse,
  SaisonOption,
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

export async function fetchCompetition(
  search: string,
  season?: string,
  signal?: AbortSignal,
): Promise<PaginatedResponse<CompetitionRow>> {
  const { data } = await http.get<PaginatedResponse<CompetitionRow>>(env.competitionPublicResource, {
    params: {
      limit: 200,
      sort: 'NOM',
      order: 'asc',
      ...(search ? { search } : {}),
      ...(season ? { saison: season } : {}),
      page: 1,
    },
    signal,
  });
  return data;
}

export async function fetchCompetitionById(id: string | number): Promise<CompetitionRow> {
  const { data } = await http.get<CompetitionRow>(`${env.competitionPublicResource}/${id}`);
  return data;
}

export async function fetchCompetitionWizardData(signal?: AbortSignal): Promise<{
  epreuves: EpreuveOption[];
  saisons: SaisonOption[];
}> {
  const [epreuvesResponse, saisonsResponse] = await Promise.all([
    http.get<PaginatedResponse<EpreuveOption>>(env.epreuvePublicResource, {
      params: { limit: 200, sort: 'EPREUVE', order: 'asc', page: 1 },
      signal,
    }),
    http.get<PaginatedResponse<SaisonOption>>(env.saisonPublicResource, {
      params: { limit: 200, sort: 'SAISON', order: 'desc', page: 1 },
      signal,
    }),
  ]);

  return {
    epreuves: epreuvesResponse.data.data ?? [],
    saisons: saisonsResponse.data.data ?? [],
  };
}

export async function canDeleteCompetition(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(`${env.competitionAdminResource}/${id}/can-delete`);
  return data;
}

export async function updateCompetition(id: string | number, payload: CompetitionRow): Promise<CompetitionRow | undefined> {
  const { data } = await http.put<CompetitionRow>(`${env.competitionAdminResource}/${id}`, payload);
  return data;
}

export async function createCompetitionWithWizard(payload: CompetitionCreateWizardPayload): Promise<CompetitionRow | undefined> {
  const { data } = await http.post<CompetitionRow>(`${env.competitionAdminResource}/wizard-create`, payload);
  return data;
}

export async function deleteCompetition(id: string | number): Promise<void> {
  await http.delete(`${env.competitionAdminResource}/${id}`);
}

export async function fetchCompetitionTours(competitionId: string | number): Promise<CompetitionTourRow[]> {
  const { data } = await http.get<{ data: CompetitionTourRow[] }>(
    `${env.tourAdminResource}/competition/${competitionId}`,
  );
  return data.data ?? [];
}

export async function canDeleteCompetitionTour(tourId: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(`${env.tourAdminResource}/${tourId}/can-delete`);
  return data;
}

export async function deleteCompetitionTour(tourId: string | number): Promise<void> {
  await http.delete(`${env.tourAdminResource}/${tourId}`);
}

export async function moveCompetitionTour(tourId: string | number, direction: 'up' | 'down'): Promise<CompetitionTourRow[]> {
  const { data } = await http.patch<{ data: CompetitionTourRow[] }>(`${env.tourAdminResource}/${tourId}/move`, { direction });
  return data.data ?? [];
}
