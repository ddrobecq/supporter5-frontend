import { env } from '../../config/env';
import { http } from '../../lib/http';
import type {
  SaisonCreateWizardPayload,
  SaisonCreateWizardResult,
  SaisonRow,
  SaisonWizardCompetitionRow,
  SaisonWizardJoueurRow,
} from './types';

export async function fetchLastSaison(signal?: AbortSignal): Promise<SaisonRow | undefined> {
  const { data } = await http.get<{ data: SaisonRow[] }>(env.saisonPublicResource, {
    params: { sort: 'SAISON', order: 'desc', limit: 1, page: 1 },
    signal,
  });
  return data.data?.[0];
}

export async function fetchSaisonRosterForWizard(
  previousSaison: string,
  signal?: AbortSignal,
): Promise<SaisonWizardJoueurRow[]> {
  const { data } = await http.get<{ data: SaisonWizardJoueurRow[] }>(
    `${env.joueurPublicResource}/season-roster/${encodeURIComponent(previousSaison)}`,
    { signal },
  );
  return data.data ?? [];
}

export async function fetchSaisonCompetitionsForWizard(
  previousSaison: string,
  signal?: AbortSignal,
): Promise<SaisonWizardCompetitionRow[]> {
  const { data } = await http.get<{ data: SaisonWizardCompetitionRow[] }>(env.competitionPublicResource, {
    params: {
      limit: 500,
      sort: 'NOM',
      order: 'asc',
      saison: previousSaison,
      page: 1,
    },
    signal,
  });
  return data.data ?? [];
}

export async function createSaisonWithWizard(payload: SaisonCreateWizardPayload): Promise<SaisonCreateWizardResult> {
  const { data } = await http.post<SaisonCreateWizardResult>(`${env.saisonAdminResource}/wizard-create`, payload);
  return data;
}
