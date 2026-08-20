import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export type RencontreSerieMetric = 'victoires' | 'nuls' | 'defaites' | 'invincibilite' | 'inviolabilite' | 'inefficacite';

export interface RencontreSerieRow {
  SERIE: number;
  SERIE_DEBUT: string;
  SERIE_DEBUT_RECLEUNIK: number;
  SERIE_FIN: string;
  SERIE_FIN_RECLEUNIK: number;
  EN_COURS: number;
}

export async function fetchRencontreSeries(metric: RencontreSerieMetric, scope?: number | null, signal?: AbortSignal): Promise<RencontreSerieRow[]> {
  const { data } = await http.get<{ data: RencontreSerieRow[] }>(
    `${env.statsPublicResource}/rencontre/series/${metric}`,
    { params: scope != null ? { scope } : undefined, signal },
  );
  return data.data ?? [];
}
