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

async function fetchAppearance(path: string, signal?: AbortSignal): Promise<PremierMatchRow[]> {
  const { data } = await http.get<{ data: PremierMatchRow[] }>(
    `${env.statsPublicResource}/joueur/apparitions/${path}`,
    { signal },
  );
  return data.data ?? [];
}

export function fetchPremierMatch(signal?: AbortSignal): Promise<PremierMatchRow[]> {
  return fetchAppearance('plus-jeune', signal);
}

export function fetchDernierMatch(signal?: AbortSignal): Promise<PremierMatchRow[]> {
  return fetchAppearance('plus-vieux', signal);
}
