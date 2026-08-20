import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export interface AffluenceRow {
  RECLEUNIK: number;
  DATE: string;
  CIRC_COMPLET: string;
  TERRAIN_NOM: string;
  ADVERSAIRE_ID: string;
  ADVERSAIRE_NOM: string;
  ADVERSAIRE_IDNATIO: string | null;
  NBSPECT: number;
}

export async function fetchAffluence(scope?: number | null, signal?: AbortSignal): Promise<AffluenceRow[]> {
  const { data } = await http.get<{ data: AffluenceRow[] }>(
    `${env.statsPublicResource}/rencontre/affluence`,
    { params: scope != null ? { scope } : undefined, signal },
  );
  return data.data ?? [];
}
