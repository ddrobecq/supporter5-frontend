import { env } from '../../config/env';
import { normalizeImagePayload, updateEntityImageWithFallback } from '../../lib/entityImageApi';
import { http } from '../../lib/http';
import type {
  CompetitionCreateWizardPayload,
  CompetitionRow,
  CompetitionTourDetailRow,
  CompetitionTourRow,
  CompetitionTourUpsertPayload,
  EpreuveOption,
  PaginatedResponse,
  SaisonOption,
  CircOptionRow,
  QualifRow,
  TourMatchRow,
  TourDefRow,
  TourParticipantRow,
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
  const image = normalizeImagePayload(payload.LOGO);
  const { LOGO: _logo, ...entityPayload } = payload;
  const { data } = await http.put<CompetitionRow>(`${env.competitionAdminResource}/${id}`, entityPayload);

  if (image !== undefined) {
    await updateEntityImageWithFallback('competition', id, image, async () => {
      await http.put(`${env.competitionAdminResource}/${id}`, { LOGO: image });
    });
  }

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

export async function fetchCompetitionToursPublic(competitionId: string | number): Promise<CompetitionTourRow[]> {
  const { data } = await http.get<{ data: CompetitionTourRow[] }>(
    `${env.tourPublicResource}/competition/${competitionId}`,
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

export async function fetchCompetitionTourById(tourId: string | number): Promise<CompetitionTourDetailRow> {
  const { data } = await http.get<CompetitionTourDetailRow>(`${env.tourPublicResource}/${tourId}/detail`);
  return data;
}

export async function createCompetitionTour(payload: CompetitionTourUpsertPayload): Promise<CompetitionTourDetailRow | undefined> {
  const { data } = await http.post<CompetitionTourDetailRow>(env.tourAdminResource, payload);
  return data;
}

export async function updateCompetitionTour(tourId: string | number, payload: CompetitionTourUpsertPayload): Promise<CompetitionTourDetailRow | undefined> {
  const { data } = await http.put<CompetitionTourDetailRow>(`${env.tourAdminResource}/${tourId}`, payload);
  return data;
}

export async function fetchTourDefsByType(typeId: number): Promise<TourDefRow[]> {
  const { data } = await http.get<PaginatedResponse<TourDefRow>>(`${env.apiBaseUrl}/api/tourdefs`, {
    params: {
      limit: 200,
      sort: 'NOM',
      order: 'asc',
      tdtypetour: typeId,
      page: 1,
    },
  });
  return data.data ?? [];
}

export async function fetchTourDefById(tourDefId: string | number): Promise<TourDefRow> {
  const { data } = await http.get<TourDefRow>(`${env.apiBaseUrl}/api/tourdefs/${tourDefId}`);
  return data;
}

export interface CreateTourDefPayload {
  NOM: string;
  ALLER_RETOUR: number;
  VALEUR_VD: number;
  VALEUR_VE: number;
  VALEUR_ND: number;
  VALEUR_NE: number;
  VALEUR_DD: number;
  VALEUR_DE: number;
  BONUS_TYPE: number;
  BONUS_NB_BUT: number;
  VALEUR_BONUS_V: number;
  VALEUR_BONUS_N: number;
  VALEUR_BONUS_D: number;
  DUREE_TPS_REG: number;
  DUREE_TPS_PROLONG: number;
  CLASS_GAD: number;
  TDTYPETOUR: number;
  VALEUR_BE: number;
  FIN_PROLONG: number;
  FIN_TPS_REG: number;
  TDCLEFTRI: string;
  TDCalculDiffBut: number;
}

export async function createTourDef(payload: CreateTourDefPayload): Promise<TourDefRow | undefined> {
  const { data } = await http.post<TourDefRow>('/api/admin/tourdefs', payload);
  return data;
}

export async function fetchTourParticipants(tourId: string | number): Promise<TourParticipantRow[]> {
  const { data } = await http.get<{ data: TourParticipantRow[] }>(`${env.tourAdminResource}/${tourId}/participants`);
  return data.data ?? [];
}

export async function addTourParticipant(
  tourId: string | number,
  clubId: string,
  groupe = '',
  paSource = '',
): Promise<TourParticipantRow> {
  const { data } = await http.post<TourParticipantRow>(`${env.tourAdminResource}/${tourId}/participants`, {
    clubId,
    groupe,
    paSource,
  });
  return data;
}

export async function removeTourParticipants(
  tourId: string | number,
  clubIds: string[],
  participantIds: Array<string | number> = [],
): Promise<number> {
  const { data } = await http.delete<{ removed: number }>(`${env.tourAdminResource}/${tourId}/participants`, {
    data: { clubIds, participantIds },
  });
  return Number(data.removed ?? 0);
}

export async function fetchCircByTourType(typeId: number): Promise<CircOptionRow[]> {
  const { data } = await http.get<PaginatedResponse<CircOptionRow>>(env.circPublicResource, {
    params: { limit: 500, sort: 'IDCIRC', order: 'asc', page: 1 },
  });
  return (data.data ?? [])
    .map((row) => ({
      IDCIRC: String(row.IDCIRC ?? '').trim(),
      CIRC: String(row.CIRC ?? '').trim(),
      TYPE_TOUR: Number(row.TYPE_TOUR ?? 1) || 1,
    }))
    .filter((row) => row.TYPE_TOUR === typeId)
    .sort((a, b) => a.IDCIRC.localeCompare(b.IDCIRC, 'fr', { sensitivity: 'base' }));
}

export async function fetchTourRencontres(tourId: string | number): Promise<TourMatchRow[]> {
  const { data } = await http.get<{ data: TourMatchRow[] }>(`${env.tourAdminResource}/${tourId}/rencontres`);
  return data.data ?? [];
}

export async function fetchTourQualifs(tourId: string | number): Promise<QualifRow[]> {
  const { data } = await http.get<PaginatedResponse<QualifRow>>(env.qualifPublicResource, {
    params: {
      limit: 200,
      sort: 'CLASS_MinRang',
      order: 'asc',
      tucleunik: tourId,
      page: 1,
    },
  });
  return data.data ?? [];
}

export type CreateQualifPayload = Omit<QualifRow, 'CLASS_ID'>;

export async function createTourQualif(payload: CreateQualifPayload): Promise<QualifRow | undefined> {
  const { data } = await http.post<QualifRow>(env.qualifAdminResource, payload);
  return data;
}

export async function updateTourQualif(
  qualifId: string | number,
  payload: Partial<QualifRow>,
): Promise<QualifRow | undefined> {
  const { data } = await http.put<QualifRow>(`${env.qualifAdminResource}/${encodeURIComponent(String(qualifId))}`, payload);
  return data;
}

export async function deleteTourQualif(qualifId: string | number): Promise<void> {
  await http.delete(`${env.qualifAdminResource}/${encodeURIComponent(String(qualifId))}`);
}

export type CreateTourMatchPayload = Omit<TourMatchRow, 'RECLEUNIK'>;

export async function createTourRencontre(payload: CreateTourMatchPayload): Promise<TourMatchRow | undefined> {
  const { data } = await http.post<TourMatchRow>('/api/admin/rencontres', payload);
  return data;
}

export async function updateTourRencontre(
  rencontreId: string | number,
  payload: Partial<TourMatchRow>,
): Promise<TourMatchRow | undefined> {
  const { data } = await http.put<TourMatchRow>(`/api/admin/rencontres/${encodeURIComponent(String(rencontreId))}`, payload);
  return data;
}

export async function deleteTourRencontre(rencontreId: string | number): Promise<void> {
  await http.delete(`/api/admin/rencontres/${encodeURIComponent(String(rencontreId))}`);
}
