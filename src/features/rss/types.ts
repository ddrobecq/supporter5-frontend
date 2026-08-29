export interface RssRow {
  RSSID?: string | number;
  RSSURL?: string | number;
  RSSDescription?: string | number;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
