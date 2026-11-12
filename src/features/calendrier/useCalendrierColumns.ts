import { useMemo } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { buildMatchGridColumns } from '../../components/matchGridColumns';
import { canEditScore } from '../../lib/matchStatus';
import type { CalendrierRowEditing } from './useCalendrierRowEditing';
import type { CalendrierRow } from './types';

export interface CalendrierColumnsOptions {
  readOnly: boolean;
  editing: CalendrierRowEditing;
  isEliminatoryMatchWinner: (row: CalendrierRow, side: 'domicile' | 'exterieur') => boolean;
  openClub: (clubId: string, clubName: string) => void;
}

/** Calendar grid columns: editable status / time / score in admin mode, read-only in public mode. */
export function useCalendrierColumns({
  readOnly,
  editing,
  isEliminatoryMatchWinner,
  openClub,
}: CalendrierColumnsOptions): GridColDef<CalendrierRow>[] {
  const {
    editingStatusRowId,
    statusDraft,
    editingHeureRowId,
    heureDraftDigits,
    editingScoreRowId,
    scoreDraft,
    handlers: gridHandlers,
  } = editing;

  return useMemo<GridColDef<CalendrierRow>[]>(() => buildMatchGridColumns({
    status: readOnly ? { mode: 'readonly' } : {
      editingRowId: editingStatusRowId,
      draftValue: statusDraft,
      onStartEdit: gridHandlers.startStatusEdit,
      onDraftChange: (row, nextValue) => gridHandlers.updateStatusDraft(row.RECLEUNIK, nextValue),
      onCommit: gridHandlers.commitStatusEdit,
      onCancel: gridHandlers.cancelStatusEdit,
      onTabOut: gridHandlers.handleStatusTabOut,
      sortable: true,
    },
    heure: readOnly ? { mode: 'readonly' } : {
      editingRowId: editingHeureRowId,
      draftDigits: heureDraftDigits,
      onStartEdit: gridHandlers.startHeureEdit,
      onDraftChange: (row, digits) => gridHandlers.updateHeureDraft(row.RECLEUNIK, digits),
      onCommit: gridHandlers.commitHeureEdit,
      onCancel: gridHandlers.cancelHeureEdit,
      onMoveVertical: gridHandlers.moveHeureEditToAdjacentRow,
      onTabOut: gridHandlers.handleHeureTabOut,
      sortable: true,
    },
    score: readOnly ? { mode: 'readonly' } : {
      editingRowId: editingScoreRowId,
      draft: scoreDraft,
      canEdit: (row) => canEditScore(Number(row.ETAT)),
      onStartEdit: gridHandlers.startScoreEdit,
      onDraftChange: (row, patch) => gridHandlers.updateScoreDraft(row.RECLEUNIK, patch),
      onUserInput: (row) => gridHandlers.setRowModifiedFlag(row.RECLEUNIK, true),
      onCommit: gridHandlers.commitScoreEdit,
      onCancel: gridHandlers.cancelScoreEdit,
      onMoveVertical: gridHandlers.moveScoreEditToAdjacentRow,
      onTabOut: gridHandlers.handleScoreTabOut,
    },
    isDomicileWinner: (row) => isEliminatoryMatchWinner(row, 'domicile'),
    isExterieurWinner: (row) => isEliminatoryMatchWinner(row, 'exterieur'),
    onClubClick: openClub,
  }), [editingHeureRowId, editingScoreRowId, editingStatusRowId, gridHandlers, heureDraftDigits, isEliminatoryMatchWinner, openClub, readOnly, scoreDraft, statusDraft]);
}
