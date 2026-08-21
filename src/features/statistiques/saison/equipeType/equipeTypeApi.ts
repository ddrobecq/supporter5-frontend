import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export interface EquipeTypeJoueur {
  CODE: string;
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  TITULARISATIONS: number;
}

export interface EquipeTypeResult {
  SAISON: string;
  MATCHES_TOTAL: number;
  MATCHES_FORMATION: number;
  FORMATION: string;
  POSTES: EquipeTypeJoueur[];
  ENTRAINEUR: EquipeTypeJoueur | null;
}

export async function fetchEquipeType(saison: string, signal?: AbortSignal): Promise<EquipeTypeResult | null> {
  const { data } = await http.get<{ data: EquipeTypeResult }>(
    `${env.statsPublicResource}/saison/equipe-type`,
    { params: { saison }, signal },
  );
  return data.data ?? null;
}

/** Equipe type historique (toutes saisons confondues), memes calculs mais sans filtre de saison. */
export async function fetchEquipeTypeHistorique(signal?: AbortSignal): Promise<EquipeTypeResult | null> {
  const { data } = await http.get<{ data: EquipeTypeResult }>(
    `${env.statsPublicResource}/joueur/apparitions/equipe-type`,
    { signal },
  );
  return data.data ?? null;
}
