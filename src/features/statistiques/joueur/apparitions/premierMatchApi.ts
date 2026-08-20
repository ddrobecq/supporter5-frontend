import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export interface PremierMatchRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  NAISSANCE: string; // YYYY-MM-DD format
  FIRST_DATE: string; // YYYY-MM-DD format
  MACLEUNIK: number;
  RECLEUNIK: number; // Encounter ID for match link
}

async function fetchAppearance(path: string, scope?: number | null, signal?: AbortSignal): Promise<PremierMatchRow[]> {
  const { data } = await http.get<{ data: PremierMatchRow[] }>(
    `${env.statsPublicResource}/joueur/apparitions/${path}`,
    { params: scope != null ? { scope } : undefined, signal },
  );
  return data.data ?? [];
}

export function fetchPremierMatch(scope?: number | null, signal?: AbortSignal): Promise<PremierMatchRow[]> {
  return fetchAppearance('plus-jeune', scope, signal);
}

export function fetchDernierMatch(scope?: number | null, signal?: AbortSignal): Promise<PremierMatchRow[]> {
  return fetchAppearance('plus-vieux', scope, signal);
}
