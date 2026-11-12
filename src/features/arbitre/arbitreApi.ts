import { env } from '../../config/env';
import { normalizeImagePayload, updateEntityImageWithFallback } from '../../lib/entityImageApi';
import type { CanDeleteResponse } from '../../lib/apiTypes';
import { fetchAllPages } from '../../lib/fetchAllPages';
import { http } from '../../lib/http';
import { encodePathSegment } from '../../lib/urlPath';
import type { ArbitreCreateWizardPayload, ArbitreRow, ArbitreSuggestionRow, PaginatedResponse } from './types';

export async function fetchArbitre(search: string, signal?: AbortSignal): Promise<PaginatedResponse<ArbitreRow>> {
  return fetchAllPages<ArbitreRow>(env.arbitrePublicResource, {
    limit: 200,
    sort: 'NOM',
    order: 'asc',
    ...(search ? { search } : {}),
  }, signal);
}

export async function fetchArbitreById(id: string | number): Promise<ArbitreRow> {
  const { data } = await http.get<ArbitreRow>(`${env.arbitrePublicResource}/${encodePathSegment(id)}`);
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
    `${env.arbitreAdminResource}/${encodePathSegment(id)}/can-delete`,
  );
  return data;
}

export async function createArbitreWithWizard(payload: ArbitreCreateWizardPayload): Promise<ArbitreRow | undefined> {
  const { data } = await http.post<ArbitreRow>(`${env.arbitreAdminResource}/wizard-create`, payload);
  return data;
}

export async function updateArbitre(id: string | number, payload: ArbitreRow): Promise<ArbitreRow | undefined> {
  const image = normalizeImagePayload(payload.ARB_PHOTO);
  const { ARB_PHOTO: _photo, ...entityPayload } = payload;
  const { data } = await http.put<ArbitreRow>(`${env.arbitreAdminResource}/${encodePathSegment(id)}`, entityPayload);

  if (image !== undefined) {
    await updateEntityImageWithFallback('arbitre', id, image, async () => {
      await http.put(`${env.arbitreAdminResource}/${encodePathSegment(id)}`, { ARB_PHOTO: image });
    });
  }

  return data;
}

export async function deleteArbitre(id: string | number): Promise<void> {
  await http.delete(`${env.arbitreAdminResource}/${encodePathSegment(id)}`);
}
