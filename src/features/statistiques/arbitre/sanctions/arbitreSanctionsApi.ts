import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export type ArbitreSanctionMetric = 'avertissements' | 'exclusions';

export interface ArbitreSanctionRow {
  IDARBITRE: string;
  NOM: string;
  PRENOM: string;
  IDNATIO: string | null;
  TOTAL: number;
}

export async function fetchArbitreSanctions(metric: ArbitreSanctionMetric, scope?: number | null, signal?: AbortSignal): Promise<ArbitreSanctionRow[]> {
  const { data } = await http.get<{ data: ArbitreSanctionRow[] }>(
    `${env.statsPublicResource}/arbitre/sanctions/${metric}`,
    { params: scope != null ? { scope } : undefined, signal },
  );
  return data.data ?? [];
}
