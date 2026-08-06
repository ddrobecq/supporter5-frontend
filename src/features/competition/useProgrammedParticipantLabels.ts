import { useCallback, useEffect, useState } from 'react';
import { fetchCompetitionById, fetchCompetitionTourById, fetchTourParticipants } from './competitionApi';
import { toErrorMessage } from '../../components/useEntityPage';
import type { CompetitionRow, CompetitionTourRow, TourParticipantRow } from './types';

interface PaSourceRef {
  tourId: number;
  groupName: string;
  rank: number;
}

export function parsePaSourceForLabel(value: unknown): PaSourceRef | null {
  const source = String(value ?? '').trim();
  if (!source) return null;
  const parts = source.split(',');
  if (parts.length !== 3) return null;
  const tourId = Number(parts[0]);
  const groupName = String(parts[1] ?? '').trim();
  const rank = Number(parts[2]);
  if (!Number.isInteger(tourId) || tourId <= 0 || !Number.isInteger(rank) || rank <= 0) return null;
  return { tourId, groupName, rank };
}

function formatRankLabel(rank: number): string {
  return rank === 1 ? '1er' : `${rank}e`;
}

function formatGroupLabel(groupName: string): string {
  const normalized = String(groupName ?? '').trim();
  if (!normalized) return '';
  return /^groupe\b/i.test(normalized) ? normalized : `Groupe ${normalized}`;
}

function formatEliminatoireOutcomeLabel(rank: number): string {
  if (rank === 1) return 'Vainqueur';
  if (rank === 2) return 'Perdant';
  return formatRankLabel(rank);
}

function parseEliminatoireGroupPair(groupName: string): { leftParticipantId: number; rightParticipantId: number } | null {
  const match = /^(\d+)\s*vs\s*(\d+)$/i.exec(String(groupName ?? '').trim());
  if (!match) return null;
  const left = Number(match[1]);
  const right = Number(match[2]);
  if (!Number.isInteger(left) || left <= 0 || !Number.isInteger(right) || right <= 0) return null;
  return { leftParticipantId: left, rightParticipantId: right };
}

type SourceTourMeta = CompetitionTourRow & { SAISON?: string; COCLEUNIK?: number; NOM?: string };

// Module-level caches so subsequent renders get rich labels immediately without a flash.
const _tourMetaCache = new Map<number, SourceTourMeta>();
const _competitionCache = new Map<number, CompetitionRow>();
const _participantsCache = new Map<number, TourParticipantRow[]>();

function buildInitialFromCache(tourIds: number[]): {
  details: Record<string, SourceTourMeta>;
  competitions: Record<string, CompetitionRow>;
  participants: Record<string, TourParticipantRow[]>;
} {
  const details: Record<string, SourceTourMeta> = {};
  const competitions: Record<string, CompetitionRow> = {};
  const participants: Record<string, TourParticipantRow[]> = {};

  for (const id of tourIds) {
    const meta = _tourMetaCache.get(id);
    if (meta) {
      details[String(id)] = meta;
      const compId = Number(meta.COCLEUNIK ?? 0);
      const comp = compId > 0 ? _competitionCache.get(compId) : undefined;
      if (comp) competitions[String(compId)] = comp;
      const rows = _participantsCache.get(id);
      if (rows) participants[String(id)] = rows;
    }
  }

  return { details, competitions, participants };
}

/**
 * Resolves rich display labels for programmed participants based on their PASource chain.
 * Returns a stable getLabel function that can be used in column renderers.
 */
