export interface EpreuveRow {
  IDEPREUVE?: string | number;
  EPREUVE?: string | number;
  SCOPE?: string | number;
  OFFICIELLE?: string | number | boolean;
  EPR_VISUEL?: string | number | null;
  EPR_WEB?: string | number;
  EPR_PAYS?: string | number | boolean;
  [key: string]: unknown;
}

export type { PaginatedResponse } from '../../lib/apiTypes';

export interface EpreuveSuggestionRow {
  IDEPREUVE: number;
  EPREUVE: string;
  SCORE: number;
}

export interface EpreuveCreateWizardPayload {
  name: string;
}
export interface EpreuvePalmaresWinner {
  IDCLUB: string;
  CLUB: string;
}

export interface EpreuvePalmaresRow {
  COCLEUNIK: number;
  /** Year (calendar-year competition) or season label. */
  SAISON_LIBELLE: string;
  /** ISO 'YYYY-MM-DD'. */
  DATE_FINALE: string;
  /** Empty when the title was not awarded; several entries when the edition had several finals. */
  VAINQUEURS: EpreuvePalmaresWinner[];
}
