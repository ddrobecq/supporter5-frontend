import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';
import type { StatPlayerRow } from '../../components/StatPlayerGrid';

export interface ParSaisonRow extends StatPlayerRow {
  SAISON: string;
  APPARITIONS: number;
}

export async function fetchParSaison(signal?: AbortSignal): Promise<ParSaisonRow[]> {
  const { data } = await http.get<{ data: ParSaisonRow[] }>(
    `${env.statsPublicResource}/joueur/apparitions/saison`,
    { signal },
  );
  return data.data ?? [];
}
