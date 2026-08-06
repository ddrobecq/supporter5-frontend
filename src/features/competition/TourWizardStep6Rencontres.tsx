import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { type GridColDef, type GridRowId } from '@mui/x-data-grid';
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { formatDateShort } from '../../components/DateInputField';
import { toErrorMessage } from '../../components/useEntityPage';
import {
  addTourParticipant,
  type CreateTourMatchPayload,
  fetchCompetitionById,
  createTourRencontre,
  fetchCompetition,
  fetchCompetitionTours,
  fetchCompetitionTourById,
  fetchCompetitionWizardData,
  deleteTourRencontre,
  fetchCircByTourType,
  fetchTourParticipants,
  fetchTourRencontres,
  updateTourRencontre,
} from './competitionApi';
import type { CircOptionRow, CompetitionRow, CompetitionTourRow, TourMatchRow, TourParticipantRow } from './types';

interface TourWizardStep6RencontresProps {
  tourId: number;
  competitionId: number;
  currentTourOrder: number;
  tourType: 'ligue' | 'eliminatoire';
  competitionSeason: string;
  tourStartDate: string;
  tourDefaultHeure: string;
  nbGroupe: number;
  groupNames: string[];
  onError?: (message: string) => void;
}

interface PendingRencontre {
  date: string;
  heure: string | null;
  domicileParticipantId: string;
  domicile: string;
  domicileSource: string;
  domicileLabel: string;
}

interface RencontresGridRow extends TourMatchRow {
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
}

function normalizeDate(value: string): string {
  const trimmed = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return '';
}

function parseDateInput(value: unknown): string {
  const trimmed = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const frenchMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (frenchMatch) {
    const [, dd, mm, yyyy] = frenchMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
}

function formatDateDisplay(value: unknown): string {
  return formatDateShort(value);
}

function normalizeHeure(value: string | null | undefined): string {
  const trimmed = String(value ?? '').trim();
  const compact = /^([01]\d|2[0-3])([0-5]\d)$/.exec(trimmed);
  if (compact) {
    return `${compact[1]}:${compact[2]}`;
  }
  const withH = /^([01]\d|2[0-3])h([0-5]\d)$/i.exec(trimmed);
  if (withH) {
    return `${withH[1]}:${withH[2]}`;
  }
  const withSeconds = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.exec(trimmed);
  if (withSeconds) {
    return `${withSeconds[1]}:${withSeconds[2]}`;
  }
  if (/^\d{2}:\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 5);
  }
  return '';
}

function formatHeureDisplay(value: unknown): string {
  const dbHeure = normalizeHeure(String(value ?? ''));
  if (!dbHeure) {
    return String(value ?? '').trim();
  }
  return `${dbHeure.slice(0, 2)}h${dbHeure.slice(3, 5)}`;
}

function compareDateHeure(a: TourMatchRow, b: TourMatchRow): number {
  const left = `${String(a.DATE ?? '')} ${String(a.HEURE ?? '')}`;
  const right = `${String(b.DATE ?? '')} ${String(b.HEURE ?? '')}`;
  return left.localeCompare(right, 'fr', { sensitivity: 'base' });
}

function normalizeCircId(value: unknown): string {
  return String(value ?? '').trim();
}

function buildDefaultGroupNames(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `Groupe ${index + 1}`);
}

function getParticipantLabel(row: TourParticipantRow): string {
  const clubName = String(row.CLUB ?? '').trim();
  if (clubName) {
    return clubName;
  }

  const source = String(row.PASource ?? '').trim();
  if (source) {
    return `Programme (${source})`;
  }

  return '(Participant programme)';
}

interface PaSourceRef {
  tourId: number;
  groupName: string;
  rank: number;
}

function parsePaSource(value: unknown): PaSourceRef | null {
  const source = String(value ?? '').trim();
  if (!source) {
    return null;
  }

  const parts = source.split(',');
  if (parts.length !== 3) {
    return null;
  }

  const tourId = Number(parts[0]);
  const groupName = String(parts[1] ?? '').trim();
  const rank = Number(parts[2]);
  if (!Number.isInteger(tourId) || tourId <= 0 || !Number.isInteger(rank) || rank <= 0) {
    return null;
  }

  return { tourId, groupName, rank };
}

function formatRankLabel(rank: number): string {
  if (rank === 1) {
    return '1er';
  }
  return `${rank}e`;
}

function formatGroupLabel(groupName: string): string {
  const normalized = String(groupName ?? '').trim();
  if (!normalized) {
    return '';
  }

  if (/^groupe\b/i.test(normalized)) {
    return normalized;
  }

  return `Groupe ${normalized}`;
}

function formatEliminatoireOutcomeLabel(rank: number): string {
  if (rank === 1) {
    return 'Vainqueur';
  }
  if (rank === 2) {
    return 'Perdant';
  }
  return formatRankLabel(rank);
}

function parseEliminatoireGroupPair(groupName: string): { leftParticipantId: number; rightParticipantId: number } | null {
  const normalized = String(groupName ?? '').trim();
  const match = /^(\d+)\s*vs\s*(\d+)$/i.exec(normalized);
  if (!match) {
    return null;
  }

  const leftParticipantId = Number(match[1]);
  const rightParticipantId = Number(match[2]);
  if (!Number.isInteger(leftParticipantId) || leftParticipantId <= 0 || !Number.isInteger(rightParticipantId) || rightParticipantId <= 0) {
    return null;
  }

  return { leftParticipantId, rightParticipantId };
}

