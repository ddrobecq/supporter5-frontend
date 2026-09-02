import type { RecentEntityKind, RecentOpenedRecord } from '../features/home/types';
import {
  MAX_RECENT_OPENED_RECORDS,
  readRecentOpenedRecordsFromStorage as readFromStorage,
  renameRecentOpenedRecord as renameRecord,
  sanitizeRecentLabel,
  upsertRecentOpenedRecord as upsertRecord,
  type RecentOpenedRecordBuilder,
} from '../features/home/recentRecordsStorage';
import { PICKER_ENTITY_DEFINITIONS } from './adminLayoutConfig';
import { decodeRouteSegment, normalizeRoutePath } from './adminLayoutRoutes';

export const RECENT_OPENED_STORAGE_KEY = 'supporter:recent-opened-records:v1';
export { MAX_RECENT_OPENED_RECORDS };

const buildAdminRecentOpenedRecord: RecentOpenedRecordBuilder = (path, label) => {
  const normalizedPath = normalizeRoutePath(path);

  if (normalizedPath.startsWith('/admin/rencontres/')) {
    const entityId = decodeRouteSegment(normalizedPath.slice('/admin/rencontres/'.length));
    if (!entityId) return null;
    return {
      path: normalizedPath,
      label: sanitizeRecentLabel(label, `Rencontre ${entityId}`),
      entityKind: 'rencontre',
      entityId,
      lastOpenedAt: Date.now(),
    };
  }

  for (const entity of PICKER_ENTITY_DEFINITIONS) {
    const prefix = `${entity.basePath}/`;
    if (!normalizedPath.startsWith(prefix)) continue;

    const entityId = decodeRouteSegment(normalizedPath.slice(prefix.length));
    if (!entityId) return null;

    return {
      path: normalizedPath,
      label: sanitizeRecentLabel(label, entityId),
      entityKind: entity.key as RecentEntityKind,
      entityId,
      lastOpenedAt: Date.now(),
    };
  }

  return null;
};

export function readRecentOpenedRecordsFromStorage(): RecentOpenedRecord[] {
  return readFromStorage(RECENT_OPENED_STORAGE_KEY, buildAdminRecentOpenedRecord);
}

export function upsertRecentOpenedRecord(prev: RecentOpenedRecord[], path: string, label: string): RecentOpenedRecord[] {
  return upsertRecord(prev, path, label, buildAdminRecentOpenedRecord);
}

export const renameRecentOpenedRecord = renameRecord;
