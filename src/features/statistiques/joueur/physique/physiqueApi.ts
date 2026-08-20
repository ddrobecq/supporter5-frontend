import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export type PhysiqueMetric = 'grands' | 'petits' | 'gabarits';

export interface PhysiqueRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  HAUTEUR: number;
  POIDS: number | null;
  IMC: number | null;
  EN_CLUB: number;
}

export async function fetchPhysique(metric: PhysiqueMetric, signal?: AbortSignal): Promise<PhysiqueRow[]> {
  const { data } = await http.get<{ data: PhysiqueRow[] }>(
    `${env.statsPublicResource}/joueur/physique/${metric}`,
    { signal },
  );
  return data.data ?? [];
}
