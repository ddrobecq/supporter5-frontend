import type { TourParticipantRow } from './types';

export interface SourceRankSelectOption {
  value: string;
  label: string;
}

export interface ProgrammedClubGroup {
  group: string;
  clubs: string[];
}

export function getParticipantLabel(row: TourParticipantRow): string {
  const clubName = String(row.CLUB ?? '').trim();
  if (clubName) return clubName;
  const source = String(row.PASource ?? '').trim();
  return source ? `Programme (${source})` : '(Participant programme)';
}

export function getDistinctSourceGroups(rows: TourParticipantRow[]): string[] {
  return Array.from(new Set(rows.map((row) => String(row.GROUPE ?? '').trim())))
    .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

export function getDistinctRanks(rows: TourParticipantRow[]): number[] {
  const values = rows
    .map((row) => Number(row.PAClassement ?? 0))
    .filter((rank) => Number.isInteger(rank) && rank > 0);
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

export function buildSourceRankSelectOptions(
  isSelectedProgramTourEliminatoire: boolean,
  sourceRankOptions: number[],
): SourceRankSelectOption[] {
  return isSelectedProgramTourEliminatoire
    ? [{ value: '1', label: 'Vainqueur' }, { value: '2', label: 'Perdant' }]
    : sourceRankOptions.map((rank) => ({ value: String(rank), label: String(rank) }));
}

export function buildPossibleProgrammedClubsByGroup(
  programSourceParticipants: TourParticipantRow[],
  selectedRanks: number[],
): ProgrammedClubGroup[] {
  if (selectedRanks.length === 0) {
    return [];
  }

  const sourceGroups = getDistinctSourceGroups(programSourceParticipants);
  const grouped = new Map<string, string[]>();

  sourceGroups.forEach((groupName) => {
    const rowsForSelectedRanks = programSourceParticipants.filter(
      (row) => String(row.GROUPE ?? '').trim() === groupName && selectedRanks.includes(Number(row.PAClassement ?? 0)),
    );

    // If no participant currently matches the requested rank, all participants of the source group remain potential candidates.
    const rowsForDisplay = rowsForSelectedRanks.length > 0
      ? rowsForSelectedRanks
      : programSourceParticipants.filter((row) => String(row.GROUPE ?? '').trim() === groupName);

    const labels = Array.from(
      new Set(
        rowsForDisplay
          .map((row) => getParticipantLabel(row))
          .map((label) => String(label ?? '').trim())
          .filter(Boolean),
      ),
    );

    grouped.set(groupName, labels);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }))
    .map(([group, clubs]) => ({ group, clubs }));
}
