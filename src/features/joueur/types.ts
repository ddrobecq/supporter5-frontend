export interface JoueurGridRow {
  JOCLEUNIK: number;
  IDJOUEUR: string;
  SAISON: string;
  POSTE: number;
  JOUEUR_NOM: string;
  POSTE_NOM: string;
  LAST_TRANSAC_SAISON: string | null;
  LAST_TRANSAC_STATUT: number | null;
  LAST_TRANSAC_TYPE: number | null;
}

export interface JoueurHistoryRow {
  JOCLEUNIK: number;
  SAISON: string;
  POSTE: number;
  POSTE_NOM: string;
  TITULAIRETOTAL: number;
  REMPTOTAL: number;
  BUTTOTAL: number;
  PASSETOTAL: number;
  JAUNETOTAL: number;
  ROUGETOTAL: number;
}

export interface JoueurTransactionRow {
  TNCLEUNIK: number;
  DATE: string;
  SAISON: string;
  TYPE: number;
  STATUT: number;
  IDCLUB: string | null;
  CLUB_NOM: string;
  CLUB_IDNATIO: string | null;
  SALAIRE: number | null;
  INDEMNITES: number | null;
  DVCLEUNIK: number;
  DEVISE_SYMBOLE: string;
  TN_ECHEANCE: string | null;
  TYT_LIBELLE: string;
  TYT_STATUT: number | null;
  TYT_CLUB: number | null;
  TYT_PHRASE_DEPART: string | null;
  TYT_PHRASE_ARRIVEE: string | null;
  TYT_PHRASE_NEUTRE: string | null;
}

export interface JoueurTransactionTypeOption {
  TYT_CLEUNIK: number;
  TYT_LIBELLE: string;
  TYT_VISIBLE: number;
  TYT_STATUT: number;
  TYT_SALAIRE: number | null;
  TYT_CLUB: number;
  TYT_INDEMNITES: number;
  TYT_ECHEANCE: number;
  TYT_PHRASE_DEPART: string | null;
  TYT_PHRASE_ARRIVEE: string | null;
  TYT_PHRASE_NEUTRE: string | null;
}

export interface JoueurTransactionDeviseOption {
  DVCLEUNIK: number;
  NOM: string;
  SYMBOLE: string;
  DVDEFAUT: number;
}

export interface JoueurTransactionOptions {
  types: JoueurTransactionTypeOption[];
  devises: JoueurTransactionDeviseOption[];
  defaultDeviseId: number | null;
}

export interface JoueurTransactionUpsertPayload {
  date: string;
  type: number;
  statut?: number;
  idClub?: string | null;
  salaire?: number | null;
  indemnites?: number | null;
  deviseId: number;
  echeance?: string | null;
}

export interface JoueurMatchEvent {
  type: 'but' | 'passe' | 'entree' | 'sortie' | 'blessure';
  minute: number;
  periode: number;
}

export interface JoueurMatchRow {
  RECLEUNIK: number;
  DATE: string;
  DOMICILE: string;
  EXTERIEUR: string;
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
  BUTDOM: number;
  BUTEXT: number;
  TABDOM: number;
  TABEXT: number;
  ETAT: number;
  TOUR_NOM: string;
  COMPET_NOM: string;
  COCLEUNIK: number;
  SAISON: string;
  POSTE_NOM: string | null;
  PARTICIPATION_TYPE: 'titulaire' | 'remplacant';
  events: JoueurMatchEvent[];
}

export type JoueurRow = Record<string, unknown>;

export interface PosteOption {
  POS_ID: number;
  POS_NOM: string;
  POS_TYPE?: number;
}

export interface IntegrityConstraint {
  table: string;
  count: number;
  description: string;
}

export interface CanDeleteResponse {
  canDelete: boolean;
  constraints: IntegrityConstraint[];
}

export interface SaisonRow {
  SAISON: string;
  SA_DEBUT: string;
  SA_FIN: string;
}

export interface GridResponse<T> {
  data: T[];
}

export interface JoueurSuggestionRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  IDNATIO: string;
  SCORE: number;
}

export interface JoueurCreateWizardPayload {
  nom: string;
  prenom?: string;
  natioId: string;
  posteId: number;
  alias?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
