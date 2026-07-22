import { env } from '../../config/env';
import { http } from '../../lib/http';
import type { EpreuveCreateWizardPayload, EpreuveRow, EpreuveSuggestionRow, PaginatedResponse } from './types';

export interface IntegrityConstraint {
  table: string;
  count: number;
  description: string;
}

export interface CanDeleteResponse {
  canDelete: boolean;
  constraints: IntegrityConstraint[];
}

export async function fetchEpreuve(search: string, signal?: AbortSignal): Promise<PaginatedResponse<EpreuveRow>> {
  const { data } = await http.get<PaginatedResponse<EpreuveRow>>(env.epreuvePublicResource, {
    params: { limit: 200, sort: 'EPREUVE', order: 'asc', ...(search ? { search } : {}), page: 1 },
    signal,
  });
  return data;
}

export async function fetchEpreuveById(id: string | number): Promise<EpreuveRow> {
  const { data } = await http.get<EpreuveRow>(`${env.epreuvePublicResource}/${id}`);
  return data;
}

export async function fetchEpreuveSuggestions(search: string, signal?: AbortSignal): Promise<{ data: EpreuveSuggestionRow[] }> {
  const { data } = await http.get<{ data: EpreuveSuggestionRow[] }>(`${env.epreuvePublicResource}/suggest`, {
    params: { search, limit: 12 },
    signal,
    timeout: 30000,
  });
  return data;
}

export async function canDeleteEpreuve(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(`${env.epreuveAdminResource}/${id}/can-delete`);
  return data;
}

export async function createEpreuve(payload: EpreuveRow): Promise<EpreuveRow | undefined> {
  const { data } = await http.post<EpreuveRow>(env.epreuveAdminResource, payload);
  return data;
}

export async function createEpreuveWithWizard(payload: EpreuveCreateWizardPayload): Promise<EpreuveRow | undefined> {
  const { data } = await http.post<EpreuveRow>(`${env.epreuveAdminResource}/wizard-create`, payload);
  return data;
}

export async function updateEpreuve(id: string | number, payload: EpreuveRow): Promise<EpreuveRow | undefined> {
  const { data } = await http.put<EpreuveRow>(`${env.epreuveAdminResource}/${id}`, payload);
  return data;
}

export async function deleteEpreuve(id: string | number): Promise<void> {
  await http.delete(`${env.epreuveAdminResource}/${id}`);
}