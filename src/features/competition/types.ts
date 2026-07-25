export interface CompetitionRow {
  COCLEUNIK?: string | number;
  SAISON?: string | number;
  IDEPREUVE?: string | number;
  NOM?: string | number;
  CO_ANNEE?: string | number | boolean;
  CO_WEB?: string | number;
  CO_COMMENT?: string | number | null;
  LOGO?: string | number | null;
  [key: string]: unknown;
}

export interface EpreuveOption {
  IDEPREUVE: number;
  EPREUVE: string;
}

export interface SaisonOption {
  SAISON: string;
}

export interface CompetitionCreateWizardPayload {
  epreuveId: number;
  saison: string;
  name: string;
  sameAsLastEdition: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
