import { create } from 'zustand';

export const IMPORT_TARGET_FIELDS = [
  { key: 'DATE', label: 'Date', required: true },
  { key: 'HEURE', label: 'Heure', required: false },
  { key: 'IDCIRC', label: 'Circonstance', required: false },
  { key: 'DOMICILE', label: 'Domicile', required: true },
  { key: 'EXTERIEUR', label: 'Extérieur', required: true },
  { key: 'BUTDOM', label: 'ButDom', required: false },
  { key: 'BUTEXT', label: 'ButExt', required: false },
  { key: 'TABDOM', label: 'TabDom', required: false },
  { key: 'TABEXT', label: 'TabExt', required: false },
  { key: 'GROUPE', label: 'Groupe', required: false },
] as const;

export type ImportTargetField = (typeof IMPORT_TARGET_FIELDS)[number]['key'];

export interface ImportDraftRow {
  id: string;
  DATE: string;
  HEURE: string;
  IDCIRC: string;
  /** Nom du club domicile tel qu'ecrit dans le fichier. */
  DOMICILE_LABEL: string;
  EXTERIEUR_LABEL: string;
  BUTDOM: string;
  BUTEXT: string;
  TABDOM: string;
  TABEXT: string;
  GROUPE: string;
}

interface ImportSession {
  saison: string;
  competitionId: string;
  competitionLabel: string;
  tourId: number;
  tourLabel: string;
  fileName: string;
  rows: ImportDraftRow[];
}

interface RencontreImportState {
  session: ImportSession | null;
  setSession: (session: ImportSession) => void;
  clear: () => void;
}

const STORAGE_KEY = 'supporter:rencontre-import:v1';

function readStoredSession(): ImportSession | null {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as ImportSession) : null;
  } catch {
    return null;
  }
}

/** Passe-plat entre le wizard (modale) et l'onglet de preparation; persiste pour survivre a un rechargement. */
export const rencontreImportStore = create<RencontreImportState>((set) => ({
  session: readStoredSession(),
  setSession: (session) => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    set({ session });
  },
  clear: () => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    set({ session: null });
  },
}));
