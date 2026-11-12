import { env } from '../../config/env';
import { http } from '../../lib/http';
import type { TourMatchRow, TourParticipantRow } from '../competition/types';
import type { CompositionMap, OnThisDayMatchRow, RencontreDetailRow, RencontreHighlightsRow, SquadPlayerRow, TourMatchWithNamesRow } from './types';

export async function fetchOnThisDayMatch(signal?: AbortSignal): Promise<OnThisDayMatchRow | null> {
  const { data } = await http.get<OnThisDayMatchRow | null>('/api/rencontres/on-this-day', { signal });
  return data ?? null;
}

export type CreateRencontrePayload = Omit<TourMatchRow, 'RECLEUNIK'>;

export async function createRencontre(payload: CreateRencontrePayload): Promise<TourMatchRow | undefined> {
  const { data } = await http.post<TourMatchRow>(env.rencontreAdminResource, payload);
  return data;
}

export async function fetchRencontreDetailById(rencontreId: string | number, signal?: AbortSignal): Promise<RencontreDetailRow> {
  const { data } = await http.get<RencontreDetailRow>(`/api/rencontres/${encodeURIComponent(String(rencontreId))}/detail`, { signal });
  return data;
}

export async function updateRencontreDetail(
  rencontreId: string | number,
  payload: Partial<TourMatchRow>,
): Promise<TourMatchRow | undefined> {
  const { data } = await http.put<TourMatchRow>(`${env.rencontreAdminResource}/${encodeURIComponent(String(rencontreId))}`, payload);
  return data;
}

export async function fetchRencontreHighlightsById(rencontreId: string | number, signal?: AbortSignal): Promise<RencontreHighlightsRow> {
  const { data } = await http.get<RencontreHighlightsRow>(`/api/rencontres/${encodeURIComponent(String(rencontreId))}/highlights`, { signal });
  return data;
}

export async function fetchRencontreTourMatches(rencontreId: string | number, signal?: AbortSignal): Promise<TourMatchWithNamesRow[]> {
  const { data } = await http.get<{ data: TourMatchWithNamesRow[] }>(`/api/rencontres/${encodeURIComponent(String(rencontreId))}/tour-matches`, { signal });
  return data.data;
}

export async function fetchTourParticipants(tourId: string | number, signal?: AbortSignal): Promise<TourParticipantRow[]> {
  const { data } = await http.get<{ data?: TourParticipantRow[] }>(`${env.tourPublicResource}/${encodeURIComponent(String(tourId))}/participants`, { signal });
  return data.data ?? [];
}

export async function fetchRencontreComposition(rencontreId: string | number, signal?: AbortSignal): Promise<CompositionMap> {
  const { data } = await http.get<CompositionMap>(`/api/rencontres/${encodeURIComponent(String(rencontreId))}/composition`, { signal });
  return data ?? {};
}

/** Renvoie les avertissements métier du serveur (ex: composition incomplète), vide s'il n'y en a pas. */
export async function saveRencontreComposition(rencontreId: string | number, payload: CompositionMap): Promise<string[]> {
  const { data } = await http.put<{ warnings?: string[] }>(`${env.rencontreAdminResource}/${encodeURIComponent(String(rencontreId))}/composition`, payload);
  return Array.isArray(data?.warnings) ? data.warnings : [];
}

export async function fetchRencontreSquad(rencontreId: string | number, signal?: AbortSignal): Promise<SquadPlayerRow[]> {
  const { data } = await http.get<{ data: SquadPlayerRow[] }>(`/api/rencontres/${encodeURIComponent(String(rencontreId))}/squad`, { signal });
  return data.data;
}

export async function fetchArbitreById(idarbitre: string): Promise<{ IDARBITRE: string; NOM: string; PRENOM: string; IDNATIO: string } | null> {
  try {
    const { data } = await http.get<{ IDARBITRE: string; NOM: string; PRENOM: string; IDNATIO: string }>(`/api/arbitre/${encodeURIComponent(idarbitre)}`);
    return data ?? null;
  } catch {
    return null;
  }
}

export interface RencontreMatchMetaPayload {
  IDARBITRE?: string | null;
  TECLEUNIK?: string | null;
  NBSPECT?: number;
  LIEU?: string | null;
  EXTRATIME?: number;
  PENALTY?: number;
}

export async function upsertRencontreMatchMeta(rencontreId: string | number, payload: RencontreMatchMetaPayload): Promise<void> {
  await http.put(`${env.rencontreAdminResource}/${encodeURIComponent(String(rencontreId))}/match-meta`, payload);
}

export interface EventPayload {
  adversaire: number;
  minute: number;
  periode: number;
  typeEvent: number;
  joueur1: string | null;
  joueur2: string | null;
  comment: string | null;
}

export async function createRencontreEvent(rencontreId: string | number, payload: EventPayload): Promise<RencontreHighlightsRow> {
  const { data } = await http.post<RencontreHighlightsRow>(`${env.rencontreAdminResource}/${encodeURIComponent(String(rencontreId))}/events`, payload);
  return data;
}

export async function updateRencontreEvent(rencontreId: string | number, evcleunik: number, payload: EventPayload): Promise<RencontreHighlightsRow> {
  const { data } = await http.put<RencontreHighlightsRow>(`${env.rencontreAdminResource}/${encodeURIComponent(String(rencontreId))}/events/${evcleunik}`, payload);
  return data;
}

export async function deleteRencontreEvent(rencontreId: string | number, evcleunik: number): Promise<RencontreHighlightsRow> {
  const { data } = await http.delete<RencontreHighlightsRow>(`${env.rencontreAdminResource}/${encodeURIComponent(String(rencontreId))}/events/${evcleunik}`);
  return data;
}

export async function recomputeRencontreStats(rencontreId: string | number): Promise<void> {
  await http.post(`${env.rencontreAdminResource}/${encodeURIComponent(String(rencontreId))}/recompute-stats`);
}
