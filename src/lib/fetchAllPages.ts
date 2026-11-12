import type { PaginatedResponse } from './apiTypes';
import { http } from './http';

/** Loads page 1, then pages 2..totalPages in parallel, and returns all rows as a single page. */
export async function fetchAllPages<T>(
  url: string,
  params: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<PaginatedResponse<T>> {
  const { data: firstPage } = await http.get<PaginatedResponse<T>>(url, {
    params: { ...params, page: 1 },
    signal,
  });

  if (firstPage.totalPages <= 1) {
    return firstPage;
  }

  const remainingRequests: Array<Promise<{ data: PaginatedResponse<T> }>> = [];
  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    remainingRequests.push(http.get<PaginatedResponse<T>>(url, { params: { ...params, page }, signal }));
  }

  const remainingPages = await Promise.all(remainingRequests);
  const allRows = [
    ...firstPage.data,
    ...remainingPages.flatMap((response) => response.data.data),
  ];

  return {
    ...firstPage,
    data: allRows,
    page: 1,
    limit: allRows.length,
    totalPages: 1,
  };
}
