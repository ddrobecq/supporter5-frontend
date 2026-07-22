export type ArbitreRow = Record<string, unknown>;

export interface ArbitreSuggestionRow {
  IDARBITRE: string;
  NOM: string;
  PRENOM: string;
  IDNATIO: string;
  SCORE: number;
}

export interface ArbitreCreateWizardPayload {
  nom: string;
  prenom?: string;
  natioId: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
