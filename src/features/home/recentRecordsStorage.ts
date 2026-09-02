import type { RecentOpenedRecord } from './types';

export const MAX_RECENT_OPENED_RECORDS = 10;

export type RecentOpenedRecordBuilder = (path: string, label: string) => RecentOpenedRecord | null;

export function sanitizeRecentLabel(label: string, fallback: string): string {
  const trimmed = String(label ?? '').trim();
  return trimmed || fallback;
}

export function readRecentOpenedRecordsFromStorage(storageKey: string, build: RecentOpenedRecordBuilder): RecentOpenedRecord[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalizedRows = parsed.flatMap((row): RecentOpenedRecord[] => {
      if (!row || typeof row !== 'object') return [];

      const path = String((row as { path?: unknown }).path ?? '');
      const label = String((row as { label?: unknown }).label ?? '');
      const base = build(path, label);
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

export function upsertRecentOpenedRecord(prev: RecentOpenedRecord[], path: string, label: string, build: RecentOpenedRecordBuilder): RecentOpenedRecord[] {
  const next = build(path, label);
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
