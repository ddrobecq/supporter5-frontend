import { http } from '../../lib/http';

export type MaintenanceCellValue = string | number | boolean | null;

export interface MaintenanceSelectResult {
  kind: 'select';
  columns: string[];
  rows: MaintenanceCellValue[][];
  rowCount: number;
  truncated: boolean;
  limit: number;
  /** Vrai pour une requete qui renvoie des lignes tout en modifiant la base (INSERT ... RETURNING). */
  mutating: boolean;
  durationMs: number;
}

export interface MaintenanceMutationResult {
  kind: 'mutation' | 'script';
  changes: number | null;
  lastInsertRowid: number | string | null;
  durationMs: number;
}

export type MaintenanceQueryResult = MaintenanceSelectResult | MaintenanceMutationResult;

/** Statut renvoye par l'API quand une requete modifiante arrive sans confirmation. */
export const MAINTENANCE_CONFIRMATION_STATUS = 428;

export const MAINTENANCE_ROW_LIMIT_OPTIONS = [100, 500, 1000, 5000];

interface RunMaintenanceQueryParams {
  sql: string;
  confirm: boolean;
  limit: number;
  signal?: AbortSignal;
}

export async function runMaintenanceQuery({
  sql,
  confirm,
  limit,
  signal,
}: RunMaintenanceQueryParams): Promise<MaintenanceQueryResult> {
  const { data } = await http.post<{ data: MaintenanceQueryResult }>(
    '/api/admin/maintenance/query',
    { sql, confirm, limit },
    { signal, timeout: 120000 },
  );
  return data.data;
}