export function useProgrammedParticipantLabels(
  participants: TourParticipantRow[],
  competitionId: number,
  competitionSeason: string,
  onError?: (message: string) => void,
): (row: TourParticipantRow) => string {
  const [sourceTourDetailsById, setSourceTourDetailsById] = useState<Record<string, SourceTourMeta>>(() => {
    const ids = participants.map((r) => parsePaSourceForLabel(r.PASource)?.tourId).filter((v): v is number => Number.isInteger(v) && Number(v) > 0);
    return buildInitialFromCache(ids).details;
  });
  const [sourceCompetitionById, setSourceCompetitionById] = useState<Record<string, CompetitionRow>>(() => {
    const ids = participants.map((r) => parsePaSourceForLabel(r.PASource)?.tourId).filter((v): v is number => Number.isInteger(v) && Number(v) > 0);
    return buildInitialFromCache(ids).competitions;
  });
  const [sourceTourParticipantsById, setSourceTourParticipantsById] = useState<Record<string, TourParticipantRow[]>>(() => {
    const ids = participants.map((r) => parsePaSourceForLabel(r.PASource)?.tourId).filter((v): v is number => Number.isInteger(v) && Number(v) > 0);
    return buildInitialFromCache(ids).participants;
  });

  useEffect(() => {
    const sourceTourIds = Array.from(
      new Set(
        participants
          .map((row) => parsePaSourceForLabel(row.PASource)?.tourId)
          .filter((value): value is number => Number.isInteger(value) && Number(value) > 0),
      ),
    );

    if (sourceTourIds.length === 0) {
      setSourceTourDetailsById({});
      setSourceCompetitionById({});
      setSourceTourParticipantsById({});
      return;
    }

    // Pre-populate from cache so the grid doesn't flash before fetch completes.
    const fromCache = buildInitialFromCache(sourceTourIds);
    setSourceTourDetailsById(fromCache.details);
    setSourceCompetitionById(fromCache.competitions);
    setSourceTourParticipantsById(fromCache.participants);

    const missingTourIds = sourceTourIds.filter((id) => !_tourMetaCache.has(id));
    if (missingTourIds.length === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const nextTourDetails: Record<string, SourceTourMeta> = {};
      const nextTourParticipantsById: Record<string, TourParticipantRow[]> = {};
      const competitionIds = new Set<number>();
      const visitedTourIds = new Set<number>();
      const pendingTourIds = [...sourceTourIds];

      while (pendingTourIds.length > 0) {
        const sourceTourId = Number(pendingTourIds.shift());
        if (!Number.isInteger(sourceTourId) || sourceTourId <= 0 || visitedTourIds.has(sourceTourId)) {
          continue;
        }

        visitedTourIds.add(sourceTourId);

        // Use cache for already-known tours, fetch only missing ones.
        let meta = _tourMetaCache.get(sourceTourId);
        let sourceParticipants = _participantsCache.get(sourceTourId);

        if (!meta || !sourceParticipants) {
          const [detail, fetchedParticipants] = await Promise.all([
            fetchCompetitionTourById(sourceTourId),
            fetchTourParticipants(sourceTourId),
          ]);

          if (cancelled) return;

          meta = {
            TUCLEUNIK: Number(detail.TUCLEUNIK ?? sourceTourId),
            COCLEUNIK: Number(detail.COCLEUNIK ?? 0),
            TDCLEUNIK: Number(detail.TDCLEUNIK ?? 0),
            TU_ORDRE: Number(detail.TU_ORDRE ?? 0),
            TOUR: String(detail.NOM ?? ''),
            TYPE_ID: Number(detail.TDTYPETOUR ?? 0),
            TYPE: Number(detail.TDTYPETOUR ?? 0) === 2 ? 'Eliminatoire' : 'Ligue',
            NOM: String(detail.NOM ?? ''),
          };
          sourceParticipants = fetchedParticipants;

          _tourMetaCache.set(sourceTourId, meta);
          _participantsCache.set(sourceTourId, sourceParticipants);
        }

        nextTourDetails[String(sourceTourId)] = meta;
        nextTourParticipantsById[String(sourceTourId)] = sourceParticipants;

        const competitionKey = Number(meta.COCLEUNIK ?? 0);
        if (Number.isInteger(competitionKey) && competitionKey > 0) {
          competitionIds.add(competitionKey);
        }

        sourceParticipants.forEach((participant) => {
          const nestedId = parsePaSourceForLabel(participant.PASource)?.tourId;
          if (Number.isInteger(nestedId) && Number(nestedId) > 0 && !visitedTourIds.has(Number(nestedId))) {
            pendingTourIds.push(Number(nestedId));
          }
        });
      }

      const missingCompetitionIds = Array.from(competitionIds).filter((id) => !_competitionCache.has(id));
      const competitionEntries = await Promise.all(
        missingCompetitionIds.map(async (key) => ({ key, data: await fetchCompetitionById(key) })),
      );

      if (cancelled) return;

      const nextCompetitions: Record<string, CompetitionRow> = { ...fromCache.competitions };
      competitionEntries.forEach(({ key, data }) => {
        _competitionCache.set(key, data);
        nextCompetitions[String(key)] = data;
      });
      // Also include cached competitions for any competition IDs already in the cache.
      Array.from(competitionIds).forEach((id) => {
        const cached = _competitionCache.get(id);
        if (cached) nextCompetitions[String(id)] = cached;
      });

      setSourceTourDetailsById(nextTourDetails);
      setSourceCompetitionById(nextCompetitions);
      setSourceTourParticipantsById(nextTourParticipantsById);
    })().catch((error) => { if (!cancelled) onError?.(toErrorMessage(error)); });

    return () => { cancelled = true; };
  }, [onError, participants]);

  return useCallback((row: TourParticipantRow): string => {
    const clubName = String(row.CLUB ?? '').trim();
    if (clubName) return clubName;

    const source = String(row.PASource ?? '').trim();
    if (!source) return '(Participant programme)';

    const parsed = parsePaSourceForLabel(source);
    if (!parsed) return `Programme (${source})`;

    const currentCompetitionId = Number(competitionId ?? 0);
    const currentSeason = String(competitionSeason ?? '').trim();
    const sourceTour = sourceTourDetailsById[String(parsed.tourId)];
    const sourceTourName = String(sourceTour?.NOM ?? sourceTour?.TOUR ?? '').trim() || `Tour ${parsed.tourId}`;
    const sourceCompetitionId = Number(sourceTour?.COCLEUNIK ?? 0);
    const sourceCompetition = sourceCompetitionById[String(sourceCompetitionId)];
    const sourceCompetitionName = String(sourceCompetition?.NOM ?? '').trim();
    const sourceSeason = String(sourceCompetition?.SAISON ?? '').trim();
    const isEliminatoireSource = Number(sourceTour?.TYPE_ID ?? 0) === 2;

    const rankLabel = formatRankLabel(parsed.rank);
    const groupLabel = formatGroupLabel(parsed.groupName);

    if (isEliminatoireSource) {
      const outcomeLabel = formatEliminatoireOutcomeLabel(parsed.rank);

      const resolveNamesFromSource = (sourceValue: string, visited: Set<string>): string[] => {
        const norm = String(sourceValue ?? '').trim();
        if (!norm || visited.has(norm)) return [];
        visited.add(norm);
        const ps = parsePaSourceForLabel(norm);
        if (!ps) { visited.delete(norm); return []; }
        const candidates = (sourceTourParticipantsById[String(ps.tourId)] ?? []).filter(
          (c) => String(c.GROUPE ?? '').trim() === ps.groupName && Number(c.PAClassement ?? 0) === ps.rank,
        );
        const names = new Set<string>();
        candidates.forEach((c) => {
          const club = String(c.CLUB ?? '').trim();
          if (club) { names.add(club); return; }
          resolveNamesFromSource(String(c.PASource ?? '').trim(), visited).forEach((n) => names.add(n));
        });
        visited.delete(norm);
        return Array.from(names).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
      };

      const duel = parseEliminatoireGroupPair(parsed.groupName);
      if (duel) {
        const sourceRows = sourceTourParticipantsById[String(parsed.tourId)] ?? [];
        const leftP = sourceRows.find((c) => Number(c.PACLEUNIK) === duel.leftParticipantId);
        const rightP = sourceRows.find((c) => Number(c.PACLEUNIK) === duel.rightParticipantId);
        const resolveParticipant = (p: TourParticipantRow | undefined, id: number): string => {
          if (!p) return `Participant ${id}`;
          const club = String(p.CLUB ?? '').trim();
          const names = club ? [club] : resolveNamesFromSource(String(p.PASource ?? '').trim(), new Set());
          return names.length > 0 ? names.join('/') : `Participant ${id}`;
        };
        return `${outcomeLabel} de ${resolveParticipant(leftP, duel.leftParticipantId)} vs ${resolveParticipant(rightP, duel.rightParticipantId)}`;
      }

      return groupLabel ? `${outcomeLabel} de ${groupLabel}` : outcomeLabel;
    }

    const parts: string[] = groupLabel
      ? [`${rankLabel} du ${groupLabel} de ${sourceTourName}`]
      : [`${rankLabel} de ${sourceTourName}`];

    if (sourceCompetitionName && sourceCompetitionId > 0 && sourceCompetitionId !== currentCompetitionId) {
      parts.push(`de ${sourceCompetitionName}`);
    }
    if (sourceSeason && sourceSeason !== currentSeason) {
      parts.push(sourceSeason);
    }

    return parts.join(' ');
  }, [competitionId, competitionSeason, sourceCompetitionById, sourceTourDetailsById, sourceTourParticipantsById]);
}
