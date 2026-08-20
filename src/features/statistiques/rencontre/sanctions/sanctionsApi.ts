import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export type SanctionMetric = 'avertissements' | 'exclusions';

export interface RencontreSanctionRow {
  RECLEUNIK: number;
  DATE: string;
  CIRC_COMPLET: string;
  TERRAIN_NOM: string;
  ADVERSAIRE_ID: string;
  ADVERSAIRE_NOM: string;
  ADVERSAIRE_IDNATIO: string | null;
  NB_SANCTIONS: number;
}

export async function fetchRencontreSanctions(metric: SanctionMetric, scope?: number | null, signal?: AbortSignal): Promise<RencontreSanctionRow[]> {
  const { data } = await http.get<{ data: RencontreSanctionRow[] }>(
    `${env.statsPublicResource}/rencontre/sanctions/${metric}`,
    { params: scope != null ? { scope } : undefined, signal },
  );
  return data.data ?? [];
}
