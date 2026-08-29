export interface CompetitionRow {
  COCLEUNIK?: string | number;
  SAISON?: string | number;
  IDEPREUVE?: string | number;
  NOM?: string | number;
  CO_ANNEE?: string | number | boolean;
  CO_TERMINEE?: string | number | boolean;
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

export interface CompetitionTourRow {
  TUCLEUNIK: number;
  COCLEUNIK: number;
  TDCLEUNIK: number;
  TU_ORDRE: number;
  TU_FINAL?: number;
  TOUR: string;
  TYPE_ID: number;
  TYPE: string;
}

export interface CompetitionTourDetailRow {
  TUCLEUNIK?: number;
  TDCLEUNIK?: number;
  NB_PARTICIPANTS?: number;
  COCLEUNIK?: number;
  NOM?: string;
  DATE_DEBUT?: string | null;
  DATE_FIN?: string | null;
  TUHEURE?: string | null;
  NB_EQUIPE?: number;
  NB_GROUPE?: number;
  TU_ORDRE?: number;
  TU_FINAL?: number;
  TU_DATETIRAGE?: string | null;
  TU_HEURETIRAGE?: string | null;
  TU_SELECTION?: number;
  TU_COMMENT?: string | null;
  NB_MATCH?: number;
  TDTYPETOUR?: number;
}

export interface CompetitionTourUpsertPayload {
  TUCLEUNIK?: number;
  TDCLEUNIK: number;
  COCLEUNIK: number;
  NOM: string;
  NB_PARTICIPANTS: number;
  TU_FINAL: number;
  TU_SELECTION: number;
  TU_DATETIRAGE: string | null;
  TU_HEURETIRAGE: string | null;
  DATE_DEBUT: string | null;
  DATE_FIN: string | null;
  TUHEURE: string | null;
  TU_ORDRE: number;
  NB_EQUIPE: number;
  NB_GROUPE: number;
  NB_MATCH: number;
}

export interface TourParticipantRow {
  PACLEUNIK: number;
  TUCLEUNIK: number;
  IDCLUB: string;
  CLUB: string;
  GROUPE: string;
  PASource?: string;
  PAClassement?: number;
}

export interface CircOptionRow {
  IDCIRC: string;
  CIRC: string;
  TYPE_TOUR: number;
}

export interface TourMatchRow {
  RECLEUNIK: number;
  DATE: string;
  HEURE: string | null;
  DOMICILE: string;
  EXTERIEUR: string;
  IDCIRC?: string | null;
  ETAT: number;
  TUCLEUNIK: number;
  SAISON: string;
  READMIN: number;
  COMMENT?: string | null;
  BUTDOM: number;
  BUTEXT: number;
  TABDOM: number;
  TABEXT: number;
  PADOMSource?: string;
  PAEXTSource?: string;
}

export interface QualifRow {
  CLASS_ID: number;
  CLASS_MinRang: number;
  CLASS_MaxRang: number;
  CLASS_Couleur: number;
  CLASS_Libelle?: string | null;
  CLASS_Type: number;
  TUCLEUNIK: number;
  CLASS_Abrege: string;
}

export interface TourDefRow {
  TDCLEUNIK: number;
  NOM: string;
  ALLER_RETOUR: number;
  VALEUR_VD: number;
  VALEUR_VE: number;
  VALEUR_ND: number;
  VALEUR_NE: number;
  VALEUR_DD: number;
  VALEUR_DE: number;
  BONUS_TYPE: number;
  BONUS_NB_BUT: number;
  VALEUR_BONUS_V: number;
  VALEUR_BONUS_N: number;
  VALEUR_BONUS_D: number;
  DUREE_TPS_REG: number;
  DUREE_TPS_PROLONG: number;
  CLASS_GAD: number;
  TDTYPETOUR: number;
  FIN_PROLONG: number;
  FIN_TPS_REG: number;
  TDCLEFTRI: string;
  TDCalculDiffBut: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
