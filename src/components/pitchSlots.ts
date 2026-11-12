export interface PitchSlotDef {
  code: string;
  label: string;
  /** Coordonnees en % du terrain (haut = attaque, bas = gardien). */
  x: number;
  y: number;
}

export interface PitchPlayerIdentity {
  IDJOUEUR: string;
  NOM?: string | null;
  PRENOM?: string | null;
  SURNOM?: string | null;
  IDNATIO?: string | null;
}

export const PITCH_AVATAR_SIZE = 38;
/** Largeur d'un poste: compromis pour loger nom + drapeau sans chevaucher les postes voisins. */
export const PITCH_SLOT_WIDTH = 80;

export const PITCH_SLOTS: PitchSlotDef[] = [
  { code: 'AVC',  label: 'AVC',  x: 50, y: 7  },
  { code: 'ACD',  label: 'ACD',  x: 66, y: 12 },
  { code: 'ACG',  label: 'ACG',  x: 34, y: 12 },
  { code: 'ALD',  label: 'ALD',  x: 83, y: 17 },
  { code: 'ALG',  label: 'ALG',  x: 17, y: 17 },
  { code: 'MOCC', label: 'MOCC', x: 50, y: 28 },
  { code: 'MOCD', label: 'MOCD', x: 67, y: 30 },
  { code: 'MOCG', label: 'MOCG', x: 33, y: 30 },
  { code: 'MOLD', label: 'MOLD', x: 84, y: 34 },
  { code: 'MOLG', label: 'MOLG', x: 16, y: 34 },
  { code: 'MDCC', label: 'MDCC', x: 50, y: 46 },
  { code: 'MDCD', label: 'MDCD', x: 67, y: 48 },
  { code: 'MDCG', label: 'MDCG', x: 33, y: 48 },
  { code: 'MDLD', label: 'MDLD', x: 84, y: 52 },
  { code: 'MDLG', label: 'MDLG', x: 16, y: 52 },
  { code: 'STO',  label: 'STO',  x: 50, y: 60 },
  { code: 'LIB',  label: 'LIB',  x: 50, y: 66 },
  { code: 'DCD',  label: 'DCD',  x: 65, y: 75 },
  { code: 'DCG',  label: 'DCG',  x: 35, y: 75 },
  { code: 'DLD',  label: 'DLD',  x: 83, y: 78 },
  { code: 'DLG',  label: 'DLG',  x: 17, y: 78 },
  { code: 'GOAL', label: 'GB',   x: 50, y: 93 },
];

/** Libelle court d'un joueur sur le terrain: surnom, sinon nom. */
export function pitchPlayerLabel(player: PitchPlayerIdentity): string {
  return player.SURNOM?.trim() || player.NOM?.trim() || player.IDJOUEUR;
}
