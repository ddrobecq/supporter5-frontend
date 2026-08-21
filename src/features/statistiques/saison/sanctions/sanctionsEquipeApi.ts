import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export type SanctionEquipeMetric =
  | 'avertissements'
  | 'exclusions'
  | 'avertissements-match'
  | 'exclusions-match';

export interface SanctionEquipeRow {
  SAISON: string;
  VALEUR: number;
}

export async function fetchSaisonSanctionsEquipe(metric: SanctionEquipeMetric, signal?: AbortSignal): Promise<SanctionEquipeRow[]> {
  const { data } = await http.get<{ data: SanctionEquipeRow[] }>(
    `${env.statsPublicResource}/saison/sanctions-equipe/${metric}`,
    { signal },
  );
  return data.data ?? [];
}
