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
  PADOMSource: string | null;
  PAEXTSource: string | null;
  COCLEUNIK: number;
  CIRC: string;
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
  DOMICILE_NOM_COMPLET: string;
  EXTERIEUR_NOM_COMPLET: string;
  IDARBITRE: string | null;
  ARBITRE_NOM: string;
  ARBITRE_PRENOM: string;
  TECLEUNIK: string | null;
  TERRAIN_NOM: string;
  TERRAIN_VILLE: string;
  TERRAIN_DISPLAY: string;
  NBSPECT: number;
  EXTRATIME: number;
  PENALTY: number;
  FIN_TPS_REG: number;
  FIN_PROLONG: number;
  DUREE_TPS_REG: number;
  DUREE_TPS_PROLONG: number;
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
  PADOMSource?: string | null;
  PAEXTSource?: string | null;
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
  BUTDOM: number;
  BUTEXT: number;
  TABDOM: number;
  TABEXT: number;
  ETAT: number;
  IDCIRC: string | null;
}

export interface OnThisDayMatchRow {
  RECLEUNIK: number;
  DATE: string;
  HEURE: string;
  ETAT: number;
  DOMICILE: string;
  EXTERIEUR: string;
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
  BUTDOM: number;
  BUTEXT: number;
  TABDOM: number;
  TABEXT: number;
  TERRAIN_NOM: string;
  CIRC_COMPLET: string;
  SAISON: string;
  SUPPORTED_CLUB_ID: string;
  SUPPORTED_CLUB_SIDE: 'home' | 'away';
  RESUME: string;
  RESUME_SOURCE: 'comment' | 'events' | 'none';
  YEARS_AGO: number;
  DAYS_OFFSET: number;
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
