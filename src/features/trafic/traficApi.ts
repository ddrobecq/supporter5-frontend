import { http } from '../../lib/http';

/** Periode analysee: dates YYYY-MM-DD inclusives (UTC). */
export interface TraficFilters {
  from: string;
  to: string;
  bots: boolean;
}

export type TraficGrain = 'jour' | 'heure';

export interface TraficTotals {
  pagesVues: number;
  visites: number;
  visiteurs: number;
}

export interface TraficResume extends TraficTotals {
  precedent: TraficTotals;
}

export interface TraficSeriePoint extends TraficTotals {
  t: string;
}

export interface TraficPaged<Row> {
  data: Row[];
  total: number;
  truncated: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type TraficEntityType = '' | 'club' | 'joueur' | 'rencontre';

export interface TraficPageRow {
  path: string;
  entityType: TraficEntityType;
  entityId: string | null;
  libelle: string;
  pagesVues: number;
  visiteurs: number;
}

export interface TraficReferentRow {
  referent: string;
  visites: number;
  visiteurs: number;
}

export interface TraficPaysRow {
  pays: string;
  visites: number;
  visiteurs: number;
}

export interface TraficRepartitionItem {
  valeur: string;
  visites: number;
}

export interface TraficAppareils {
  appareils: TraficRepartitionItem[];
  navigateurs: TraficRepartitionItem[];
  os: TraficRepartitionItem[];
}

export interface TraficTempsReel {
  visiteurs: number;
  pages: Array<{ path: string; libelle: string; visiteurs: number }>;
}

/** Requete paginee: page commence a 1 cote API. */
export type TraficPagedFetcher<Row> = (
  filters: TraficFilters,
  page: number,
  pageSize: number,
  signal: AbortSignal,
) => Promise<TraficPaged<Row>>;

const BASE_PATH = '/api/admin/trafic';

function periodParams(filters: TraficFilters) {
  return { from: filters.from, to: filters.to, bots: filters.bots ? 1 : 0 };
}

export async function fetchTraficResume(filters: TraficFilters, signal: AbortSignal): Promise<TraficResume> {
  const { data } = await http.get<TraficResume>(`${BASE_PATH}/resume`, { params: periodParams(filters), signal });
  return data;
}

export async function fetchTraficSerie(filters: TraficFilters, grain: TraficGrain, signal: AbortSignal): Promise<TraficSeriePoint[]> {
  const { data } = await http.get<TraficSeriePoint[]>(`${BASE_PATH}/serie`, {
    params: { ...periodParams(filters), grain },
    signal,
  });
  return data ?? [];
}

export async function fetchTraficAppareils(filters: TraficFilters, signal: AbortSignal): Promise<TraficAppareils> {
  const { data } = await http.get<TraficAppareils>(`${BASE_PATH}/appareils`, { params: periodParams(filters), signal });
  return data;
}

function pagedFetcher<Row>(resource: string): TraficPagedFetcher<Row> {
  return async (filters, page, pageSize, signal) => {
    const { data } = await http.get<TraficPaged<Row>>(`${BASE_PATH}/${resource}`, {
      params: { ...periodParams(filters), page, pageSize },
      signal,
    });
    return data;
  };
}

export const fetchTraficPages = pagedFetcher<TraficPageRow>('pages');
export const fetchTraficReferents = pagedFetcher<TraficReferentRow>('referents');
export const fetchTraficPays = pagedFetcher<TraficPaysRow>('pays');

export async function fetchTraficTempsReel(signal: AbortSignal): Promise<TraficTempsReel> {
  const { data } = await http.get<TraficTempsReel>(`${BASE_PATH}/temps-reel`, { signal });
  return data;
}
