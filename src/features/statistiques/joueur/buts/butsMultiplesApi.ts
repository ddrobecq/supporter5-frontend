import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export type ButsMultiplesVariant = 'doubles' | 'triples' | 'quadruples';

export interface ButsMultiplesRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  MATCHES: number;
  EN_CLUB: number;
}

export async function fetchButsMultiplesParJoueur(metric: 'buts' | 'passes', variant: ButsMultiplesVariant, scope?: number | null, signal?: AbortSignal): Promise<ButsMultiplesRow[]> {
  const { data } = await http.get<{ data: ButsMultiplesRow[] }>(
    `${env.statsPublicResource}/joueur/${metric}/${variant}`,
    { params: scope != null ? { scope } : undefined, signal },
  );
  return data.data ?? [];
}
