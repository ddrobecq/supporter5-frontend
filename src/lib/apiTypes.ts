export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IntegrityConstraint {
  table: string;
  count: number;
  description: string;
}

export interface CanDeleteResponse {
  canDelete: boolean;
  constraints: IntegrityConstraint[];
}
