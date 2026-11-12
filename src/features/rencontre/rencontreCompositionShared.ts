import { fetchRencontreComposition, fetchRencontreSquad } from './rencontreApi';
import type { CompositionMap, SquadPlayerRow } from './types';

/** Cadre d'un poste de banc, partage entre la compo admin et la compo publique. */
export const BENCH_SLOT_SX = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.75,
  height: 38,
  px: 0.75,
  borderRadius: 1,
  border: '1.5px dashed',
  borderColor: 'divider',
} as const;

// Module-level caches survive component unmount/remount (main-tab switches, hot-reload, etc.)
export const _compositionCache = new Map<string, CompositionMap>();
export const _squadCache = new Map<string, SquadPlayerRow[]>();
export const _initialCompositionCache = new Map<string, CompositionMap>();
export const _pendingCompositionLoads = new Map<string, Promise<{ squad: SquadPlayerRow[]; composition: CompositionMap }>>();

/**
 * Charge (ou renvoie depuis le cache) la composition et l'effectif d'un match.
 * Partagé avec RencontreTabFormPane, qui precharge ces donnees des l'ouverture de la fiche
 * (pour le calcul de completude) sans attendre que l'onglet Composition soit ouvert.
 */
export function preloadRencontreComposition(
  rencontreId: string,
): Promise<{ squad: SquadPlayerRow[]; composition: CompositionMap }> {
  const cachedComposition = _compositionCache.get(rencontreId);
  const cachedSquad = _squadCache.get(rencontreId);
  if (cachedComposition && cachedSquad) {
    return Promise.resolve({ squad: cachedSquad, composition: cachedComposition });
  }

  const pending = _pendingCompositionLoads.get(rencontreId);
  if (pending) return pending;

  const promise = Promise.all([
    fetchRencontreSquad(rencontreId),
    fetchRencontreComposition(rencontreId),
  ]).then(([squadData, compoData]) => {
    _squadCache.set(rencontreId, squadData);
    _compositionCache.set(rencontreId, compoData);
    _initialCompositionCache.set(rencontreId, compoData);
    return { squad: squadData, composition: compoData };
  }).finally(() => {
    _pendingCompositionLoads.delete(rencontreId);
  });

  _pendingCompositionLoads.set(rencontreId, promise);
  return promise;
}
