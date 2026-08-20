import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export type TransfertMetric = 'achats' | 'ventes' | 'plus-values' | 'moins-values';

export interface TransfertRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  MONTANT: number;
  CLUB_ID: string | null;
  CLUB_NOM: string | null;
  CLUB_IDNATIO: string | null;
  EN_CLUB: number;
}

export async function fetchTransferts(metric: TransfertMetric, signal?: AbortSignal): Promise<TransfertRow[]> {
  const { data } = await http.get<{ data: TransfertRow[] }>(
    `${env.statsPublicResource}/joueur/transferts/${metric}`,
    { signal },
  );
  return data.data ?? [];
}
