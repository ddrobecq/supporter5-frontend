import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export interface SanctionRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  BUTS: number;
  EN_CLUB: number;
}

export interface SanctionSaisonRow extends SanctionRow {
  SAISON: string;
}

export interface ExclusionRapideRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  MINUTE: number;
  MATCH_DATE: string;
  RECLEUNIK: number;
  EN_CLUB: number;
}

type SanctionMetric = 'avertissements' | 'exclusions';

export async function fetchSanctions(metric: SanctionMetric, signal?: AbortSignal): Promise<SanctionRow[]> {
  const { data } = await http.get<{ data: SanctionRow[] }>(
    `${env.statsPublicResource}/joueur/sanctions/${metric}/general`, { signal },
  );
  return data.data ?? [];
}

export async function fetchSanctionsParSaison(metric: SanctionMetric, signal?: AbortSignal): Promise<SanctionSaisonRow[]> {
  const { data } = await http.get<{ data: SanctionSaisonRow[] }>(
    `${env.statsPublicResource}/joueur/sanctions/${metric}/saison`, { signal },
  );
  return data.data ?? [];
}

export async function fetchExclusionsRapides(scope?: number | null, signal?: AbortSignal): Promise<ExclusionRapideRow[]> {
  const { data } = await http.get<{ data: ExclusionRapideRow[] }>(
    `${env.statsPublicResource}/joueur/sanctions/exclusions/rapides`,
    { params: scope != null ? { scope } : undefined, signal },
  );
  return data.data ?? [];
}
