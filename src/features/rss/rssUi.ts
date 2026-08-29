import type { RssRow } from './types';

export function resolveRssLabel(row: RssRow): string {
  const preferred = ['RSSDescription', 'RSSURL', 'RSSID'];
  for (const field of preferred) {
    const value = row[field];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return 'Flux RSS';
}

export function resolveRssId(row: RssRow): string | number | undefined {
  const value = row.RSSID;
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  if (typeof value === 'number') return value;
  return undefined;
}
