import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export interface ButeurRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  BUTS: number;
  EN_CLUB: number;
}

export interface ButeurSaisonRow extends ButeurRow {
  SAISON: string;
}

export interface EfficaciteButeurRow extends ButeurRow {
  MATCHES: number;
  MINUTES: number;
  MINUTES_PAR_BUT: number;
}

type ScoringMetric = 'buts' | 'passes';

export async function fetchButeurs(metric: ScoringMetric = 'buts', signal?: AbortSignal): Promise<ButeurRow[]> {
  const { data } = await http.get<{ data: ButeurRow[] }>(
    `${env.statsPublicResource}/joueur/${metric}/general`,
    { signal },
  );
  return data.data ?? [];
}

export async function fetchButeursParSaison(metric: ScoringMetric = 'buts', signal?: AbortSignal): Promise<ButeurSaisonRow[]> {
  const { data } = await http.get<{ data: ButeurSaisonRow[] }>(
    `${env.statsPublicResource}/joueur/${metric}/saison`,
    { signal },
  );
  return data.data ?? [];
}

export async function fetchEfficaciteButeurs(metric: ScoringMetric = 'buts', signal?: AbortSignal): Promise<EfficaciteButeurRow[]> {
  const { data } = await http.get<{ data: EfficaciteButeurRow[] }>(
    `${env.statsPublicResource}/joueur/${metric}/moyenne`,
    { signal },
  );
  return data.data ?? [];
}
