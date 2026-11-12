export interface RssRow {
  RSSID?: string | number;
  RSSURL?: string | number;
  RSSDescription?: string | number;
  [key: string]: unknown;
}

export type { PaginatedResponse } from '../../lib/apiTypes';
