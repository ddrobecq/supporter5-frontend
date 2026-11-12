import { env } from '../../config/env';
import { normalizeImagePayload, updateEntityImageWithFallback } from '../../lib/entityImageApi';
import type { CanDeleteResponse } from '../../lib/apiTypes';
import { fetchAllPages } from '../../lib/fetchAllPages';
import { http } from '../../lib/http';
import { encodePathSegment } from '../../lib/urlPath';
import type { EpreuveCreateWizardPayload, EpreuveRow, EpreuveSuggestionRow, PaginatedResponse } from './types';

export async function fetchEpreuve(search: string, signal?: AbortSignal): Promise<PaginatedResponse<EpreuveRow>> {
  return fetchAllPages<EpreuveRow>(env.epreuvePublicResource, {
    limit: 200,
    sort: 'EPREUVE',
    order: 'asc',
    ...(search ? { search } : {}),
  }, signal);
}

export async function fetchEpreuveById(id: string | number): Promise<EpreuveRow> {
  const { data } = await http.get<EpreuveRow>(`${env.epreuvePublicResource}/${encodePathSegment(id)}`);
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
  const { data } = await http.get<CanDeleteResponse>(`${env.epreuveAdminResource}/${encodePathSegment(id)}/can-delete`);
  return data;
}

export async function createEpreuveWithWizard(payload: EpreuveCreateWizardPayload): Promise<EpreuveRow | undefined> {
  const { data } = await http.post<EpreuveRow>(`${env.epreuveAdminResource}/wizard-create`, payload);
  return data;
}

export async function updateEpreuve(id: string | number, payload: EpreuveRow): Promise<EpreuveRow | undefined> {
  const image = normalizeImagePayload(payload.EPR_VISUEL);
  const { EPR_VISUEL: _visual, ...entityPayload } = payload;
  const { data } = await http.put<EpreuveRow>(`${env.epreuveAdminResource}/${encodePathSegment(id)}`, entityPayload);

  if (image !== undefined) {
    await updateEntityImageWithFallback('epreuve', id, image, async () => {
      await http.put(`${env.epreuveAdminResource}/${encodePathSegment(id)}`, { EPR_VISUEL: image });
    });
  }

  return data;
}

export async function deleteEpreuve(id: string | number): Promise<void> {
  await http.delete(`${env.epreuveAdminResource}/${encodePathSegment(id)}`);
}