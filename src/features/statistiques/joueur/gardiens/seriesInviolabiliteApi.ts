import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export interface SerieInviolabiliteRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  SERIE: number;
  SERIE_DEBUT: string;
  SERIE_FIN: string;
  EN_COURS: number;
  EN_CLUB: number;
}

export async function fetchSeriesInviolabilite(signal?: AbortSignal): Promise<SerieInviolabiliteRow[]> {
  const { data } = await http.get<{ data: SerieInviolabiliteRow[] }>(
    `${env.statsPublicResource}/joueur/gardiens/serie-inviolabilite`,
    { signal },
  );
  return data.data ?? [];
}
