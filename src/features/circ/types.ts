export interface CircRow {
  IDCIRC?: string | number;
  CIRC?: string | number;
  TYPE_TOUR?: string | number;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}