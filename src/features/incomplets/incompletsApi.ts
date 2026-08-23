import { http } from '../../lib/http';

export type JoueurIncompletCategory =
  | 'prenom'
  | 'naissance'
  | 'lieu-naissance'
  | 'mensurations'
  | 'matches'
  | 'portrait';

export interface JoueurIncompletRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string | null;
  SURNOM: string | null;
  IDNATIO: string | null;
  NAISSANCE: string | null;
  APPARITION: number;
  MATCHES_CALCULES: number;
  SANS_PRENOM: number;
  SANS_NAISSANCE: number;
  SANS_LIEU_NAISSANCE: number;
  SANS_MENSURATIONS: number;
  MATCHES_INCOMPLETS: number;
  SANS_PORTRAIT: number;
}

export const JOUEUR_INCOMPLET_CATEGORIES: Array<{
  key: JoueurIncompletCategory;
  label: string;
  flag: keyof JoueurIncompletRow;
}> = [
  { key: 'prenom', label: 'Sans prénom', flag: 'SANS_PRENOM' },
  { key: 'naissance', label: 'Sans date de naissance', flag: 'SANS_NAISSANCE' },
  { key: 'lieu-naissance', label: 'Sans lieu de naissance', flag: 'SANS_LIEU_NAISSANCE' },
  { key: 'mensurations', label: 'Mensurations inconnues', flag: 'SANS_MENSURATIONS' },
  { key: 'matches', label: 'Matches incomplets', flag: 'MATCHES_INCOMPLETS' },
  { key: 'portrait', label: 'Portrait absent', flag: 'SANS_PORTRAIT' },
];

export async function fetchJoueursIncomplets(signal?: AbortSignal): Promise<JoueurIncompletRow[]> {
  const { data } = await http.get<{ data: JoueurIncompletRow[] }>('/api/admin/incomplets/joueurs', { signal });
  return data.data ?? [];
}

export interface ClubIncompletRow {
  IDCLUB: string;
  CLUB: string;
  IDNATIO: string | null;
  SANS_PAYS: number;
  SANS_VILLE: number;
  SANS_STADE: number;
  SANS_DATE_CREATION: number;
  SANS_LOGO: number;
}

export const CLUB_INCOMPLET_CATEGORIES: Array<{
  key: string;
  label: string;
  flag: keyof ClubIncompletRow;
}> = [
  { key: 'pays', label: 'Pays inconnu', flag: 'SANS_PAYS' },
  { key: 'ville', label: 'Ville inconnue', flag: 'SANS_VILLE' },
  { key: 'stade', label: 'Stade inconnu', flag: 'SANS_STADE' },
  { key: 'creation', label: 'Date de création inconnue', flag: 'SANS_DATE_CREATION' },
  { key: 'logo', label: 'Logo manquant', flag: 'SANS_LOGO' },
];

export async function fetchClubsIncomplets(signal?: AbortSignal): Promise<ClubIncompletRow[]> {
  const { data } = await http.get<{ data: ClubIncompletRow[] }>('/api/admin/incomplets/clubs', { signal });
  return data.data ?? [];
}

export interface RencontreIncompleteRow {
  ROW_KEY: string;
  RECLEUNIK: number | null;
  MACLEUNIK: number | null;
  DATE: string | null;
  SAISON: string | null;
  ETAT: number | null;
  DOMICILE: string | null;
  EXTERIEUR: string | null;
  DOMICILE_NOM: string | null;
  EXTERIEUR_NOM: string | null;
  BUTDOM: number | null;
  BUTEXT: number | null;
  COMPET_NOM: string | null;
  SANS_ARBITRE: number;
  SANS_TERRAIN: number;
  SANS_ENTRAINEUR: number;
  EFFECTIF_KO: number;
  SCORE_INCONNU: number;
  SPECTATEURS_INCONNUS: number;
  BUTEURS_INCONNUS: number;
  BUTEURS_CLUB_INCONNUS: number;
  MINUTES_BUTS_INCONNUES: number;
  REMPLACEMENTS_INCOMPLETS: number;
  CLUBS_INCOHERENTS: number;
  DESYNCHRO: number;
}

export const RENCONTRE_INCOMPLETE_CATEGORIES: Array<{
  key: string;
  label: string;
  flag: keyof RencontreIncompleteRow;
}> = [
  { key: 'arbitre', label: 'Arbitre absent', flag: 'SANS_ARBITRE' },
  { key: 'terrain', label: 'Terrain inconnu', flag: 'SANS_TERRAIN' },
  { key: 'entraineur', label: 'Entraîneur inconnu', flag: 'SANS_ENTRAINEUR' },
  { key: 'effectif', label: 'Effectif incomplet ou surnuméraire', flag: 'EFFECTIF_KO' },
  { key: 'score', label: 'Score inconnu', flag: 'SCORE_INCONNU' },
  { key: 'spectateurs', label: 'Nombre de spectateurs inconnu', flag: 'SPECTATEURS_INCONNUS' },
  { key: 'buteurs', label: 'Buteurs inconnus', flag: 'BUTEURS_INCONNUS' },
  { key: 'buteurs-club', label: 'Buteurs du club inconnus', flag: 'BUTEURS_CLUB_INCONNUS' },
  { key: 'minutes-buts', label: 'Minutes de buts inconnues', flag: 'MINUTES_BUTS_INCONNUES' },
  { key: 'remplacements', label: 'Remplacements incomplets', flag: 'REMPLACEMENTS_INCOMPLETS' },
  { key: 'clubs', label: 'Clubs incohérents', flag: 'CLUBS_INCOHERENTS' },
  { key: 'desynchro', label: 'Désynchronisation RENCO / MATCH', flag: 'DESYNCHRO' },
];

export async function fetchRencontresIncompletes(signal?: AbortSignal): Promise<RencontreIncompleteRow[]> {
  const { data } = await http.get<{ data: RencontreIncompleteRow[] }>('/api/admin/incomplets/rencontres', { signal });
  return data.data ?? [];
}
