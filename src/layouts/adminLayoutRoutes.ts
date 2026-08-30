import { PICKER_ENTITY_DEFINITIONS } from './adminLayoutConfig';

export function normalizeRoutePath(path: string): string {
  const trimmedPath = path.trim();
  const normalized = trimmedPath.toLowerCase();
  switch (normalized) {
    case '/accueil':
      return '/admin/home';
    case '/configuration':
      return '/admin/configuration';
    case '/natio':
      return '/admin/natio';
    case '/ville':
      return '/admin/ville';
    case '/arbitre':
      return '/admin/arbitre';
    case '/terrain':
      return '/admin/terrain';
    case '/devise':
      return '/admin/devise';
    case '/circ':
      return '/admin/circ';
    case '/epreuve':
      return '/admin/epreuve';
    case '/competitions':
      return '/admin/competitions';
    case '/tourdefs':
      return '/admin/tourdefs';
    case '/rss':
      return '/admin/rss';
    case '/calendrier':
      return '/admin/calendrier';
    case '/statistiques':
      return '/admin/statistiques';
    case '/joueurs-incomplets':
      return '/admin/joueurs-incomplets';
    case '/clubs-incomplets':
      return '/admin/clubs-incomplets';
    case '/rencontres-incompletes':
      return '/admin/rencontres-incompletes';
    case '/import-rencontres':
      return '/admin/import-rencontres';
    case '/maintenance':
      return '/admin/maintenance';
    case '/joueurs':
      return '/admin/joueurs';
    case '/clubs':
      return '/admin/clubs';
    default:
      return trimmedPath;
  }
}

export function resolveTabMetaPath(path: string): string {
  const normalized = normalizeRoutePath(path);
  if (normalized.startsWith('/admin/rencontres/')) {
    return '/admin/rencontres';
  }
  for (const entity of PICKER_ENTITY_DEFINITIONS) {
    if (normalized.startsWith(`${entity.basePath}/`)) {
      return entity.basePath;
    }
  }
  return normalized;
}

export function decodeRouteSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
