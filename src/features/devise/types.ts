export interface DeviseRow {
  DVCLEUNIK?: string | number;
  NOM?: string | number;
  SYMBOLE?: string | number;
  CONVERSION?: string | number;
  DVDEFAUT?: string | number | boolean;
  [key: string]: unknown;
}

export type { PaginatedResponse } from '../../lib/apiTypes';
