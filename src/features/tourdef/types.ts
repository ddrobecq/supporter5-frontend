export interface TourDefRow {
  TDCLEUNIK?: string | number;
  NOM?: string | number;
  ALLER_RETOUR?: string | number | boolean;
  VALEUR_VD?: string | number;
  VALEUR_VE?: string | number;
  VALEUR_ND?: string | number;
  VALEUR_NE?: string | number;
  VALEUR_DD?: string | number;
  VALEUR_DE?: string | number;
  BONUS_TYPE?: string | number;
  BONUS_NB_BUT?: string | number;
  VALEUR_BONUS_V?: string | number;
  VALEUR_BONUS_N?: string | number;
  VALEUR_BONUS_D?: string | number;
  DUREE_TPS_REG?: string | number;
  DUREE_TPS_PROLONG?: string | number;
  CLASS_GAD?: string | number;
  TDTYPETOUR?: string | number;
  FIN_PROLONG?: string | number;
  FIN_TPS_REG?: string | number;
  TDCLEFTRI?: string | number;
  TDCalculDiffBut?: string | number;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
