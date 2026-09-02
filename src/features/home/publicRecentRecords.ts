import { decodeRouteSegment } from '../../lib/entityNavigation';
import type { RecentEntityKind } from './types';
import { sanitizeRecentLabel, type RecentOpenedRecordBuilder } from './recentRecordsStorage';

export const PUBLIC_RECENT_OPENED_STORAGE_KEY = 'supporter:recent-opened-records:public:v1';

const PUBLIC_ENTITY_PREFIXES: { prefix: string; entityKind: RecentEntityKind }[] = [
  { prefix: '/joueurs/', entityKind: 'joueur' },
  { prefix: '/clubs/', entityKind: 'club' },
  { prefix: '/rencontres/', entityKind: 'rencontre' },
];

export const buildPublicRecentOpenedRecord: RecentOpenedRecordBuilder = (path, label) => {
  const normalizedPath = String(path ?? '').trim();

  for (const { prefix, entityKind } of PUBLIC_ENTITY_PREFIXES) {
    if (!normalizedPath.startsWith(prefix)) continue;

    const entityId = decodeRouteSegment(normalizedPath.slice(prefix.length));
    if (!entityId) return null;

    return {
      path: normalizedPath,
      label: sanitizeRecentLabel(label, entityId),
      entityKind,
      entityId,
      lastOpenedAt: Date.now(),
    };
  }

  return null;
};
