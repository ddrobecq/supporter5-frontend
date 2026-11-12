import { env } from '../../config/env';
import { normalizeImagePayload, updateEntityImageWithFallback } from '../../lib/entityImageApi';
import { fetchAllPages } from '../../lib/fetchAllPages';
import { http } from '../../lib/http';
import { encodePathSegment } from '../../lib/urlPath';
import type {
  CanDeleteResponse,
  GridResponse,
  JoueurCreateWizardPayload,
  JoueurHistoryRow,
  JoueurGridRow,
  JoueurMatchRow,
  JoueurRow,
  JoueurTransactionOptions,
  JoueurTransactionRow,
  JoueurTransactionUpsertPayload,
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
  const { data } = await fetchAllPages<SaisonRow>(env.saisonPublicResource, {
    pageSize: 200,
    sort: 'SAISON',
    order: 'desc',
  }, signal);
  return data ?? [];
}

export async function fetchJoueurById(id: string | number, signal?: AbortSignal): Promise<JoueurRow> {
  const { data } = await http.get<JoueurRow>(`${env.joueurPublicResource}/${encodePathSegment(id)}`, { signal });
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

export async function fetchJoueurHistory(id: string | number, signal?: AbortSignal): Promise<JoueurHistoryRow[]> {
  const { data } = await http.get<GridResponse<JoueurHistoryRow>>(`${env.joueurPublicResource}/${encodePathSegment(id)}/history`, { signal });
  return data.data ?? [];
}

export async function fetchJoueurTransactions(id: string | number, signal?: AbortSignal): Promise<JoueurTransactionRow[]> {
  const { data } = await http.get<GridResponse<JoueurTransactionRow>>(`${env.joueurPublicResource}/${encodePathSegment(id)}/transactions`, { signal });
  return data.data ?? [];
}

export async function fetchJoueurTransactionOptions(id: string | number): Promise<JoueurTransactionOptions> {
  const { data } = await http.get<JoueurTransactionOptions>(`${env.joueurPublicResource}/${encodePathSegment(id)}/transactions/options`);
  return data;
}

export async function createJoueurTransaction(
  id: string | number,
  payload: JoueurTransactionUpsertPayload,
): Promise<JoueurTransactionRow> {
  const { data } = await http.post<JoueurTransactionRow>(`${env.joueurAdminResource}/${encodePathSegment(id)}/transactions`, payload);
  return data;
}

export async function updateJoueurTransaction(
  id: string | number,
  transactionId: string | number,
  payload: JoueurTransactionUpsertPayload,
): Promise<JoueurTransactionRow> {
  const { data } = await http.put<JoueurTransactionRow>(`${env.joueurAdminResource}/${encodePathSegment(id)}/transactions/${encodePathSegment(transactionId)}`, payload);
  return data;
}

export async function deleteJoueurTransaction(
  id: string | number,
  transactionId: string | number,
): Promise<void> {
  await http.delete(`${env.joueurAdminResource}/${encodePathSegment(id)}/transactions/${encodePathSegment(transactionId)}`);
}

export async function createJoueurHistory(
  id: string | number,
  payload: { saison: string; poste: number | string },
): Promise<JoueurHistoryRow> {
  const { data } = await http.post<JoueurHistoryRow>(`${env.joueurAdminResource}/${encodePathSegment(id)}/history`, payload);
  return data;
}

export async function updateJoueurHistory(
  id: string | number,
  historyId: string | number,
  payload: { saison: string; poste: number | string },
): Promise<JoueurHistoryRow> {
  const { data } = await http.put<JoueurHistoryRow>(`${env.joueurAdminResource}/${encodePathSegment(id)}/history/${encodePathSegment(historyId)}`, payload);
  return data;
}

export async function deleteJoueurHistory(
  id: string | number,
  historyId: string | number,
): Promise<void> {
  await http.delete(`${env.joueurAdminResource}/${encodePathSegment(id)}/history/${encodePathSegment(historyId)}`);
}

export async function createJoueurWithWizard(payload: JoueurCreateWizardPayload): Promise<JoueurRow | undefined> {
  const { data } = await http.post<JoueurRow>(`${env.joueurAdminResource}/wizard-create`, payload);
  return data;
}

export async function updateJoueur(id: string | number, payload: JoueurRow): Promise<JoueurRow | undefined> {
  const image = normalizeImagePayload(payload.PHOTO);
  const { PHOTO: _photo, ...entityPayload } = payload;
  const { data } = await http.put<JoueurRow>(`${env.joueurAdminResource}/${encodePathSegment(id)}`, entityPayload);

  if (image !== undefined) {
    await updateEntityImageWithFallback('joueurrg', id, image, async () => {
      await http.put(`${env.joueurAdminResource}/${encodePathSegment(id)}`, { PHOTO: image });
    });
  }

  return data;
}

export async function deleteJoueur(id: string | number): Promise<void> {
  await http.delete(`${env.joueurAdminResource}/${encodePathSegment(id)}`);
}

export async function canDeleteJoueur(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(`${env.joueurAdminResource}/${encodePathSegment(id)}/can-delete`);
  return data;
}

export async function fetchJoueurSeasonsByPlayedMatches(id: string | number): Promise<string[]> {
  const { data } = await http.get<GridResponse<string>>(`${env.joueurPublicResource}/${encodePathSegment(id)}/matches/seasons`);
  return data.data ?? [];
}

export async function fetchJoueurMatches(id: string | number, saison: string): Promise<JoueurMatchRow[]> {
  const { data } = await http.get<GridResponse<JoueurMatchRow>>(`${env.joueurPublicResource}/${encodePathSegment(id)}/matches/${encodePathSegment(saison)}`);
  return data.data ?? [];
}
