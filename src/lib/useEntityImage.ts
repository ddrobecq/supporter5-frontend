import { useEffect, useState, useSyncExternalStore } from 'react';
import { env } from '../config/env';

export interface EntityImageState {
  /** URL utilisable dans un <img src={}> — null tant que non chargé ou absent. */
  src: string | null;
  loading: boolean;
  error: boolean;
}

interface ImageLoadResult {
  src: string | null;
  error: boolean;
}

interface CacheEntry {
  imageKey: string;
  promise: Promise<ImageLoadResult>;
}

// Cache partagé (par URL exacte) entre toutes les instances du hook : evite de refaire
// un fetch reseau par cellule/ligne quand la meme entite (ex: un ecusson de club) apparait
// plusieurs fois sur une meme page (grille de matchs, classements...).
const imageRequestCache = new Map<string, CacheEntry>();

// Version par image (`${entityType}:${id}`), partagee entre toutes les instances du hook.
// invalidateEntityImage() l'incremente : toutes les instances montees pour cette image
// changent d'URL et rechargent.
const imageVersions = new Map<string, number>();
const versionListeners = new Set<() => void>();

// Blobs des versions perimees : revoques une fois la nouvelle version chargee (a ce moment
// plus aucune instance ne les affiche, toutes ayant recharge).
const staleImagePromises = new Map<string, Array<Promise<ImageLoadResult>>>();

function toImageKey(entityType: string, id: string | number): string {
  return `${entityType}:${String(id)}`;
}

function subscribeImageVersions(listener: () => void): () => void {
  versionListeners.add(listener);
  return () => {
    versionListeners.delete(listener);
  };
}

function getImageVersion(imageKey: string | null): number {
  if (!imageKey) return 0;
  return imageVersions.get(imageKey) ?? 0;
}

function revokeStaleImages(imageKey: string): void {
  const stale = staleImagePromises.get(imageKey);
  if (!stale) return;
  staleImagePromises.delete(imageKey);
  for (const promise of stale) {
    void promise.then((result) => {
      if (result.src) URL.revokeObjectURL(result.src);
    });
  }
}

/**
 * Invalide l'image d'une entite pour toutes les instances de useEntityImage :
 * vide le cache (URL de base et variantes ?v=) et force le rechargement des instances montees.
 */
export function invalidateEntityImage(entityType: string, id: string | number): void {
  const imageKey = toImageKey(entityType, id);
  const stale = staleImagePromises.get(imageKey) ?? [];
  for (const [url, entry] of imageRequestCache) {
    if (entry.imageKey === imageKey) {
      stale.push(entry.promise);
      imageRequestCache.delete(url);
    }
  }
  if (stale.length > 0) staleImagePromises.set(imageKey, stale);

  imageVersions.set(imageKey, getImageVersion(imageKey) + 1);
  for (const listener of versionListeners) listener();
}

function loadEntityImage(url: string, imageKey: string): Promise<ImageLoadResult> {
  const cached = imageRequestCache.get(url);
  if (cached) return cached.promise;

  const promise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then((blob) => ({ src: URL.createObjectURL(blob), error: false }))
    .catch((error: unknown) => {
      imageRequestCache.delete(url);
      throw error;
    })
    .catch(() => ({ src: null, error: true }))
    .then((result) => {
      // Laisse React appliquer la nouvelle image avant de liberer les anciens blobs.
      setTimeout(() => revokeStaleImages(imageKey), 0);
      return result;
    });

  imageRequestCache.set(url, { imageKey, promise });
  return promise;
}

/**
 * Hook générique pour charger une image d'entité de façon asynchrone.
 *
 * Utilisation :
 *   const { src, loading, error } = useEntityImage('arbitre', id);
 *
 * Réutilisable pour n'importe quelle entité définie dans imageConfig.ts :
 *   useEntityImage('club', clubId)
 *   useEntityImage('joueurrg', joueurId)
 *
 * Les requêtes sont mises en cache par URL exacte (partagé entre toutes les instances du
 * hook) : plusieurs cellules affichant le même club/joueur ne déclenchent qu'un seul fetch.
 * Après modification d'une image, invalidateEntityImage() met à jour toutes les instances.
 *
 * @param entityType - Clé de IMAGE_CONFIGS côté backend ('arbitre', 'club'…)
 * @param id         - Clé primaire de l'enregistrement (undefined = pas de chargement)
 * @param refreshToken - Change pour forcer un rechargement (ex: apres upload d'une nouvelle image)
 */
export function useEntityImage(
  entityType: string,
  id: string | number | null | undefined,
  refreshToken?: unknown,
): EntityImageState {
  const [state, setState] = useState<EntityImageState>({
    src: null,
    loading: false,
    error: false,
  });

  const hasId = id !== null && id !== undefined && String(id).trim() !== '';
  const imageKey = hasId ? toImageKey(entityType, id) : null;
  const version = useSyncExternalStore(subscribeImageVersions, () => getImageVersion(imageKey));

  useEffect(() => {
    if (!hasId || !imageKey) {
      setState({ src: null, loading: false, error: false });
      return;
    }

    let cancelled = false;
    setState({ src: null, loading: true, error: false });

    const baseUrl = `${env.apiBaseUrl}/api/images/${encodeURIComponent(entityType)}/${encodeURIComponent(String(id))}`;
    const params = new URLSearchParams();
    if (refreshToken !== undefined && refreshToken !== null) params.set('v', String(refreshToken));
    if (version > 0) params.set('iv', String(version));
    const query = params.toString();
    const url = query ? `${baseUrl}?${query}` : baseUrl;

    void loadEntityImage(url, imageKey).then((result) => {
      if (!cancelled) setState({ ...result, loading: false });
    });

    return () => {
      cancelled = true;
    };
  }, [entityType, id, hasId, imageKey, refreshToken, version]);

  return state;
}

/**
 * Retourne l'URL directe de l'image d'une entité (sans hook).
 * Pratique pour une balise <img src={getEntityImageUrl(...)}> classique.
 */
export function getEntityImageUrl(entityType: string, id: string | number): string {
  return `${env.apiBaseUrl}/api/images/${encodeURIComponent(entityType)}/${encodeURIComponent(String(id))}`;
}
