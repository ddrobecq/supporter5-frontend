import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchCompetitionById, fetchCompetitionTourById, fetchTourParticipants } from './competitionApi';
import { toErrorMessage } from '../../components/useEntityPage';
import type { CompetitionRow, CompetitionTourRow, TourParticipantRow } from './types';

interface PaSourceRef {
  tourId: number;
  groupName: string;
  rank: number;
}

export type ProgrammedParticipantResolveMode = 'stable' | 'dynamic';

export interface ProgrammedParticipantResolveArgs {
  participant?: TourParticipantRow | null;
  source?: unknown;
  fallbackClubName?: unknown;
  mode: ProgrammedParticipantResolveMode;
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

/** Reference stable pour les appelants sans sources supplementaires (evite d'invalider les memos a chaque rendu). */
const NO_EXTRA_SOURCES: unknown[] = [];

const tourMetaCache = new Map<number, SourceTourMeta>();
const competitionCache = new Map<number, CompetitionRow>();
const participantsCache = new Map<number, TourParticipantRow[]>();

function buildInitialFromCache(tourIds: number[]): {
  details: Record<string, SourceTourMeta>;
  competitions: Record<string, CompetitionRow>;
  participants: Record<string, TourParticipantRow[]>;
} {
  const details: Record<string, SourceTourMeta> = {};
  const competitions: Record<string, CompetitionRow> = {};
  const participants: Record<string, TourParticipantRow[]> = {};

  for (const id of tourIds) {
    const meta = tourMetaCache.get(id);
    if (!meta) continue;
    details[String(id)] = meta;

    const competitionId = Number(meta.COCLEUNIK ?? 0);
    if (competitionId > 0) {
      const competition = competitionCache.get(competitionId);
      if (competition) {
        competitions[String(competitionId)] = competition;
      }
    }

    const rows = participantsCache.get(id);
    if (rows) {
      participants[String(id)] = rows;
    }
  }

  return { details, competitions, participants };
}

export function useProgrammedParticipantLabels(
  participants: TourParticipantRow[],
  competitionId: number,
  competitionSeason: string,
  extraSourcesOrOnError?: unknown[] | ((message: string) => void),
  onError?: (message: string) => void,
): (row: TourParticipantRow) => string {
  const extraSources = Array.isArray(extraSourcesOrOnError) ? extraSourcesOrOnError : NO_EXTRA_SOURCES;
  const effectiveOnError = typeof extraSourcesOrOnError === 'function' ? extraSourcesOrOnError : onError;
  const resolveProgrammedParticipantName = useProgrammedParticipantResolver(
    participants,
    competitionId,
    competitionSeason,
    extraSources,
    effectiveOnError,
  );

  return useCallback((row: TourParticipantRow) => resolveProgrammedParticipantName({ participant: row, mode: 'stable' }), [resolveProgrammedParticipantName]);
}

export function useProgrammedParticipantResolver(
  participants: TourParticipantRow[],
  competitionId: number,
  competitionSeason: string,
  extraSources: unknown[] = [],
  onError?: (message: string) => void,
): (args: ProgrammedParticipantResolveArgs) => string {
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const normalizedExtraSources = useMemo(
    () => extraSources.map((value) => String(value ?? '').trim()).filter(Boolean),
    [extraSources],
  );

  const sourceTourIds = useMemo(() => Array.from(new Set([
    ...participants
      .map((row) => parsePaSourceForLabel(row.PASource)?.tourId)
      .filter((value): value is number => Number.isInteger(value) && Number(value) > 0),
    ...normalizedExtraSources
      .map((value) => parsePaSourceForLabel(value)?.tourId)
      .filter((value): value is number => Number.isInteger(value) && Number(value) > 0),
  ])), [normalizedExtraSources, participants]);

  const [sourceTourDetailsById, setSourceTourDetailsById] = useState<Record<string, SourceTourMeta>>(() => buildInitialFromCache(sourceTourIds).details);
  const [sourceCompetitionById, setSourceCompetitionById] = useState<Record<string, CompetitionRow>>(() => buildInitialFromCache(sourceTourIds).competitions);
  const [sourceTourParticipantsById, setSourceTourParticipantsById] = useState<Record<string, TourParticipantRow[]>>(() => buildInitialFromCache(sourceTourIds).participants);

  // Cle par valeur: l'effet ne doit dependre que du contenu des ids, pas de l'identite du tableau,
  // sinon un appelant qui ne memoise pas ses arguments declenche une boucle de rendu infinie.
  const sourceTourIdsKey = sourceTourIds.join(',');

  useEffect(() => {
    const tourIds = sourceTourIdsKey ? sourceTourIdsKey.split(',').map(Number) : [];

    if (tourIds.length === 0) {
      setSourceTourDetailsById((current) => (Object.keys(current).length === 0 ? current : {}));
      setSourceCompetitionById((current) => (Object.keys(current).length === 0 ? current : {}));
      setSourceTourParticipantsById((current) => (Object.keys(current).length === 0 ? current : {}));
      return;
    }

    const fromCache = buildInitialFromCache(tourIds);
    setSourceTourDetailsById(fromCache.details);
    setSourceCompetitionById(fromCache.competitions);
    setSourceTourParticipantsById(fromCache.participants);

    const missingTourIds = tourIds.filter((id) => !tourMetaCache.has(id) || !participantsCache.has(id));
    if (missingTourIds.length === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const nextTourDetails: Record<string, SourceTourMeta> = { ...fromCache.details };
      const nextTourParticipants: Record<string, TourParticipantRow[]> = { ...fromCache.participants };
      const competitionIds = new Set<number>();
      const visitedTourIds = new Set<number>();
      const pendingTourIds = [...tourIds];

      while (pendingTourIds.length > 0) {
        const sourceTourId = Number(pendingTourIds.shift());
        if (!Number.isInteger(sourceTourId) || sourceTourId <= 0 || visitedTourIds.has(sourceTourId)) {
          continue;
        }

        visitedTourIds.add(sourceTourId);
        let meta = tourMetaCache.get(sourceTourId);
        let sourceParticipants = participantsCache.get(sourceTourId);

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
          tourMetaCache.set(sourceTourId, meta);
          participantsCache.set(sourceTourId, sourceParticipants);
        }

        nextTourDetails[String(sourceTourId)] = meta;
        nextTourParticipants[String(sourceTourId)] = sourceParticipants;

        const sourceCompetitionId = Number(meta.COCLEUNIK ?? 0);
        if (sourceCompetitionId > 0) {
          competitionIds.add(sourceCompetitionId);
        }

        sourceParticipants.forEach((participant) => {
          const nestedTourId = parsePaSourceForLabel(participant.PASource)?.tourId;
          if (nestedTourId && !visitedTourIds.has(nestedTourId)) {
            pendingTourIds.push(nestedTourId);
          }
        });
      }

      const missingCompetitionIds = Array.from(competitionIds).filter((id) => !competitionCache.has(id));
      const competitionEntries = await Promise.all(
        missingCompetitionIds.map(async (key) => ({ key, data: await fetchCompetitionById(key) })),
      );

      if (cancelled) return;

      const nextCompetitions: Record<string, CompetitionRow> = { ...fromCache.competitions };
      competitionEntries.forEach(({ key, data }) => {
        competitionCache.set(key, data);
        nextCompetitions[String(key)] = data;
      });
      Array.from(competitionIds).forEach((id) => {
        const cachedCompetition = competitionCache.get(id);
        if (cachedCompetition) {
          nextCompetitions[String(id)] = cachedCompetition;
        }
      });

      setSourceTourDetailsById(nextTourDetails);
      setSourceCompetitionById(nextCompetitions);
      setSourceTourParticipantsById(nextTourParticipants);
    })().catch((error) => {
      if (!cancelled) {
        onErrorRef.current?.(toErrorMessage(error));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sourceTourIdsKey]);

  const resolveDynamicNamesFromSource = useCallback((sourceValue: string, visited: Set<string>): string[] => {
    const normalizedSource = String(sourceValue ?? '').trim();
    if (!normalizedSource || visited.has(normalizedSource)) {
      return [];
    }

    const parsed = parsePaSourceForLabel(normalizedSource);
    if (!parsed) {
      return [];
    }

    visited.add(normalizedSource);
    const duel = parseEliminatoireGroupPair(parsed.groupName);
    const sourceRows = sourceTourParticipantsById[String(parsed.tourId)] ?? [];
    const candidates = duel
      ? sourceRows.filter((candidate) => (
        Number(candidate.PACLEUNIK) === duel.leftParticipantId
        || Number(candidate.PACLEUNIK) === duel.rightParticipantId
      ))
      : sourceRows.filter(
        (candidate) => String(candidate.GROUPE ?? '').trim() === parsed.groupName
          && Number(candidate.PAClassement ?? 0) === parsed.rank,
      );

    const names = new Set<string>();
    candidates.forEach((candidate) => {
      const clubName = String(candidate.CLUB ?? '').trim();
      if (clubName) {
        names.add(clubName);
      }

      const nestedSource = String(candidate.PASource ?? '').trim();
      if (nestedSource) {
        resolveDynamicNamesFromSource(nestedSource, visited).forEach((name) => names.add(name));
      }
    });

    visited.delete(normalizedSource);
    return Array.from(names).sort((left, right) => left.localeCompare(right, 'fr', { sensitivity: 'base' }));
  }, [sourceTourDetailsById, sourceTourParticipantsById]);

  const resolveProgrammedParticipantName = useCallback((args: ProgrammedParticipantResolveArgs, visited: Set<string> = new Set()): string => {
    const clubName = String(args.participant?.CLUB ?? args.fallbackClubName ?? '').trim();
    if (clubName) {
      return clubName;
    }

    const sourceValue = String(args.participant?.PASource ?? args.source ?? '').trim();
    if (!sourceValue) {
      return '(Participant programme)';
    }

    if (args.mode === 'dynamic') {
      const names = resolveDynamicNamesFromSource(sourceValue, visited);
      if (names.length > 0) {
        return names.join('/');
      }
    }

    if (visited.has(sourceValue)) {
      return `Programme (${sourceValue})`;
    }

    const parsed = parsePaSourceForLabel(sourceValue);
    if (!parsed) {
      return `Programme (${sourceValue})`;
    }

    const sourceTour = sourceTourDetailsById[String(parsed.tourId)];
    const sourceTourName = String(sourceTour?.NOM ?? sourceTour?.TOUR ?? '').trim() || `Tour ${parsed.tourId}`;
    const sourceCompetitionId = Number(sourceTour?.COCLEUNIK ?? 0);
    const sourceCompetition = sourceCompetitionById[String(sourceCompetitionId)];
    const sourceCompetitionName = String(sourceCompetition?.NOM ?? '').trim();
    const sourceSeason = String(sourceCompetition?.SAISON ?? '').trim();
    const isEliminatoireSource = Number(sourceTour?.TYPE_ID ?? 0) === 2;
    const groupLabel = formatGroupLabel(parsed.groupName);
    visited.add(sourceValue);

    if (isEliminatoireSource) {
      const outcomeLabel = formatEliminatoireOutcomeLabel(parsed.rank);
      const duel = parseEliminatoireGroupPair(parsed.groupName);
      if (duel) {
        const sourceRows = sourceTourParticipantsById[String(parsed.tourId)] ?? [];
        const leftParticipant = sourceRows.find((candidate) => Number(candidate.PACLEUNIK) === duel.leftParticipantId);
        const rightParticipant = sourceRows.find((candidate) => Number(candidate.PACLEUNIK) === duel.rightParticipantId);
        const leftLabel = leftParticipant
          ? resolveProgrammedParticipantName({ participant: leftParticipant, mode: 'stable' }, visited)
          : `Participant ${duel.leftParticipantId}`;
        const rightLabel = rightParticipant
          ? resolveProgrammedParticipantName({ participant: rightParticipant, mode: 'stable' }, visited)
          : `Participant ${duel.rightParticipantId}`;
        visited.delete(sourceValue);
        return `${outcomeLabel} de ${leftLabel} vs ${rightLabel}`;
      }

      visited.delete(sourceValue);
      return groupLabel ? `${outcomeLabel} du ${groupLabel}` : outcomeLabel;
    }

    const rankLabel = formatRankLabel(parsed.rank);
    const parts: string[] = groupLabel ? [`${rankLabel} du ${groupLabel}`] : [`${rankLabel} de ${sourceTourName}`];
    if (groupLabel) {
      parts.push(`de ${sourceTourName}`);
    }
    if (sourceCompetitionName && sourceCompetitionId > 0 && sourceCompetitionId !== Number(competitionId ?? 0)) {
      parts.push(`de ${sourceCompetitionName}`);
    }
    if (sourceSeason && sourceSeason !== String(competitionSeason ?? '').trim()) {
      parts.push(sourceSeason);
    }

    visited.delete(sourceValue);
    return parts.join(' ');
  }, [competitionId, competitionSeason, resolveDynamicNamesFromSource, sourceCompetitionById, sourceTourDetailsById, sourceTourParticipantsById]);

  return resolveProgrammedParticipantName;
}
