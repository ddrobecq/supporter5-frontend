import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PUBLIC_INDEXABLE_EXACT_PATHS = new Set([
  '/',
  '/calendrier',
  '/statistiques',
]);

const PUBLIC_INDEXABLE_PREFIXES = [
  '/clubs/',
  '/joueurs/',
  '/rencontres/',
];

/**
 * Dynamically sets the <meta name="robots"> tag depending on the active route.
 * Admin pages (/admin/*), login (/login), parameters (/parametres), and redirect shortcuts
 * receive 'noindex, nofollow' to prevent search engines from indexing private or non-content pages.
 * Public content pages receive 'index, follow'.
 */
export function useSeoRobots(): void {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const isPublicIndexable =
      PUBLIC_INDEXABLE_EXACT_PATHS.has(path) ||
      PUBLIC_INDEXABLE_PREFIXES.some((prefix) => path.startsWith(prefix));

    let metaRobots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
    }

    const targetContent = isPublicIndexable ? 'index, follow' : 'noindex, nofollow';
    if (metaRobots.content !== targetContent) {
      metaRobots.content = targetContent;
    }
  }, [location.pathname]);
}
