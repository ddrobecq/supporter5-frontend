import { env } from '../../config/env';
import type { CanDeleteResponse } from '../../lib/apiTypes';
import { fetchAllPages } from '../../lib/fetchAllPages';
import { http } from '../../lib/http';
import { encodePathSegment } from '../../lib/urlPath';
import type { PaginatedResponse, RssRow } from './types';

export async function fetchRss(search: string, signal?: AbortSignal): Promise<PaginatedResponse<RssRow>> {
  return fetchAllPages<RssRow>(env.rssPublicResource, {
    limit: 200,
    sort: 'RSSID',
    order: 'asc',
    ...(search ? { search } : {}),
  }, signal);
}

export async function fetchRssById(id: string | number): Promise<RssRow> {
  const { data } = await http.get<RssRow>(`${env.rssPublicResource}/${encodePathSegment(id)}`);
  return data;
}

export async function canDeleteRss(id: string | number): Promise<CanDeleteResponse> {
  const { data } = await http.get<CanDeleteResponse>(`${env.rssAdminResource}/${encodePathSegment(id)}/can-delete`);
  return data;
}

export async function createRss(payload: RssRow): Promise<RssRow | undefined> {
  const { data } = await http.post<RssRow>(env.rssAdminResource, payload);
  return data;
}

export async function updateRss(id: string | number, payload: RssRow): Promise<RssRow | undefined> {
  const { data } = await http.put<RssRow>(`${env.rssAdminResource}/${encodePathSegment(id)}`, payload);
  return data;
}

export async function deleteRss(id: string | number): Promise<void> {
  await http.delete(`${env.rssAdminResource}/${encodePathSegment(id)}`);
}
