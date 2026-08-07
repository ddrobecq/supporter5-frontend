import { http } from '../../lib/http';
import type { TourMatchRow } from '../competition/types';
import type { CompositionMap, RencontreDetailRow, RencontreHighlightsRow, SquadPlayerRow, TourMatchWithNamesRow } from './types';

export async function fetchRencontreDetailById(rencontreId: string | number): Promise<RencontreDetailRow> {
  const { data } = await http.get<RencontreDetailRow>(`/api/rencontres/${encodeURIComponent(String(rencontreId))}/detail`);
  return data;
}

export async function updateRencontreDetail(
  rencontreId: string | number,
  payload: Partial<TourMatchRow>,
): Promise<TourMatchRow | undefined> {
  const { data } = await http.put<TourMatchRow>(`/api/admin/rencontres/${encodeURIComponent(String(rencontreId))}`, payload);
  return data;
}

export async function fetchRencontreHighlightsById(rencontreId: string | number): Promise<RencontreHighlightsRow> {
  const { data } = await http.get<RencontreHighlightsRow>(`/api/rencontres/${encodeURIComponent(String(rencontreId))}/highlights`);
  return data;
}

export async function fetchRencontreTourMatches(rencontreId: string | number): Promise<TourMatchWithNamesRow[]> {
  const { data } = await http.get<{ data: TourMatchWithNamesRow[] }>(`/api/rencontres/${encodeURIComponent(String(rencontreId))}/tour-matches`);
  return data.data;
}

export async function fetchRencontreComposition(rencontreId: string | number): Promise<CompositionMap> {
  const { data } = await http.get<CompositionMap>(`/api/rencontres/${encodeURIComponent(String(rencontreId))}/composition`);
  return data ?? {};
}

export async function saveRencontreComposition(rencontreId: string | number, payload: CompositionMap): Promise<void> {
  await http.put(`/api/rencontres/${encodeURIComponent(String(rencontreId))}/composition`, payload);
}

export async function fetchRencontreSquad(rencontreId: string | number): Promise<SquadPlayerRow[]> {
  const { data } = await http.get<{ data: SquadPlayerRow[] }>(`/api/rencontres/${encodeURIComponent(String(rencontreId))}/squad`);
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

export async function updateMatchArbitre(macleunik: number, idarbitre: string | null): Promise<void> {
  await http.put(`/api/admin/matchs/${encodeURIComponent(String(macleunik))}`, { IDARBITRE: idarbitre || null });
}

export async function upsertRencontreArbitre(rencontreId: string | number, idarbitre: string | null): Promise<void> {
  await http.put(`/api/admin/rencontres/${encodeURIComponent(String(rencontreId))}/arbitre`, { IDARBITRE: idarbitre || null });
}

export interface RencontreMatchMetaPayload {
  IDARBITRE?: string | null;
  TECLEUNIK?: string | null;
  NBSPECT?: number;
  LIEU?: string | null;
}

export async function upsertRencontreMatchMeta(rencontreId: string | number, payload: RencontreMatchMetaPayload): Promise<void> {
  await http.put(`/api/admin/rencontres/${encodeURIComponent(String(rencontreId))}/match-meta`, payload);
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
  const { data } = await http.post<RencontreHighlightsRow>(`/api/rencontres/${encodeURIComponent(String(rencontreId))}/events`, payload);
  return data;
}

export async function updateRencontreEvent(rencontreId: string | number, evcleunik: number, payload: EventPayload): Promise<RencontreHighlightsRow> {
  const { data } = await http.put<RencontreHighlightsRow>(`/api/rencontres/${encodeURIComponent(String(rencontreId))}/events/${evcleunik}`, payload);
  return data;
}

export async function deleteRencontreEvent(rencontreId: string | number, evcleunik: number): Promise<RencontreHighlightsRow> {
  const { data } = await http.delete<RencontreHighlightsRow>(`/api/rencontres/${encodeURIComponent(String(rencontreId))}/events/${evcleunik}`);
  return data;
}
