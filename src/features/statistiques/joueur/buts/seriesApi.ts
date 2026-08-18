import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export interface SerieButeurRow {
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

export async function fetchSeriesButeurs(metric: 'buts' | 'passes' = 'buts', signal?: AbortSignal): Promise<SerieButeurRow[]> {
  const { data } = await http.get<{ data: SerieButeurRow[] }>(
    `${env.statsPublicResource}/joueur/${metric}/serie`,
    { signal },
  );
  return data.data ?? [];
}
