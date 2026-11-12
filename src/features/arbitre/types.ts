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

export type { PaginatedResponse } from '../../lib/apiTypes';
