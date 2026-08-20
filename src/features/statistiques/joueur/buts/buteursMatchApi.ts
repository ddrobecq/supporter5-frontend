import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export interface ButeurMatchRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  BUTS: number;
  MATCH_DATE: string;
  RECLEUNIK: number;
  EN_CLUB: number;
}

export async function fetchButeursParMatch(metric: 'buts' | 'passes' = 'buts', scope?: number | null, signal?: AbortSignal): Promise<ButeurMatchRow[]> {
  const { data } = await http.get<{ data: ButeurMatchRow[] }>(
    `${env.statsPublicResource}/joueur/${metric}/match`,
    { params: scope != null ? { scope } : undefined, signal },
  );
  return data.data ?? [];
}
