import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export type ButsEquipeMetric =
  | 'buts-pour'
  | 'buts-contre'
  | 'buts-pour-match'
  | 'buts-contre-match'
  | 'buts-match';

export interface ButsEquipeRow {
  SAISON: string;
  VALEUR: number;
}

export async function fetchSaisonButsEquipe(metric: ButsEquipeMetric, signal?: AbortSignal): Promise<ButsEquipeRow[]> {
  const { data } = await http.get<{ data: ButsEquipeRow[] }>(
    `${env.statsPublicResource}/saison/buts-equipe/${metric}`,
    { signal },
  );
  return data.data ?? [];
}
