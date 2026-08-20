import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export type PerformanceMetric = 'victoires' | 'nuls' | 'defaites';

export interface PerformanceRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  RESULTATS: number;
  MATCHES: number;
  POURCENTAGE: number;
  EN_CLUB: number;
}

export async function fetchPerformances(metric: PerformanceMetric, scope?: number | null, signal?: AbortSignal): Promise<PerformanceRow[]> {
  const { data } = await http.get<{ data: PerformanceRow[] }>(
    `${env.statsPublicResource}/joueur/performances/${metric}`,
    { params: scope != null ? { scope } : undefined, signal },
  );
  return data.data ?? [];
}
