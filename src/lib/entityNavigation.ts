export type PublicEntity = 'club' | 'joueur' | 'competition' | 'rencontre';

export function isPublicPath(pathname: string): boolean {
  return !pathname.startsWith('/admin') && pathname !== '/login';
}

export function entityPath(entity: PublicEntity, id: string | number, pathname: string): string {
  const encodedId = encodeURIComponent(String(id));
  if (isPublicPath(pathname)) {
    const publicPrefixes: Record<PublicEntity, string> = {
      club: '/clubs',
      joueur: '/joueurs',
      competition: '/competitions',
      rencontre: '/rencontres',
    };
    return `${publicPrefixes[entity]}/${encodedId}`;
  }

  const adminPrefixes: Record<PublicEntity, string> = {
    club: '/admin/clubs',
    joueur: '/admin/joueurs',
    competition: '/admin/competitions',
    rencontre: '/admin/rencontres',
  };
  return `${adminPrefixes[entity]}/${encodedId}`;
}

export function entityPathForPublicMode(entity: PublicEntity, id: string | number): string {
  return entityPath(entity, id, '/');
}

export function publicPathFromAdminPath(path: string): string {
  return path
    .replace(/^\/admin\/clubs\//, '/clubs/')
    .replace(/^\/admin\/joueurs\//, '/joueurs/')
    .replace(/^\/admin\/competitions\//, '/competitions/')
    .replace(/^\/admin\/rencontres\//, '/rencontres/');
}

export function adminPathFromPublicPath(path: string): string {
  const [pathname, query = ''] = path.split('?');
  const adminPath = pathname
    .replace(/^\/clubs\//, '/admin/clubs/')
    .replace(/^\/joueurs\//, '/admin/joueurs/')
    .replace(/^\/competitions\//, '/admin/competitions/')
    .replace(/^\/rencontres\//, '/admin/rencontres/')
    .replace(/^\/calendrier$/, '/admin/calendrier')
    .replace(/^\/statistiques$/, '/admin/statistiques');

  return `${adminPath === '/' || adminPath === '/parametres' ? '/admin/home' : adminPath}${query ? `?${query}` : ''}`;
}
