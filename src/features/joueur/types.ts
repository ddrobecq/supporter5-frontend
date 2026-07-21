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

export type JoueurRow = Record<string, unknown>;

export interface PosteOption {
  POS_ID: number;
  POS_NOM: string;
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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
