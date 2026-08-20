import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export interface ArbitreMatchesRow {
  IDARBITRE: string;
  NOM: string;
  PRENOM: string;
  IDNATIO: string | null;
  MATCHES: number;
}

export async function fetchArbitreMatches(scope?: number | null, signal?: AbortSignal): Promise<ArbitreMatchesRow[]> {
  const { data } = await http.get<{ data: ArbitreMatchesRow[] }>(
    `${env.statsPublicResource}/arbitre/matches`,
    { params: scope != null ? { scope } : undefined, signal },
  );
  return data.data ?? [];
}
