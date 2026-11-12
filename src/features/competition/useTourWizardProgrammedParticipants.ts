import { useEffect, useMemo, useState } from 'react';
import { useDepsChanged } from '../../lib/useDepsChanged';
import { toErrorMessage } from '../../components/useEntityPage';
import { fetchCompetition, fetchCompetitionTours, fetchCompetitionWizardData, fetchTourParticipants } from './competitionApi';
import {
  buildPossibleProgrammedClubsByGroup,
  buildSourceRankSelectOptions,
  getDistinctRanks,
} from './tourWizardProgrammedParticipants';
import type { CompetitionRow, CompetitionTourRow, TourParticipantRow } from './types';

interface UseTourWizardProgrammedParticipantsArgs {
  competitionId: number;
  competitionSeason: string;
  currentTourOrder: number;
  programDialogOpen: boolean;
  onError?: (message: string) => void;
}

interface UseTourWizardProgrammedParticipantsResult {
  seasonOptions: string[];
  programSeason: string;
  setProgramSeason: (value: string) => void;
  programCompetitions: CompetitionRow[];
  programCompetitionId: string;
  setProgramCompetitionId: (value: string) => void;
  programTours: CompetitionTourRow[];
  programTourId: string;
  setProgramTourId: (value: string) => void;
  programSourceParticipants: TourParticipantRow[];
  programSourceRanks: string[];
  setProgramSourceRanks: (value: string[]) => void;
  sourceRankSelectOptions: Array<{ value: string; label: string }>;
  isSelectedProgramTourEliminatoire: boolean;
  possibleProgrammedClubsByGroup: Array<{ group: string; clubs: string[] }>;
}

function isPositiveIntegerId(value: string): boolean {
  const id = Number(value);
  return Number.isInteger(id) && id > 0;
}