function getDistinctSourceGroups(rows: TourParticipantRow[]): string[] {
  const groups = Array.from(new Set(rows.map((row) => String(row.GROUPE ?? '').trim())));
  return groups.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

function getDistinctRanks(rows: TourParticipantRow[]): number[] {
  const values = rows
    .map((row) => Number(row.PAClassement ?? 0))
    .filter((rank) => Number.isInteger(rank) && rank > 0);

  return Array.from(new Set(values)).sort((a, b) => a - b);
}

function getParticipantIdentityKey(row: TourParticipantRow): string {
  const clubId = String(row.IDCLUB ?? '').trim();
  if (clubId) {
    return `club:${clubId}`;
  }

  const source = String(row.PASource ?? '').trim();
  if (source) {
    return `src:${source}`;
  }

  return `pacleunik:${String(row.PACLEUNIK)}`;
}

export function TourWizardStep6Rencontres({
  tourId,
  competitionId,
  currentTourOrder,
  tourType,
  competitionSeason,
  tourStartDate,
  tourDefaultHeure,
  nbGroupe,
  groupNames,
  onError,
}: TourWizardStep6RencontresProps) {
  const [participants, setParticipants] = useState<TourParticipantRow[]>([]);
  const [rencontres, setRencontres] = useState<TourMatchRow[]>([]);
  const [circOptions, setCircOptions] = useState<CircOptionRow[]>([]);
  const [selectedCircId, setSelectedCircId] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [participantSelection, setParticipantSelection] = useState<GridRowId[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('');
  const [seasonOptions, setSeasonOptions] = useState<string[]>([]);
  const [programSeason, setProgramSeason] = useState<string>('');
  const [programCompetitions, setProgramCompetitions] = useState<CompetitionRow[]>([]);
  const [programCompetitionId, setProgramCompetitionId] = useState<string>('');
  const [programTours, setProgramTours] = useState<CompetitionTourRow[]>([]);
  const [programTourId, setProgramTourId] = useState<string>('');
  const [programSourceParticipants, setProgramSourceParticipants] = useState<TourParticipantRow[]>([]);
  const [programSourceRanks, setProgramSourceRanks] = useState<string[]>([]);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [sourceTourDetailsById, setSourceTourDetailsById] = useState<Record<string, CompetitionTourRow & { SAISON?: string; COCLEUNIK?: number; NOM?: string }>>({});
  const [sourceCompetitionById, setSourceCompetitionById] = useState<Record<string, CompetitionRow>>({});
  const [sourceTourParticipantsById, setSourceTourParticipantsById] = useState<Record<string, TourParticipantRow[]>>({});
  const [selectedRencontre, setSelectedRencontre] = useState<GridRowId[]>([]);
  const [pending, setPending] = useState<PendingRencontre | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingAutoSelectIndex, setPendingAutoSelectIndex] = useState<number | null>(null);
  const participantsGridRef = useRef<HTMLDivElement | null>(null);

  const typeId = tourType === 'eliminatoire' ? 2 : 1;
  const normalizedNbGroupe = Math.max(1, Number(nbGroupe) || 1);
  const hasMultipleGroups = normalizedNbGroupe > 1;

  const effectiveGroupNames = useMemo(() => {
    if (!hasMultipleGroups) {
      return [] as string[];
    }

    const names = groupNames
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0);

    if (names.length >= normalizedNbGroupe) {
      return names.slice(0, normalizedNbGroupe);
    }

    const defaults = buildDefaultGroupNames(normalizedNbGroupe);
    return defaults.map((defaultName, index) => names[index] ?? defaultName);
  }, [groupNames, hasMultipleGroups, normalizedNbGroupe]);

  const sourceRankOptions = useMemo(
    () => getDistinctRanks(programSourceParticipants),
    [programSourceParticipants],
  );

  const selectedProgramTour = useMemo(() => {
    const selectedId = String(programTourId ?? '').trim();
    if (!selectedId) {
      return undefined;
    }
    return programTours.find((tour) => String(tour.TUCLEUNIK ?? '') === selectedId);
  }, [programTourId, programTours]);

  const isSelectedProgramTourEliminatoire = Number(selectedProgramTour?.TYPE_ID ?? 0) === 2;

  const sourceRankSelectOptions = useMemo(
    () => (
      isSelectedProgramTourEliminatoire
        ? [
          { value: '1', label: 'Vainqueur' },
          { value: '2', label: 'Perdant' },
        ]
        : sourceRankOptions.map((rank) => ({ value: String(rank), label: String(rank) }))
    ),
    [isSelectedProgramTourEliminatoire, sourceRankOptions],
  );

  const possibleProgrammedClubsByGroup = useMemo(() => {
    const selectedRanks = Array.from(
      new Set(
        programSourceRanks
          .map((value) => Number(value))
          .filter((rank) => Number.isInteger(rank) && rank > 0),
      ),
    );

    if (selectedRanks.length === 0) {
      return [] as Array<{ group: string; clubs: string[] }>;
    }

    const grouped = new Map<string, string[]>();
    programSourceParticipants
      .filter((row) => selectedRanks.includes(Number(row.PAClassement ?? 0)))
      .forEach((row) => {
        const group = String(row.GROUPE ?? '').trim();
        const current = grouped.get(group) ?? [];
        const label = getParticipantLabel(row);
        if (label) {
          current.push(label);
        }
        grouped.set(group, current);
      });

    return Array.from(grouped.entries())
      .sort((left, right) => left[0].localeCompare(right[0], 'fr', { sensitivity: 'base' }))
      .map(([group, clubs]) => ({
        group,
        clubs,
      }));
  }, [programSourceParticipants, programSourceRanks]);

  useEffect(() => {
    let cancelled = false;

    void fetchCompetitionWizardData()
      .then((data) => {
        if (cancelled) {
          return;
        }

        const seasons = (data.saisons ?? [])
          .map((row) => String(row.SAISON ?? '').trim())
          .filter((value) => value.length > 0);

        setSeasonOptions(seasons);
        const preferred = String(competitionSeason ?? '').trim();
        const nextSeason = seasons.includes(preferred) ? preferred : (seasons[0] ?? '');
        setProgramSeason(nextSeason);
      })
      .catch((error) => {
        if (!cancelled) {
          onError?.(toErrorMessage(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [competitionSeason, onError]);

  useEffect(() => {
    if (!programSeason) {
      setProgramCompetitions([]);
      setProgramCompetitionId('');
      return;
    }

    let cancelled = false;

    void fetchCompetition('', programSeason)
      .then((data) => {
        if (cancelled) {
          return;
        }

        const rows = data.data ?? [];
        setProgramCompetitions(rows);
        const currentCompetitionId = String(competitionId ?? '').trim();
        const hasCurrentCompetition = rows.some(
          (row) => String(row.COCLEUNIK ?? '').trim() === currentCompetitionId,
        );
        const firstId = rows[0]?.COCLEUNIK == null ? '' : String(rows[0].COCLEUNIK).trim();
        setProgramCompetitionId((current) => {
          if (current && rows.some((row) => String(row.COCLEUNIK ?? '').trim() === current)) {
            return current;
          }
          if (hasCurrentCompetition) {
            return currentCompetitionId;
          }
          return firstId;
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
  }, [competitionId, programSeason, onError]);

  useEffect(() => {
    const competitionId = Number(programCompetitionId);
    if (!Number.isInteger(competitionId) || competitionId <= 0) {
      setProgramTours([]);
      setProgramTourId('');
      return;
    }

    let cancelled = false;

    void fetchCompetitionTours(competitionId)
      .then((rows) => {
        if (cancelled) {
          return;
        }

        setProgramTours(rows);

        const sortedTours = [...rows].sort((left, right) => {
          const orderDiff = Number(left.TU_ORDRE ?? 0) - Number(right.TU_ORDRE ?? 0);
          if (orderDiff !== 0) {
            return orderDiff;
          }
          return Number(left.TUCLEUNIK ?? 0) - Number(right.TUCLEUNIK ?? 0);
        });

        const previousTour = sortedTours
          .filter((tour) => Number(tour.TU_ORDRE ?? 0) < Number(currentTourOrder ?? 0))
          .pop();

        const defaultTourId = previousTour ? String(previousTour.TUCLEUNIK ?? '').trim() : '';

        setProgramTourId((current) => {
          if (current && rows.some((row) => String(row.TUCLEUNIK) === current)) {
            return current;
          }

          if (defaultTourId) {
            return defaultTourId;
          }
          return '';
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
  }, [currentTourOrder, programCompetitionId, onError]);

  useEffect(() => {
    const sourceTourId = Number(programTourId);
    if (!Number.isInteger(sourceTourId) || sourceTourId <= 0) {
      setProgramSourceParticipants([]);
      setProgramSourceRanks([]);
      return;
    }

    let cancelled = false;

    void fetchTourParticipants(sourceTourId)
      .then((rows) => {
        if (cancelled) {
          return;
        }

        setProgramSourceParticipants(rows);
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
  }, [programTourId, onError]);

  useEffect(() => {
    if (sourceRankSelectOptions.length === 0) {
      setProgramSourceRanks([]);
      return;
    }

    setProgramSourceRanks((current) => {
      const valid = current.filter((value) => sourceRankSelectOptions.some((option) => option.value === value));
      if (valid.length > 0) {
        return Array.from(new Set(valid));
      }
      return [sourceRankSelectOptions[0].value];
    });
  }, [sourceRankSelectOptions]);

  useEffect(() => {
    const sourceTourIds = Array.from(
      new Set(
        participants
          .map((row) => parsePaSource(row.PASource)?.tourId)
          .filter((value): value is number => Number.isInteger(value) && Number(value) > 0),
      ),
    );

    if (sourceTourIds.length === 0) {
      setSourceTourDetailsById({});
      setSourceCompetitionById({});
      setSourceTourParticipantsById({});
      return;
    }

    let cancelled = false;

    void (async () => {
      const nextTourDetails: Record<string, CompetitionTourRow & { SAISON?: string; COCLEUNIK?: number; NOM?: string }> = {};
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

        const [detail, sourceParticipants] = await Promise.all([
          fetchCompetitionTourById(sourceTourId),
          fetchTourParticipants(sourceTourId),
        ]);

        if (cancelled) {
          return;
        }

        nextTourDetails[String(sourceTourId)] = {
          TUCLEUNIK: Number(detail.TUCLEUNIK ?? sourceTourId),
          COCLEUNIK: Number(detail.COCLEUNIK ?? 0),
          TDCLEUNIK: Number(detail.TDCLEUNIK ?? 0),
          TU_ORDRE: Number(detail.TU_ORDRE ?? 0),
          TOUR: String(detail.NOM ?? ''),
          TYPE_ID: Number(detail.TDTYPETOUR ?? 0),
          TYPE: Number(detail.TDTYPETOUR ?? 0) === 2 ? 'Eliminatoire' : 'Ligue',
          NOM: String(detail.NOM ?? ''),
        };

        nextTourParticipantsById[String(sourceTourId)] = sourceParticipants;

        const competitionKey = Number(detail.COCLEUNIK ?? 0);
        if (Number.isInteger(competitionKey) && competitionKey > 0) {
          competitionIds.add(competitionKey);
        }

        sourceParticipants.forEach((participant) => {
          const nestedSourceTourId = parsePaSource(participant.PASource)?.tourId;
          if (Number.isInteger(nestedSourceTourId) && Number(nestedSourceTourId) > 0 && !visitedTourIds.has(Number(nestedSourceTourId))) {
            pendingTourIds.push(Number(nestedSourceTourId));
          }
        });
      }

      const competitionEntries = await Promise.all(
        Array.from(competitionIds).map(async (competitionKey) => ({
          competitionKey,
          data: await fetchCompetitionById(competitionKey),
        })),
      );

      if (cancelled) {
        return;
      }

      const nextCompetitions: Record<string, CompetitionRow> = {};
      competitionEntries.forEach(({ competitionKey, data }) => {
        nextCompetitions[String(competitionKey)] = data;
      });

      setSourceTourDetailsById(nextTourDetails);
      setSourceCompetitionById(nextCompetitions);
      setSourceTourParticipantsById(nextTourParticipantsById);
    })().catch((error) => {
      if (!cancelled) {
        onError?.(toErrorMessage(error));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [onError, participants]);

  const getProgrammedParticipantLabel = (row: TourParticipantRow): string => {
    const clubName = String(row.CLUB ?? '').trim();
    if (clubName) {
      return clubName;
    }

    const source = String(row.PASource ?? '').trim();
    if (!source) {
      return '(Participant programme)';
    }

    const parsed = parsePaSource(source);
    if (!parsed) {
      return `Programme (${source})`;
    }

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

      const resolveNamesFromSource = (
        sourceValue: string,
        sourceVisited: Set<string>,
      ): string[] => {
        const normalizedSource = String(sourceValue ?? '').trim();
        if (!normalizedSource || sourceVisited.has(normalizedSource)) {
          return [];
        }

        sourceVisited.add(normalizedSource);

        const parsedSource = parsePaSource(normalizedSource);
        if (!parsedSource) {
          sourceVisited.delete(normalizedSource);
          return [];
        }

        const sourceRows = sourceTourParticipantsById[String(parsedSource.tourId)] ?? [];
        const candidates = sourceRows.filter((candidate) =>
          String(candidate.GROUPE ?? '').trim() === parsedSource.groupName
          && Number(candidate.PAClassement ?? 0) === parsedSource.rank,
        );

        const names = new Set<string>();
        candidates.forEach((candidate) => {
          const candidateClub = String(candidate.CLUB ?? '').trim();
          if (candidateClub) {
            names.add(candidateClub);
            return;
          }

          const candidateSource = String(candidate.PASource ?? '').trim();
          resolveNamesFromSource(candidateSource, sourceVisited).forEach((name) => names.add(name));
        });

        sourceVisited.delete(normalizedSource);
        return Array.from(names).sort((left, right) => left.localeCompare(right, 'fr', { sensitivity: 'base' }));
      };

      const duel = parseEliminatoireGroupPair(parsed.groupName);
      if (duel) {
        const sourceRows = sourceTourParticipantsById[String(parsed.tourId)] ?? [];
        const leftParticipant = sourceRows.find((candidate) => Number(candidate.PACLEUNIK) === duel.leftParticipantId);
        const rightParticipant = sourceRows.find((candidate) => Number(candidate.PACLEUNIK) === duel.rightParticipantId);

        const leftNames = leftParticipant
          ? (() => {
            const club = String(leftParticipant.CLUB ?? '').trim();
            if (club) {
              return [club];
            }
            return resolveNamesFromSource(String(leftParticipant.PASource ?? '').trim(), new Set<string>());
          })()
          : [];

        const rightNames = rightParticipant
          ? (() => {
            const club = String(rightParticipant.CLUB ?? '').trim();
            if (club) {
              return [club];
            }
            return resolveNamesFromSource(String(rightParticipant.PASource ?? '').trim(), new Set<string>());
          })()
          : [];

        const leftDisplay = leftNames.length > 0 ? leftNames.join('/') : `Participant ${duel.leftParticipantId}`;
        const rightDisplay = rightNames.length > 0 ? rightNames.join('/') : `Participant ${duel.rightParticipantId}`;
        return `${outcomeLabel} de ${leftDisplay} vs ${rightDisplay}`;
      }

      if (groupLabel) {
        return `${outcomeLabel} de ${groupLabel}`;
      }

      return outcomeLabel;
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
  };

  const reloadData = async () => {
    if (!Number.isInteger(tourId) || tourId <= 0) {
      setParticipants([]);
      setRencontres([]);
      setCircOptions([]);
      setPending(null);
      return;
    }

    setLoading(true);
    try {
      const [participantRows, rencontreRows, circRows] = await Promise.all([
        fetchTourParticipants(tourId),
        fetchTourRencontres(tourId),
        fetchCircByTourType(typeId),
      ]);

      setParticipants(participantRows);
      setRencontres(rencontreRows);
      setCircOptions(circRows);
      setSelectedRencontre([]);
    } catch (error) {
      onError?.(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reloadData();
  }, [tourId, typeId]);

  useEffect(() => {
    setSelectedParticipantId('');
    setParticipantSelection([]);
    setPending(null);
    setSelectedGroup('');
  }, [tourId]);

  useEffect(() => {
    if (!hasMultipleGroups) {
      setSelectedGroup('');
      return;
    }

    if (selectedGroup && !effectiveGroupNames.includes(selectedGroup)) {
      setSelectedGroup('');
    }
  }, [hasMultipleGroups, selectedGroup, effectiveGroupNames]);

  useEffect(() => {
    // A pending draft is tied to one circumstance; clear it when the selected circumstance changes.
    setSelectedParticipantId('');
    setParticipantSelection([]);
    setPending(null);
    setSelectedRencontre([]);
  }, [selectedCircId]);

  const participantById = useMemo(() => {
    const map = new Map<string, TourParticipantRow>();
    participants.forEach((row) => {
      const clubId = String(row.IDCLUB ?? '').trim();
      if (clubId) {
        map.set(clubId, row);
      }
    });
    return map;
  }, [participants]);

  const participantBySource = useMemo(() => {
    const map = new Map<string, TourParticipantRow>();
    participants.forEach((row) => {
      const source = String(row.PASource ?? '').trim();
      if (source) {
        map.set(source, row);
      }
    });
    return map;
  }, [participants]);

  const lockedParticipantKeys = useMemo(() => {
    const keys = new Set<string>();
    const selectedCirc = normalizeCircId(selectedCircId);
    rencontres.forEach((match) => {
      const matchCirc = normalizeCircId(match.IDCIRC);
      if (matchCirc !== selectedCirc) {
        return;
      }

      const dom = String(match.DOMICILE ?? '').trim();
      const ext = String(match.EXTERIEUR ?? '').trim();
      const domSource = String(match.PADOMSource ?? '').trim();
      const extSource = String(match.PAEXTSource ?? '').trim();
      if (dom) keys.add(`club:${dom}`);
      if (ext) keys.add(`club:${ext}`);
      if (domSource) keys.add(`src:${domSource}`);
      if (extSource) keys.add(`src:${extSource}`);
    });
    return keys;
  }, [rencontres, selectedCircId]);

  const availableClubRows = useMemo(() => {
    let rows = participants.filter((row) => !lockedParticipantKeys.has(getParticipantIdentityKey(row)));

    if (hasMultipleGroups) {
      if (!selectedGroup) {
        return [];
      }
      rows = rows.filter((row) => String(row.GROUPE ?? '').trim() === selectedGroup);
    }

    if (pending?.domicileParticipantId) {
      return rows.filter((row) => String(row.PACLEUNIK) !== pending.domicileParticipantId);
    }
    return rows;
  }, [participants, lockedParticipantKeys, pending, hasMultipleGroups, selectedGroup]);

  useEffect(() => {
    setSelectedParticipantId('');
    setParticipantSelection([]);
    setPending(null);
  }, [selectedGroup]);

  useEffect(() => {
    if (!selectedParticipantId) return;
    const exists = availableClubRows.some((row) => String(row.PACLEUNIK) === selectedParticipantId);
    if (!exists) {
      setSelectedParticipantId('');
      setParticipantSelection([]);
    }
  }, [availableClubRows, selectedParticipantId]);

  useEffect(() => {
    if (pendingAutoSelectIndex === null) {
      return;
    }

    if (availableClubRows.length === 0) {
      setSelectedParticipantId('');
      setParticipantSelection([]);
      setPendingAutoSelectIndex(null);
      return;
    }

    const maxIndex = availableClubRows.length - 1;
    const nextIndex = Math.min(Math.max(0, pendingAutoSelectIndex), maxIndex);
    const nextRow = availableClubRows[nextIndex];
    const nextId = String(nextRow.PACLEUNIK);

    setSelectedParticipantId(nextId);
    setParticipantSelection([nextId]);

    const focusTarget = participantsGridRef.current?.querySelector('[role="grid"]') as HTMLElement | null;
    focusTarget?.focus({ preventScroll: true });

    setPendingAutoSelectIndex(null);
  }, [availableClubRows, pendingAutoSelectIndex]);

  const rencontreRows = useMemo(
    () => [...rencontres].sort(compareDateHeure),
    [rencontres],
  );

  const filteredRencontreRows = useMemo(() => {
    const selectedCirc = normalizeCircId(selectedCircId);
    return rencontreRows.filter((row) => normalizeCircId(row.IDCIRC) === selectedCirc);
  }, [rencontreRows, selectedCircId]);

  const gridRows = useMemo<RencontresGridRow[]>(() => {
    const rows = filteredRencontreRows.map((match) => {
      const domicileClubId = String(match.DOMICILE ?? '').trim();
      const domicileSource = String(match.PADOMSource ?? '').trim();
      const domicileParticipant = domicileClubId
        ? participantById.get(domicileClubId)
        : (domicileSource ? participantBySource.get(domicileSource) : undefined);

      const exterieurClubId = String(match.EXTERIEUR ?? '').trim();
      const exterieurSource = String(match.PAEXTSource ?? '').trim();
      const exterieurParticipant = exterieurClubId
        ? participantById.get(exterieurClubId)
        : (exterieurSource ? participantBySource.get(exterieurSource) : undefined);

      return {
        ...match,
        DOMICILE_NOM: domicileParticipant
          ? getProgrammedParticipantLabel(domicileParticipant)
          : (domicileClubId || (domicileSource ? `Programme (${domicileSource})` : '')),
        EXTERIEUR_NOM: exterieurParticipant
          ? getProgrammedParticipantLabel(exterieurParticipant)
          : (exterieurClubId || (exterieurSource ? `Programme (${exterieurSource})` : '')),
      };
    });

    if (pending) {
      rows.push({
        RECLEUNIK: -1,
        DATE: pending.date,
        HEURE: pending.heure ?? '',
        DOMICILE: pending.domicile,
        EXTERIEUR: '',
        PADOMSource: pending.domicileSource,
        PAEXTSource: '',
        DOMICILE_NOM: pending.domicileLabel,
        EXTERIEUR_NOM: '',
      } as RencontresGridRow);
    }

    return rows;
  }, [filteredRencontreRows, pending, participantById, participantBySource]);

  const columns = useMemo<GridColDef<RencontresGridRow>[]>(
    () => [
      {
        field: 'DATE',
        headerName: 'Date',
        width: 96,
        minWidth: 96,
        maxWidth: 96,
        editable: true,
        valueFormatter: (value) => formatDateDisplay(value),
      },
      {
        field: 'HEURE',
        headerName: 'Heure',
        width: 74,
        minWidth: 74,
        maxWidth: 74,
        editable: true,
        valueFormatter: (value) => formatHeureDisplay(value),
      },
      {
        field: 'DOMICILE_NOM',
        headerName: 'Domicile',
        flex: 1,
        minWidth: 120,
        renderCell: (params) => {
          const source = String(params.row.PADOMSource ?? '').trim();
          return (
            <Typography variant="body2" sx={{ fontStyle: source ? 'italic' : 'normal' }}>
              {String(params.value ?? '')}
            </Typography>
          );
        },
      },
      {
        field: 'EXTERIEUR_NOM',
        headerName: 'Extérieur',
        flex: 1,
        minWidth: 120,
        renderCell: (params) => {
          const source = String(params.row.PAEXTSource ?? '').trim();
          return (
            <Typography variant="body2" sx={{ fontStyle: source ? 'italic' : 'normal' }}>
              {String(params.value ?? '')}
            </Typography>
          );
        },
      },
    ],
    [],
  );

  const persistRencontreRowUpdate = async (
    newRow: RencontresGridRow,
    oldRow: RencontresGridRow,
  ): Promise<RencontresGridRow> => {
    const id = Number(newRow.RECLEUNIK ?? 0);
    if (!Number.isInteger(id) || id <= 0) {
      return oldRow;
    }

    const nextDate = normalizeDate(parseDateInput(newRow.DATE));
    const rawHeure = String(newRow.HEURE ?? '').trim();
    const nextHeure = rawHeure ? normalizeHeure(rawHeure) : null;

    if (!nextDate) {
      throw new Error('Date invalide. Format attendu: DD/MM/YYYY.');
    }
    if (rawHeure && !nextHeure) {
      throw new Error('Heure invalide. Format attendu: HHhMM.');
    }

    const prevDate = normalizeDate(parseDateInput(oldRow.DATE));
    const prevHeure = normalizeHeure(oldRow.HEURE) || null;
    const updatedRow: RencontresGridRow = { ...newRow, DATE: nextDate, HEURE: nextHeure };

    if (nextDate === prevDate && nextHeure === prevHeure) {
      return updatedRow;
    }

    setSaving(true);
    try {
      await updateTourRencontre(id, { DATE: nextDate, HEURE: nextHeure });
      setRencontres((prev) =>
        prev.map((row) =>
          Number(row.RECLEUNIK) === id
            ? { ...row, DATE: nextDate, HEURE: nextHeure }
            : row,
        ),
      );
      return updatedRow;
    } catch (error) {
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const onRencontreRowUpdateError = (error: unknown) => {
    onError?.(toErrorMessage(error));
  };

  const clubColumns = useMemo<GridColDef<TourParticipantRow>[]>(
    () => [
      {
        field: 'participantLabel',
        headerName: 'Participant',
        flex: 1,
        valueGetter: (_value, row) => getProgrammedParticipantLabel(row),
      },
    ],
    [competitionId, competitionSeason, sourceCompetitionById, sourceTourDetailsById],
  );

  const commitSelectedClub = async (explicitParticipantId?: string) => {
    if (hasMultipleGroups && !selectedGroup) {
      onError?.('Sélectionnez un groupe.');
      return;
    }

    const participantId = String(explicitParticipantId ?? selectedParticipantId ?? '').trim();
    if (!participantId) {
      onError?.('Sélectionnez un participant.');
      return;
    }

    const participant = availableClubRows.find((row) => String(row.PACLEUNIK) === participantId);
    if (!participant) {
      onError?.('Participant introuvable.');
      return;
    }

    const clubId = String(participant.IDCLUB ?? '').trim();
    const paSource = String(participant.PASource ?? '').trim();
    const participantLabel = getProgrammedParticipantLabel(participant);

    if (!pending) {
      const lastMatch = filteredRencontreRows.length > 0
        ? filteredRencontreRows[filteredRencontreRows.length - 1]
        : undefined;
      const startDate = normalizeDate(lastMatch?.DATE ?? '') || normalizeDate(tourStartDate) || new Date().toISOString().slice(0, 10);
      const startHeure = normalizeHeure(lastMatch?.HEURE ?? '') || normalizeHeure(tourDefaultHeure) || null;
      setPending({
        date: startDate,
        heure: startHeure,
        domicileParticipantId: participantId,
        domicile: clubId,
        domicileSource: paSource,
        domicileLabel: participantLabel,
      });
      setSelectedParticipantId('');
      setParticipantSelection([]);
      return;
    }

    const sameIdentity = participantId === pending.domicileParticipantId
      || (clubId && clubId === pending.domicile)
      || (paSource && paSource === pending.domicileSource);
    if (sameIdentity) {
      onError?.('Le participant extérieur doit être différent du domicile.');
      return;
    }

    if (!pending.domicile && !pending.domicileSource) {
      onError?.('Participant domicile invalide.');
      return;
    }

    if (!clubId && !paSource) {
      onError?.('Participant extérieur invalide.');
      return;
    }

    const hasResolvedSides = Boolean(pending.domicile) && Boolean(clubId);

    const payload: CreateTourMatchPayload = {
      DATE: pending.date,
      HEURE: pending.heure,
      DOMICILE: pending.domicile,
      EXTERIEUR: clubId,
      BUTDOM: 0,
      BUTEXT: 0,
      TABDOM: 0,
      TABEXT: 0,
      ETAT: hasResolvedSides ? 1 : 5,
      TUCLEUNIK: tourId,
      SAISON: String(competitionSeason ?? '').trim(),
      READMIN: 0,
      COMMENT: '',
      VID_ID: null,
      IDCIRC: selectedCircId || '',
      PADOMSource: pending.domicileSource,
      PAEXTSource: paSource,
    };

    setSaving(true);
    try {
      await createTourRencontre(payload);
      setPending(null);
      setSelectedParticipantId('');
      setParticipantSelection([]);
      await reloadData();
    } catch (error) {
      onError?.(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleAddProgrammedParticipant = async () => {
    if (hasMultipleGroups && !selectedGroup) {
      onError?.('Sélectionnez un groupe du tour courant.');
      return;
    }

    const sourceTourId = Number(programTourId);
    const selectedRanks = Array.from(
      new Set(
        programSourceRanks
          .map((value) => Number(value))
          .filter((rank) => Number.isInteger(rank) && rank > 0),
      ),
    );
    if (!Number.isInteger(sourceTourId) || sourceTourId <= 0) {
      onError?.('Sélectionnez un tour source.');
      return;
    }

    if (selectedRanks.length === 0) {
      onError?.('Sélectionnez au moins un classement source.');
      return;
    }

    const sourceGroups = getDistinctSourceGroups(programSourceParticipants);
    const sourcesToCreate: string[] = [];
    sourceGroups.forEach((groupName) => {
      selectedRanks.forEach((rank) => {
        const existsForSource = programSourceParticipants.some(
          (row) => String(row.GROUPE ?? '').trim() === groupName
            && Number(row.PAClassement ?? 0) === rank,
        );

        if (existsForSource) {
          sourcesToCreate.push(`${sourceTourId},${groupName},${rank}`);
        }
      });
    });

    if (sourcesToCreate.length === 0) {
      onError?.('Aucun participant source pour ce classement.');
      return;
    }

    setSaving(true);
    try {
      for (const paSource of sourcesToCreate) {
        // Programmed participants are saved with empty club id and a source reference.
        await addTourParticipant(tourId, '', hasMultipleGroups ? selectedGroup : '', paSource);
      }
      setProgramDialogOpen(false);
      await reloadData();
    } catch (error) {
      onError?.(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const removeSelectedRencontre = async () => {
    const id = Number(selectedRencontre[0] ?? 0);

    // If the selected row is the in-progress draft line, just cancel it locally.
    if (id === -1) {
      setPending(null);
      setSelectedRencontre([]);
      return;
    }

    if (!Number.isInteger(id) || id <= 0) {
      onError?.('Sélectionnez une rencontre à supprimer.');
      return;
    }

    setSaving(true);
    try {
      await deleteTourRencontre(id);
      // Immediate local update so both clubs become selectable again without waiting.
      setRencontres((prev) => prev.filter((row) => Number(row.RECLEUNIK) !== id));
      setPending(null);
      setSelectedParticipantId('');
      setParticipantSelection([]);
      setSelectedRencontre([]);
      await reloadData();
    } catch (error) {
      onError?.(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const onClubGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.code !== 'Space' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    if (saving || loading || (hasMultipleGroups && !selectedGroup)) {
      return;
    }

    if (selectedParticipantId) {
      const currentIndex = availableClubRows.findIndex((row) => String(row.PACLEUNIK) === selectedParticipantId);
      if (currentIndex >= 0) {
        setPendingAutoSelectIndex(currentIndex);
      }
    }

    void commitSelectedClub();
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Rencontres</Typography>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.25}>
        {hasMultipleGroups ? (
          <FormControl size="small" sx={{ width: { xs: '100%', lg: 320 } }}>
            <InputLabel id="groupe-select-label">Nom du Groupe</InputLabel>
            <Select
              labelId="groupe-select-label"
              label="Nom du Groupe"
              value={selectedGroup}
              onChange={(event) => setSelectedGroup(String(event.target.value ?? ''))}
            >
              <MenuItem value="">(Aucun)</MenuItem>
              {effectiveGroupNames.map((groupName) => (
                <MenuItem key={groupName} value={groupName}>{groupName}</MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}

        <FormControl fullWidth size="small">
          <InputLabel id="circ-select-label">Nom de la Manche</InputLabel>
          <Select
            labelId="circ-select-label"
            label="Nom de la Manche"
            value={selectedCircId}
            onChange={(event) => setSelectedCircId(String(event.target.value ?? ''))}
          >
            <MenuItem value="">(Aucune)</MenuItem>
            {circOptions.map((circ) => (
              <MenuItem key={circ.IDCIRC} value={circ.IDCIRC}>{circ.CIRC}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ minHeight: 0 }}>
        <Box sx={{ width: { xs: '100%', md: 300 }, minWidth: 0 }}>
          <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 600 }}>
            Participants
          </Typography>
          <Box
            ref={participantsGridRef}
            sx={{ height: 286, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            onKeyDownCapture={onClubGridKeyDown}
          >
            <EntityDataGrid<TourParticipantRow>
              rows={availableClubRows}
              columns={clubColumns}
              loading={loading}
              getRowId={(row) => row.PACLEUNIK}
              selection={participantSelection}
              onRowDoubleClick={(rowId) => {
                const id = String(rowId ?? '').trim();
                if (!id || saving || loading || (hasMultipleGroups && !selectedGroup)) {
                  return;
                }
                setSelectedParticipantId(id);
                setParticipantSelection([id]);
                void commitSelectedClub(id);
              }}
              onSelectionChange={(selection) => {
                const id = selection.length > 0 ? String(selection[0]) : '';
                setParticipantSelection(id ? [id] : []);
                setSelectedParticipantId(id);
              }}
            />
          </Box>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} sx={{ mb: 0.75 }}>
            <Tooltip title="Ajouter">
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddCircleOutlineRoundedIcon />}
                sx={{ minWidth: 0, px: 1.1 }}
                onClick={() => void commitSelectedClub()}
                disabled={saving || loading || (hasMultipleGroups && !selectedGroup)}
              >
                Ajouter
              </Button>
            </Tooltip>
            <Tooltip title="Ajouter un participant programme">
              <Button
                size="small"
                variant="outlined"
                sx={{ minWidth: 0, px: 1.1 }}
                onClick={() => setProgramDialogOpen(true)}
                disabled={saving || loading || (hasMultipleGroups && !selectedGroup)}
              >
                Ajouter un participant programme
              </Button>
            </Tooltip>
            <Tooltip title="Supprimer">
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<DeleteOutlineRoundedIcon />}
                sx={{ minWidth: 0, px: 1.1 }}
                onClick={() => void removeSelectedRencontre()}
                disabled={saving || loading}
              >
                Supprimer
              </Button>
            </Tooltip>
          </Stack>

          <Box sx={{ height: 286, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <EntityDataGrid<RencontresGridRow>
              rows={gridRows}
              columns={columns}
              loading={loading}
              getRowId={(row) => row.RECLEUNIK}
              selection={selectedRencontre}
              onSelectionChange={setSelectedRencontre}
              disableRowSelectionOnClick
              editMode="cell"
              processRowUpdate={persistRencontreRowUpdate}
              onProcessRowUpdateError={onRencontreRowUpdateError}
              isCellEditable={(params) => Number(params.row.RECLEUNIK) > 0 && (params.field === 'DATE' || params.field === 'HEURE')}
            />
          </Box>
        </Box>
      </Stack>

      <Dialog
        open={programDialogOpen}
        onClose={() => {
          if (saving) {
            return;
          }
          setProgramDialogOpen(false);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Ajouter un participant programme</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <InputLabel id="program-season-label">Saison</InputLabel>
                <Select
                  labelId="program-season-label"
                  label="Saison"
                  value={programSeason}
                  onChange={(event) => setProgramSeason(String(event.target.value ?? ''))}
                >
                  {seasonOptions.map((season) => (
                    <MenuItem key={season} value={season}>{season}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="program-competition-label">Competition</InputLabel>
                <Select
                  labelId="program-competition-label"
                  label="Competition"
                  value={programCompetitionId}
                  onChange={(event) => setProgramCompetitionId(String(event.target.value ?? ''))}
                >
                  {programCompetitions.map((competition) => {
                    const id = String(competition.COCLEUNIK ?? '').trim();
                    const name = String(competition.NOM ?? '').trim();
                    const season = String(competition.SAISON ?? '').trim();
                    const label = [name, season].filter(Boolean).join(' ');
                    return <MenuItem key={id} value={id}>{label || id}</MenuItem>;
                  })}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="program-tour-label">Tour</InputLabel>
                <Select
                  labelId="program-tour-label"
                  label="Tour"
                  value={programTourId}
                  onChange={(event) => setProgramTourId(String(event.target.value ?? ''))}
                >
                  <MenuItem value="">(Aucun)</MenuItem>
                  {programTours.map((tour) => (
                    <MenuItem key={tour.TUCLEUNIK} value={String(tour.TUCLEUNIK)}>
                      {String(tour.TOUR ?? '').trim() || `Tour ${tour.TUCLEUNIK}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="program-rank-label">Classement</InputLabel>
                <Select
                  labelId="program-rank-label"
                  label="Classement"
                  multiple
                  value={programSourceRanks}
                  onChange={(event) => {
                    const value = event.target.value;
                    setProgramSourceRanks(
                      Array.isArray(value)
                        ? value.map((entry) => String(entry))
                        : String(value ?? '').split(',').map((entry) => entry.trim()).filter((entry) => entry.length > 0),
                    );
                  }}
                  renderValue={(selected) => {
                    const selectedValues = Array.isArray(selected)
                      ? selected.map((entry) => String(entry))
                      : String(selected ?? '').split(',').map((entry) => entry.trim()).filter((entry) => entry.length > 0);

                    return sourceRankSelectOptions
                      .filter((option) => selectedValues.includes(option.value))
                      .map((option) => option.label)
                      .join(' / ');
                  }}
                >
                  {sourceRankSelectOptions.map((option) => (
                    <MenuItem key={`rank-${option.value}`} value={option.value}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">Clubs possibles par groupe</Typography>
              {possibleProgrammedClubsByGroup.length > 0 ? possibleProgrammedClubsByGroup.map((entry) => (
                <Typography key={`possible-${entry.group || '__empty__'}`} variant="caption" color="text.secondary">
                  {entry.group || '(Aucun groupe)'}: {entry.clubs.length > 0 ? entry.clubs.join(' / ') : '-'}
                </Typography>
              )) : (
                <Typography variant="caption" color="text.secondary">Indetermine pour l instant</Typography>
              )}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setProgramDialogOpen(false)}
            disabled={saving}
            color="inherit"
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleAddProgrammedParticipant()}
            disabled={saving || loading}
          >
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
