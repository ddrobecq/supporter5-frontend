import { useEffect } from 'react';
import { create } from 'zustand';
import { fetchNatio } from './natioApi';
import { subscribeNatioChanges } from './natioChanges';
import type { NatioRow } from './types';

interface NatioState {
  rows: NatioRow[];
  byId: Map<string, NatioRow>;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  invalidate: () => void;
}

const EMPTY_ROWS: NatioRow[] = [];

let loadPromise: Promise<void> | null = null;
// Incremente a chaque invalidation : un chargement en cours devenu obsolete est ignore.
let generation = 0;

function toNatioKey(id: unknown): string {
  return String(id ?? '').trim();
}

export const natioStore = create<NatioState>((set, get) => ({
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
    const promise = fetchNatio('')
      .then((result) => {
        if (currentGeneration !== generation) return;
        const rows = result.data ?? EMPTY_ROWS;
        const byId = new Map<string, NatioRow>();
        for (const row of rows) {
          const key = toNatioKey(row.IDNATIO);
          if (key) byId.set(key, row);
        }
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
    // Les composants montes (useNatioList/useNatio) voient loaded=false et rechargent.
    set({ rows: EMPTY_ROWS, byId: new Map(), loaded: false, loading: false, error: null });
  },
}));

subscribeNatioChanges(() => natioStore.getState().invalidate());

function useEnsureNatioLoaded(): void {
  const loaded = natioStore((s) => s.loaded);
  const load = natioStore((s) => s.load);
  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);
}

/** Liste complete des nationalites (chargee une seule fois, partagee). */
export function useNatioList(): { rows: NatioRow[]; loading: boolean; error: string | null } {
  useEnsureNatioLoaded();
  const rows = natioStore((s) => s.rows);
  const loading = natioStore((s) => s.loading);
  const error = natioStore((s) => s.error);
  return { rows, loading, error };
}

/** Index des nationalites par IDNATIO. */
export function useNatioIndex(): Map<string, NatioRow> {
  useEnsureNatioLoaded();
  return natioStore((s) => s.byId);
}

/**
 * Nationalite par identifiant. `loaded` passe a true une fois la liste chargee (ou en erreur) ;
 * `natio` reste undefined si l'identifiant est absent de la liste.
 */
export function useNatio(id: string | number | null | undefined): {
  natio: NatioRow | undefined;
  loaded: boolean;
  error: string | null;
} {
  useEnsureNatioLoaded();
  const key = toNatioKey(id);
  const natio = natioStore((s) => (key ? s.byId.get(key) : undefined));
  const loaded = natioStore((s) => s.loaded || s.error !== null);
  const error = natioStore((s) => s.error);
  return { natio, loaded, error };
}
