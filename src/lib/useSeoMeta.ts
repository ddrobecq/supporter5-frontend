import { useEffect } from 'react';

const DEFAULT_TITLE = 'Supporter';
const DEFAULT_DESCRIPTION = 'Résultats, calendriers, statistiques, clubs et joueurs de football.';

function upsertMeta(name: string, content: string): void {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
}

export function useSeoMeta(title?: string, description?: string): void {
  useEffect(() => {
    const resolvedTitle = title?.trim() || DEFAULT_TITLE;
    const resolvedDescription = description?.trim() || DEFAULT_DESCRIPTION;

    document.title = resolvedTitle;
    upsertMeta('description', resolvedDescription);

    let ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = resolvedTitle;

    let ogDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.content = resolvedDescription;
  }, [description, title]);
}
