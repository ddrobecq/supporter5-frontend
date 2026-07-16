import { useEffect, useRef, useState } from 'react';
import { env } from '../config/env';

export interface EntityImageState {
  /** URL utilisable dans un <img src={}> — null tant que non chargé ou absent. */
  src: string | null;
  loading: boolean;
  error: boolean;
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
 * @param entityType - Clé de IMAGE_CONFIGS côté backend ('arbitre', 'club'…)
 * @param id         - Clé primaire de l'enregistrement (undefined = pas de chargement)
 */
export function useEntityImage(
  entityType: string,
  id: string | number | null | undefined,
): EntityImageState {
  const [state, setState] = useState<EntityImageState>({
    src: null,
    loading: false,
    error: false,
  });

  // Conserver l'Object URL pour le révoquer à la désinstallation
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id) {
      setState({ src: null, loading: false, error: false });
      return;
    }

    let cancelled = false;
    setState({ src: null, loading: true, error: false });

    const url = `${env.apiBaseUrl}/api/images/${encodeURIComponent(entityType)}/${encodeURIComponent(String(id))}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        // Révoquer l'ancienne URL objet pour libérer la mémoire
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const objUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objUrl;
        setState({ src: objUrl, loading: false, error: false });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ src: null, loading: false, error: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [entityType, id]);

  // Nettoyage final à la désinstallation du composant
  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    },
    [],
  );

  return state;
}

/**
 * Retourne l'URL directe de l'image d'une entité (sans hook).
 * Pratique pour une balise <img src={getEntityImageUrl(...)}> classique.
 */
export function getEntityImageUrl(entityType: string, id: string | number): string {
  return `${env.apiBaseUrl}/api/images/${encodeURIComponent(entityType)}/${encodeURIComponent(String(id))}`;
}
