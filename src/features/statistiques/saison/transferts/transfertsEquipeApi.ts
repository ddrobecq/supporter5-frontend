import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export type TransfertEquipeMetric = 'achats-cumules' | 'ventes-cumulees';

export interface TransfertEquipeRow {
  SAISON: string;
  VALEUR: number;
}

export async function fetchSaisonTransferts(metric: TransfertEquipeMetric, signal?: AbortSignal): Promise<TransfertEquipeRow[]> {
  const { data } = await http.get<{ data: TransfertEquipeRow[] }>(
    `${env.statsPublicResource}/saison/transferts/${metric}`,
    { signal },
  );
  return data.data ?? [];
}
