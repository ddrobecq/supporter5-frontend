export interface RencontreDetailRow {
  RECLEUNIK: number;
  MACLEUNIK: number | null;
  DATE: string | null;
  HEURE: string | null;
  ETAT: number;
  DOMICILE: string;
  EXTERIEUR: string;
  BUTDOM: number;
  BUTEXT: number;
  TABDOM: number;
  TABEXT: number;
  IDCIRC: string | null;
  TUCLEUNIK: number;
  SAISON: string;
  READMIN: number | null;
  COMMENT: string | null;
  VID_ID: number | null;
  PADOMSource: string | null;
  PAEXTSource: string | null;
  COCLEUNIK: number;
  TOUR_NOM: string;
  TYPE_TOUR: number;
  DOMICILE_ABREGE: string;
  EXTERIEUR_ABREGE: string;
  DOMICILE_FOND: string | number | null;
  DOMICILE_TEXTE: string | number | null;
  EXTERIEUR_FOND: string | number | null;
  EXTERIEUR_TEXTE: string | number | null;
  DOMICILE_NOM_EFFECTIF: string;
  EXTERIEUR_NOM_EFFECTIF: string;
  IDARBITRE: string | null;
  ARBITRE_NOM: string;
  ARBITRE_PRENOM: string;
  TECLEUNIK: string | null;
  TERRAIN_NOM: string;
  TERRAIN_VILLE: string;
  TERRAIN_DISPLAY: string;
  NBSPECT: number;
  SUPPORTED_CLUB_ID: string;
  IS_SUPPORTED_CLUB_MATCH: number;
  SUPPORTED_CLUB_SIDE: 'home' | 'away' | 'none';
}

export interface RencontreHighlightEventRow {
  EVCLEUNIK: number;
  MINUTE: number;
  PERIODE: number;
  TYPE_EVENT: number;
  ADVERSAIRE: number;
  JOUEUR1: string | null;
  JOUEUR2: string | null;
  COMMENT: string | null;
  SIDE: 'home' | 'away' | null;
  TEXT: string;
}

export interface RencontreHighlightsRow {
  RECLEUNIK: number;
  MACLEUNIK: number | null;
  SUPPORTED_CLUB_ID: string;
  IS_SUPPORTED_CLUB_MATCH: number;
  SUPPORTED_CLUB_SIDE: 'home' | 'away' | 'none';
  EVENTS: RencontreHighlightEventRow[];
}

export interface TourMatchWithNamesRow {
  RECLEUNIK: number;
  DATE: string;
  HEURE: string | null;
  DOMICILE: string;
  EXTERIEUR: string;
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
  BUTDOM: number;
  BUTEXT: number;
  TABDOM: number;
  TABEXT: number;
  ETAT: number;
  IDCIRC: string | null;
}

export interface SquadPlayerRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  POSTE: number | null;
  POS_TYPE: number | null;
  IDNATIO?: string | null;
}

export type CompositionMap = Record<string, string | null>;
