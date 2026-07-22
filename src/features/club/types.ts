export interface ClubGridRow {
  IDCLUB: string;
  CLUB_ABREGE: string;
  CLUB_NOM_COMPLET: string;
  VILLE_NOM: string;
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
