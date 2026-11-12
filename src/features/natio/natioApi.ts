import { env } from '../../config/env';
import { normalizeImagePayload, updateEntityImageWithFallback } from '../../lib/entityImageApi';
import type { CanDeleteResponse } from '../../lib/apiTypes';
import { fetchAllPages } from '../../lib/fetchAllPages';
import { http } from '../../lib/http';
import { notifyNatioChanged } from './natioChanges';
import { encodePathSegment } from '../../lib/urlPath';
import type { NatioRow, PaginatedResponse } from './types';

export async function fetchNatio(search: string, signal?: AbortSignal): Promise<PaginatedResponse<NatioRow>> {
  return fetchAllPages<NatioRow>(env.natioPublicResource, {
    pageSize: 200,
    sort: 'PAYS',
    order: 'asc',
    ...(search ? { search } : {}),
  }, signal);
}

export async function fetchNatioById(id: string | number): Promise<NatioRow> {
  const { data } = await http.get<NatioRow>(`${env.natioPublicResource}/${encodePathSegment(id)}`);
  return data;
}

export async function canDeleteNatio(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(
    `${env.natioAdminResource}/${encodePathSegment(id)}/can-delete`,
  );
  return data;
}

export async function createNatio(payload: NatioRow): Promise<NatioRow | undefined> {
  const image = normalizeImagePayload(payload.NAT_DRAPEAU);
  const { NAT_DRAPEAU: _flag, ...entityPayload } = payload;
  const { data } = await http.post<NatioRow>(env.natioAdminResource, entityPayload);
  // Invalidation des que l'entite est enregistree, meme si l'etape image echoue ensuite.
  notifyNatioChanged();

  if (image !== undefined) {
    const id = (data?.IDNATIO ?? entityPayload.IDNATIO) as string | number | undefined;
    if (id !== undefined && id !== null && String(id).trim() !== '') {
      await updateEntityImageWithFallback('natio', id, image, async () => {
        await http.put(`${env.natioAdminResource}/${encodePathSegment(id)}`, { NAT_DRAPEAU: image });
      });
    }
  }

  return data;
}

export async function updateNatio(id: string | number, payload: NatioRow): Promise<NatioRow | undefined> {
  const image = normalizeImagePayload(payload.NAT_DRAPEAU);
  const { NAT_DRAPEAU: _flag, ...entityPayload } = payload;
  const { data } = await http.put<NatioRow>(`${env.natioAdminResource}/${encodePathSegment(id)}`, entityPayload);
  // Invalidation des que l'entite est enregistree, meme si l'etape image echoue ensuite.
  notifyNatioChanged();

  if (image !== undefined) {
    await updateEntityImageWithFallback('natio', id, image, async () => {
      await http.put(`${env.natioAdminResource}/${encodePathSegment(id)}`, { NAT_DRAPEAU: image });
    });
  }

  return data;
}

export async function deleteNatio(id: string | number): Promise<void> {
  await http.delete(`${env.natioAdminResource}/${encodePathSegment(id)}`);
  notifyNatioChanged();
}
