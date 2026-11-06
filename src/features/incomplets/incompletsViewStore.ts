import type { GridFilterModel, GridPaginationModel, GridRowId, GridSortModel } from '@mui/x-data-grid';
import { create } from 'zustand';

export type IncompletsScreenKey = 'rencontres' | 'joueurs' | 'clubs';

/** Onglet liste -> ecran, pour remettre l'etat a zero a la fermeture de l'onglet. */
export const INCOMPLETS_SCREEN_BY_PATH: Record<string, IncompletsScreenKey> = {
  '/admin/rencontres-incompletes': 'rencontres',
  '/admin/joueurs-incomplets': 'joueurs',
  '/admin/clubs-incomplets': 'clubs',
};

export interface IncompletsViewState {
  category: string;
  paginationModel: GridPaginationModel;
  sortModel: GridSortModel;
  filterModel: GridFilterModel;
  /** Derniere ligne ouverte depuis la liste. */
  selectedId: GridRowId | null;
  /** Ordre affiche (categorie + filtre + tri), pour retrouver la ligne suivante si la selection disparait. */
  visibleIds: GridRowId[];
}

export const DEFAULT_INCOMPLETS_VIEW_STATE: IncompletsViewState = {
  category: 'all',
  paginationModel: { page: 0, pageSize: 25 },
  sortModel: [],
  filterModel: { items: [] },
  selectedId: null,
  visibleIds: [],
};

interface IncompletsViewStoreState {
  views: Partial<Record<IncompletsScreenKey, IncompletsViewState>>;
  update: (screen: IncompletsScreenKey, patch: Partial<IncompletsViewState>) => void;
  clear: (screen: IncompletsScreenKey) => void;
}

/** Etat d'affichage des listes incompletes, conserve en memoire entre les allers-retours d'onglet. */
export const incompletsViewStore = create<IncompletsViewStoreState>((set) => ({
  views: {},
  update: (screen, patch) => set((state) => ({
    views: {
      ...state.views,
      [screen]: { ...(state.views[screen] ?? DEFAULT_INCOMPLETS_VIEW_STATE), ...patch },
    },
  })),
  clear: (screen) => set((state) => {
    const views = { ...state.views };
    delete views[screen];
    return { views };
  }),
}));
