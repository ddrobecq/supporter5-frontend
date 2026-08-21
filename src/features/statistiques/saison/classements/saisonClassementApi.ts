import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export type SaisonClassementMetric = 'temps' | 'buts' | 'passes' | 'sanctions';

export interface SaisonClassementRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  SAISON: string;
  VALEUR: number;
  JAUNES: number;
  ROUGES: number;
  EN_CLUB: number;
}

export async function fetchSaisons(signal?: AbortSignal): Promise<string[]> {
  const { data } = await http.get<{ data: string[] }>(
    `${env.statsPublicResource}/saison/liste`,
    { signal },
  );
  return data.data ?? [];
}

export async function fetchSaisonClassement(metric: SaisonClassementMetric, saison: string, signal?: AbortSignal): Promise<SaisonClassementRow[]> {
  const { data } = await http.get<{ data: SaisonClassementRow[] }>(
    `${env.statsPublicResource}/saison/${metric}`,
    { params: { saison }, signal },
  );
  return data.data ?? [];
}
