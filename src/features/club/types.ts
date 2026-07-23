export type ClubGridRow = Record<string, unknown> & {
  IDCLUB: string;
  CLUB_ABREGE: string;
  CLUB_NOM_COMPLET: string;
  VILLE_NOM: string;
};

export interface ClubProfileRow {
  IDCLUB: string;
  CLUB_ABREGE: string;
  IDNATIO: string;
  IDVILLE: string | null;
  VILLE_NOM: string;
  FOND: string | number | null;
  TEXTE: string | number | null;
}

export interface ClubNameHistoryRow {
  IDCLUB_NOM: number;
  DATE: string | null;
  CN_ACTION: number;
  CN_NOM: string;
}

export interface ClubTerrainHistoryRow {
  CT_CLEUNIK: number;
  TECLEUNIK: number;
  DATE: string | null;
  STADE: string;
}

export interface ClubSuggestionRow {
  IDCLUB: string;
  CLUB_ABREGE: string;
  CLUB_NOM_COMPLET: string;
  CLUB_NOMS: string[];
  SCORE: number;
}

export interface ClubCreateWizardPayload {
  name: string;
  natioId: string;
  isSelection: boolean;
  villeId?: string;
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
