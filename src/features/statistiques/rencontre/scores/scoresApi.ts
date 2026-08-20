import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export type ScoreMetric = 'victoires' | 'defaites' | 'prolifiques';

export interface ScoreRow {
  RECLEUNIK: number;
  DATE: string;
  CIRC_COMPLET: string;
  TERRAIN_NOM: string;
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
  ADVERSAIRE_ID: string;
  ADVERSAIRE_NOM: string;
  ADVERSAIRE_IDNATIO: string | null;
  BUT_POUR: number;
  BUT_CONTRE: number;
  ECART: number;
  TOTAL_BUTS: number;
}

export async function fetchScores(metric: ScoreMetric, scope?: number | null, signal?: AbortSignal): Promise<ScoreRow[]> {
  const { data } = await http.get<{ data: ScoreRow[] }>(
    `${env.statsPublicResource}/rencontre/scores/${metric}`,
    { params: scope != null ? { scope } : undefined, signal },
  );
  return data.data ?? [];
}