export function useTourWizardProgrammedParticipants({
  competitionId,
  competitionSeason,
  currentTourOrder,
  programDialogOpen,
  onError,
}: UseTourWizardProgrammedParticipantsArgs): UseTourWizardProgrammedParticipantsResult {
  const [seasonOptions, setSeasonOptions] = useState<string[]>([]);
  const [programSeason, setProgramSeason] = useState<string>('');
  const [programCompetitions, setProgramCompetitions] = useState<CompetitionRow[]>([]);
  const [programCompetitionId, setProgramCompetitionId] = useState<string>('');
  const [programTours, setProgramTours] = useState<CompetitionTourRow[]>([]);
  const [programTourId, setProgramTourId] = useState<string>('');
  const [programSourceParticipants, setProgramSourceParticipants] = useState<TourParticipantRow[]>([]);
  const [programSourceRanks, setProgramSourceRanks] = useState<string[]>([]);

  const sourceRankOptions = useMemo(() => getDistinctRanks(programSourceParticipants), [programSourceParticipants]);

  const selectedProgramTour = useMemo(() => {
    const selectedId = String(programTourId ?? '').trim();
    return selectedId ? programTours.find((tour) => String(tour.TUCLEUNIK ?? '') === selectedId) : undefined;
  }, [programTourId, programTours]);

  const isSelectedProgramTourEliminatoire = Number(selectedProgramTour?.TYPE_ID ?? 0) === 2;

  const sourceRankSelectOptions = useMemo(
    () => buildSourceRankSelectOptions(isSelectedProgramTourEliminatoire, sourceRankOptions),
    [isSelectedProgramTourEliminatoire, sourceRankOptions],
  );

  const possibleProgrammedClubsByGroup = useMemo(() => {
    const selectedRanks = Array.from(new Set(programSourceRanks.map(Number).filter((rank) => Number.isInteger(rank) && rank > 0)));
    return buildPossibleProgrammedClubsByGroup(programSourceParticipants, selectedRanks);
  }, [programSourceParticipants, programSourceRanks]);

  // Synchronous resets run while rendering, on the same dependencies as the matching loading effects below.
  const competitionsDepsChanged = useDepsChanged([competitionId, onError, programDialogOpen, programSeason]);
  if (competitionsDepsChanged && programDialogOpen && !programSeason) {
    setProgramCompetitions([]);
    setProgramCompetitionId('');
  }

  const toursDepsChanged = useDepsChanged([currentTourOrder, onError, programCompetitionId, programDialogOpen]);
  if (toursDepsChanged && programDialogOpen && !isPositiveIntegerId(programCompetitionId)) {
    setProgramTours([]);
    setProgramTourId('');
  }

  const sourceParticipantsDepsChanged = useDepsChanged([onError, programDialogOpen, programTourId]);
  if (sourceParticipantsDepsChanged && programDialogOpen && !isPositiveIntegerId(programTourId)) {
    setProgramSourceParticipants([]);
    setProgramSourceRanks([]);
  }

  const sourceRankOptionsChanged = useDepsChanged([sourceRankSelectOptions]);
  if (sourceRankOptionsChanged) {
    if (sourceRankSelectOptions.length === 0) {
      setProgramSourceRanks([]);
    } else {
      setProgramSourceRanks((current) => {
        const valid = current.filter((value) => sourceRankSelectOptions.some((option) => option.value === value));
        return valid.length > 0 ? Array.from(new Set(valid)) : [sourceRankSelectOptions[0].value];
      });
    }
  }

  useEffect(() => {
    if (!programDialogOpen) {
      return;
    }

    let cancelled = false;
    void fetchCompetitionWizardData()
      .then((data) => {
        if (cancelled) return;
        const seasons = (data.saisons ?? []).map((row) => String(row.SAISON ?? '').trim()).filter(Boolean);
        setSeasonOptions(seasons);
        const preferred = String(competitionSeason ?? '').trim();
        setProgramSeason(seasons.includes(preferred) ? preferred : (seasons[0] ?? ''));
      })
      .catch((error) => {
        if (!cancelled) {
          onError?.(toErrorMessage(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [competitionSeason, onError, programDialogOpen]);

  useEffect(() => {
    if (!programDialogOpen) {
      return;
    }
    if (!programSeason) {
      return;
    }

    let cancelled = false;
    void fetchCompetition('', programSeason)
      .then((data) => {
        if (cancelled) return;
        const competitionRows = data.data ?? [];
        setProgramCompetitions(competitionRows);
        const currentId = String(competitionId ?? '').trim();
        const hasCurrentCompetition = competitionRows.some((row) => String(row.COCLEUNIK ?? '').trim() === currentId);
        const firstId = competitionRows[0]?.COCLEUNIK == null ? '' : String(competitionRows[0].COCLEUNIK).trim();
        setProgramCompetitionId((current) => {
          if (current && competitionRows.some((row) => String(row.COCLEUNIK ?? '').trim() === current)) return current;
          return hasCurrentCompetition ? currentId : firstId;
        });
      })
      .catch((error) => {
        if (!cancelled) {
          onError?.(toErrorMessage(error));
          setProgramCompetitions([]);
          setProgramCompetitionId('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [competitionId, onError, programDialogOpen, programSeason]);

  useEffect(() => {
    if (!programDialogOpen) {
      return;
    }
    if (!isPositiveIntegerId(programCompetitionId)) {
      return;
    }
    const compId = Number(programCompetitionId);

    let cancelled = false;
    void fetchCompetitionTours(compId)
      .then((tourRows) => {
        if (cancelled) return;
        setProgramTours(tourRows);
        const sorted = [...tourRows].sort((a, b) => Number(a.TU_ORDRE ?? 0) - Number(b.TU_ORDRE ?? 0) || Number(a.TUCLEUNIK ?? 0) - Number(b.TUCLEUNIK ?? 0));
        const previousTour = sorted.filter((tour) => Number(tour.TU_ORDRE ?? 0) < Number(currentTourOrder ?? 0)).pop();
        const defaultTourId = previousTour ? String(previousTour.TUCLEUNIK ?? '').trim() : '';
        setProgramTourId((current) => {
          if (current && tourRows.some((row) => String(row.TUCLEUNIK) === current)) return current;
          return defaultTourId || '';
        });
      })
      .catch((error) => {
        if (!cancelled) {
          onError?.(toErrorMessage(error));
          setProgramTours([]);
          setProgramTourId('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentTourOrder, onError, programCompetitionId, programDialogOpen]);

  useEffect(() => {
    if (!programDialogOpen) {
      return;
    }
    if (!isPositiveIntegerId(programTourId)) {
      return;
    }
    const sourceTourId = Number(programTourId);

    let cancelled = false;
    void fetchTourParticipants(sourceTourId)
      .then((sourceRows) => {
        if (!cancelled) {
          setProgramSourceParticipants(sourceRows);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          onError?.(toErrorMessage(error));
          setProgramSourceParticipants([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onError, programDialogOpen, programTourId]);

  return {
    seasonOptions,
    programSeason,
    setProgramSeason,
    programCompetitions,
    programCompetitionId,
    setProgramCompetitionId,
    programTours,
    programTourId,
    setProgramTourId,
    programSourceParticipants,
    programSourceRanks,
    setProgramSourceRanks,
    sourceRankSelectOptions,
    isSelectedProgramTourEliminatoire,
    possibleProgrammedClubsByGroup,
  };
}
