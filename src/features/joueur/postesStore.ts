import { useEffect } from 'react';
import { create } from 'zustand';
import { fetchJoueurPostes } from './joueurApi';
import type { PosteOption } from './types';

interface PostesState {
  rows: PosteOption[];
  byId: Map<number, PosteOption>;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  invalidate: () => void;
}

const EMPTY_ROWS: PosteOption[] = [];

let loadPromise: Promise<void> | null = null;
// Incremente a chaque invalidation : un chargement en cours devenu obsolete est ignore.
let generation = 0;

export const postesStore = create<PostesState>((set, get) => ({
  rows: EMPTY_ROWS,
  byId: new Map(),
  loaded: false,
  loading: false,
  error: null,
  load: async () => {
    if (get().loaded) return;
    if (loadPromise) return loadPromise;

    const currentGeneration = generation;
    set({ loading: true, error: null });
    const promise = fetchJoueurPostes()
      .then((rows) => {
        if (currentGeneration !== generation) return;
        const byId = new Map<number, PosteOption>();
        for (const row of rows) byId.set(Number(row.POS_ID), row);
        set({ rows, byId, loaded: true, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (currentGeneration !== generation) return;
        const message = error instanceof Error ? error.message : String(error);
        // loaded reste false : un composant monte ulterieurement relancera le chargement.
        set({ loading: false, error: message });
      })
      .finally(() => {
        if (loadPromise === promise) loadPromise = null;
      });
    loadPromise = promise;
    return promise;
  },
  invalidate: () => {
    generation += 1;
    loadPromise = null;
    set({ rows: EMPTY_ROWS, byId: new Map(), loaded: false, loading: false, error: null });
  },
}));

/** Liste des postes joueurs (chargee une seule fois, partagee). */
export function usePostesList(): { rows: PosteOption[]; loading: boolean; error: string | null } {
  const loaded = postesStore((s) => s.loaded);
  const load = postesStore((s) => s.load);
  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);
  const rows = postesStore((s) => s.rows);
  const loading = postesStore((s) => s.loading);
  const error = postesStore((s) => s.error);
  return { rows, loading, error };
}
