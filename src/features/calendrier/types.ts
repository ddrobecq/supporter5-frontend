export interface CalendrierRow {
  RECLEUNIK: string | number;
  TUCLEUNIK: number;
  TYPE_TOUR?: number;
  DATE: string;
  HEURE: string;
  ETAT: number;
  IDCIRC: string | null;
  CIRC: string | null;
  TOUR_NOM: string;
  COMPET_NOM: string;
  COCLEUNIK?: number | null;
  CO_WEB?: string | null;
  SAISON: string;
  CO_ANNEE: number;
  DOMICILE: string;
  EXTERIEUR: string;
  BUTDOM: number;
  BUTEXT: number;
  TABDOM: number;
  TABEXT: number;
  PADOMSource?: string | null;
  PAEXTSource?: string | null;
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
}

export interface TourClassementRow {
  PACLEUNIK: number;
  TUCLEUNIK: number;
  IDCLUB: string;
  CLUB: string;
  GROUPE: string;
  PAClassement?: number;
  PANbMatch?: number;
  PANbPoints?: number;
  PANbVD?: number;
  PANbVE?: number;
  PANbND?: number;
  PANbNE?: number;
  PANbDD?: number;
  PANbDE?: number;
  PANbBP?: number;
  PANbBC?: number;
  PADiff?: number;
  PARatio?: number;
  TDCalculDiffBut?: number;
  TOUR_TERMINE?: number;
  LOCKED_QUALIF_ABREGE?: string | null;
  LOCKED_QUALIF_LIBELLE?: string | null;
  LOCKED_QUALIF_COULEUR?: string | null;
  LOCKED_QUALIF_TYPE?: number | null;
  /** Point penalties already deducted from PANbPoints (empty when none). */
  MALUS?: TourClassementMalus[];
}

export interface TourClassementMalus {
  MLCLEUNIK: number;
  /** Points removed (> 0). */
  MLPoints: number;
  MLMotif: string | null;
  /** 'YYYY-MM-DD', or '' when unknown. */
  MLDate: string;
}

export interface TourQualifRow {
  CLASS_MinRang: number;
  CLASS_MaxRang: number;
  CLASS_Couleur: string | null;
  CLASS_Libelle: string;
  TUCLEUNIK: number;
}