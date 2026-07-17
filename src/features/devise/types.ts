export interface DeviseRow {
  DVCLEUNIK?: string | number;
  NOM?: string | number;
  SYMBOLE?: string | number;
  CONVERSION?: string | number;
  DVDEFAUT?: string | number | boolean;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
