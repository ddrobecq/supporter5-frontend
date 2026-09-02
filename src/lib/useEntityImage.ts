import { useEffect, useState } from 'react';
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

// Cache partagé (par URL exacte) entre toutes les instances du hook : evite de refaire
// un fetch reseau par cellule/ligne quand la meme entite (ex: un ecusson de club) apparait
// plusieurs fois sur une meme page (grille de matchs, classements...).
const imageRequestCache = new Map<string, Promise<ImageLoadResult>>();

function loadEntityImage(url: string): Promise<ImageLoadResult> {
  const cached = imageRequestCache.get(url);
  if (cached) return cached;

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
    .catch(() => ({ src: null, error: true }));

  imageRequestCache.set(url, promise);
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

  useEffect(() => {
    const hasId = id !== null && id !== undefined && String(id).trim() !== '';
    if (!hasId) {
      setState({ src: null, loading: false, error: false });
      return;
    }

    let cancelled = false;
    setState({ src: null, loading: true, error: false });

    const baseUrl = `${env.apiBaseUrl}/api/images/${encodeURIComponent(entityType)}/${encodeURIComponent(String(id))}`;
    const hasRefreshToken = refreshToken !== undefined && refreshToken !== null;
    const url = hasRefreshToken
      ? `${baseUrl}?v=${encodeURIComponent(String(refreshToken))}`
      : baseUrl;

    void loadEntityImage(url).then((result) => {
      if (!cancelled) setState({ ...result, loading: false });
    });

    return () => {
      cancelled = true;
    };
  }, [entityType, id, refreshToken]);

  return state;
}

/**
 * Retourne l'URL directe de l'image d'une entité (sans hook).
 * Pratique pour une balise <img src={getEntityImageUrl(...)}> classique.
 */
export function getEntityImageUrl(entityType: string, id: string | number): string {
  return `${env.apiBaseUrl}/api/images/${encodeURIComponent(entityType)}/${encodeURIComponent(String(id))}`;
}
