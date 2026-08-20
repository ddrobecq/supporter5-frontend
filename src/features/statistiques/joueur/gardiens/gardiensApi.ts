import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export interface GardienRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  BUTS_ENCAISSES: number;
  MINUTES: number;
  MINUTES_PAR_BUT_ENCAISSE: number;
  EN_CLUB: number;
}

export async function fetchMeilleursGardiens(scope?: number | null, signal?: AbortSignal): Promise<GardienRow[]> {
  const { data } = await http.get<{ data: GardienRow[] }>(
    `${env.statsPublicResource}/joueur/gardiens/meilleurs`,
    { params: scope != null ? { scope } : undefined, signal },
  );
  return data.data ?? [];
}
