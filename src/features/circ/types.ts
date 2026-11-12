export interface CircRow {
  IDCIRC?: string | number;
  CIRC?: string | number;
  TYPE_TOUR?: string | number;
  [key: string]: unknown;
}

export type { PaginatedResponse } from '../../lib/apiTypes';
