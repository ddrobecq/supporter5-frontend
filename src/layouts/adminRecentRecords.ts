import type { RecentEntityKind, RecentOpenedRecord } from '../features/home/types';
import { PICKER_ENTITY_DEFINITIONS } from './adminLayoutConfig';
import { decodeRouteSegment, normalizeRoutePath } from './adminLayoutRoutes';

export const RECENT_OPENED_STORAGE_KEY = 'supporter:recent-opened-records:v1';
export const MAX_RECENT_OPENED_RECORDS = 10;

function sanitizeRecentLabel(label: string, fallback: string): string {
  const trimmed = String(label ?? '').trim();
  return trimmed || fallback;
}

export function buildRecentOpenedRecord(path: string, label: string): RecentOpenedRecord | null {
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
}

export function readRecentOpenedRecordsFromStorage(): RecentOpenedRecord[] {
  try {
    const raw = window.localStorage.getItem(RECENT_OPENED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalizedRows = parsed.flatMap((row): RecentOpenedRecord[] => {
      if (!row || typeof row !== 'object') return [];

      const path = String((row as { path?: unknown }).path ?? '');
      const label = String((row as { label?: unknown }).label ?? '');
      const base = buildRecentOpenedRecord(path, label);
      if (!base) return [];

      const lastOpenedAtRaw = Number((row as { lastOpenedAt?: unknown }).lastOpenedAt);
      return [{
        ...base,
        lastOpenedAt: Number.isFinite(lastOpenedAtRaw) ? lastOpenedAtRaw : Date.now(),
      }];
    });

    return normalizedRows
      .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
      .slice(0, MAX_RECENT_OPENED_RECORDS);
  } catch {
    return [];
  }
}

export function upsertRecentOpenedRecord(prev: RecentOpenedRecord[], path: string, label: string): RecentOpenedRecord[] {
  const next = buildRecentOpenedRecord(path, label);
  if (!next) return prev;
  const deduped = prev.filter((row) => row.path !== next.path);
  return [next, ...deduped].slice(0, MAX_RECENT_OPENED_RECORDS);
}

export function renameRecentOpenedRecord(prev: RecentOpenedRecord[], normalizedPath: string, label: string): RecentOpenedRecord[] {
  let changed = false;
  const next = prev.map((row) => {
    if (row.path !== normalizedPath || row.label === label) return row;
    changed = true;
    return { ...row, label };
  });
  return changed ? next : prev;
}
