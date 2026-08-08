import { env } from '../../config/env';
import { normalizeImagePayload, updateEntityImageWithFallback } from '../../lib/entityImageApi';
import { http } from '../../lib/http';
import type {
  CanDeleteResponse,
  GridResponse,
  JoueurCreateWizardPayload,
  JoueurHistoryRow,
  JoueurGridRow,
  JoueurRow,
  JoueurTransactionOptions,
  JoueurTransactionRow,
  JoueurTransactionUpsertPayload,
  PaginatedResponse,
  PosteOption,
  SaisonRow,
  JoueurSuggestionRow,
} from './types';

export async function fetchJoueursGrid(
  season: string,
  search: string,
  signal?: AbortSignal,
  posType?: number,
): Promise<JoueurGridRow[]> {
  const { data } = await http.get<GridResponse<JoueurGridRow>>(`${env.joueurPublicResource}/grid`, {
    params: {
      season,
      ...(search ? { search } : {}),
      ...(posType != null ? { posType } : {}),
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

export async function fetchJoueurSuggestions(search: string, signal?: AbortSignal): Promise<GridResponse<JoueurSuggestionRow>> {
  const { data } = await http.get<GridResponse<JoueurSuggestionRow>>(`${env.joueurPublicResource}/suggest`, {
    params: { search, limit: 12 },
    signal,
    timeout: 30000,
  });
  return data;
}

export async function fetchJoueurHistory(id: string | number): Promise<JoueurHistoryRow[]> {
  const { data } = await http.get<GridResponse<JoueurHistoryRow>>(`${env.joueurPublicResource}/${id}/history`);
  return data.data ?? [];
}

export async function fetchJoueurTransactions(id: string | number): Promise<JoueurTransactionRow[]> {
  const { data } = await http.get<GridResponse<JoueurTransactionRow>>(`${env.joueurPublicResource}/${id}/transactions`);
  return data.data ?? [];
}

export async function fetchJoueurTransactionOptions(id: string | number): Promise<JoueurTransactionOptions> {
  const { data } = await http.get<JoueurTransactionOptions>(`${env.joueurPublicResource}/${id}/transactions/options`);
  return data;
}

export async function createJoueurTransaction(
  id: string | number,
  payload: JoueurTransactionUpsertPayload,
): Promise<JoueurTransactionRow> {
  const { data } = await http.post<JoueurTransactionRow>(`${env.joueurAdminResource}/${id}/transactions`, payload);
  return data;
}

export async function updateJoueurTransaction(
  id: string | number,
  transactionId: string | number,
  payload: JoueurTransactionUpsertPayload,
): Promise<JoueurTransactionRow> {
  const { data } = await http.put<JoueurTransactionRow>(`${env.joueurAdminResource}/${id}/transactions/${transactionId}`, payload);
  return data;
}

export async function deleteJoueurTransaction(
  id: string | number,
  transactionId: string | number,
): Promise<void> {
  await http.delete(`${env.joueurAdminResource}/${id}/transactions/${transactionId}`);
}

export async function createJoueurHistory(
  id: string | number,
  payload: { saison: string; poste: number | string },
): Promise<JoueurHistoryRow> {
  const { data } = await http.post<JoueurHistoryRow>(`${env.joueurAdminResource}/${id}/history`, payload);
  return data;
}

export async function updateJoueurHistory(
  id: string | number,
  historyId: string | number,
  payload: { saison: string; poste: number | string },
): Promise<JoueurHistoryRow> {
  const { data } = await http.put<JoueurHistoryRow>(`${env.joueurAdminResource}/${id}/history/${historyId}`, payload);
  return data;
}

export async function deleteJoueurHistory(
  id: string | number,
  historyId: string | number,
): Promise<void> {
  await http.delete(`${env.joueurAdminResource}/${id}/history/${historyId}`);
}

export async function createJoueur(payload: JoueurRow): Promise<JoueurRow | undefined> {
  const image = normalizeImagePayload(payload.PHOTO);
  const { PHOTO: _photo, ...entityPayload } = payload;
  const { data } = await http.post<JoueurRow>(env.joueurAdminResource, entityPayload);

  if (image !== undefined) {
    const id = (data?.IDJOUEUR ?? entityPayload.IDJOUEUR) as string | number | undefined;
    if (id !== undefined && id !== null && String(id).trim() !== '') {
      await updateEntityImageWithFallback('joueurrg', id, image, async () => {
        await http.put(`${env.joueurAdminResource}/${id}`, { PHOTO: image });
      });
    }
  }

  return data;
}

export async function createJoueurWithWizard(payload: JoueurCreateWizardPayload): Promise<JoueurRow | undefined> {
  const { data } = await http.post<JoueurRow>(`${env.joueurAdminResource}/wizard-create`, payload);
  return data;
}

export async function updateJoueur(id: string | number, payload: JoueurRow): Promise<JoueurRow | undefined> {
  const image = normalizeImagePayload(payload.PHOTO);
  const { PHOTO: _photo, ...entityPayload } = payload;
  const { data } = await http.put<JoueurRow>(`${env.joueurAdminResource}/${id}`, entityPayload);

  if (image !== undefined) {
    await updateEntityImageWithFallback('joueurrg', id, image, async () => {
      await http.put(`${env.joueurAdminResource}/${id}`, { PHOTO: image });
    });
  }

  return data;
}

export async function deleteJoueur(id: string | number): Promise<void> {
  await http.delete(`${env.joueurAdminResource}/${id}`);
}

export async function canDeleteJoueur(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(`${env.joueurAdminResource}/${id}/can-delete`);
  return data;
}
