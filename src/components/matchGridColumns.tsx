import { type ReactNode } from 'react';
import { type GridColDef, type GridRowId } from '@mui/x-data-grid';
import { Box } from '@mui/material';
import { ClubCell } from './ClubCell';
import type { ScoreDraft } from '../features/calendrier/ScoreCell';
import { ScoreCell } from '../features/calendrier/ScoreCell';
import { StatusCell } from '../features/calendrier/StatusCell';
import { HeureCell } from '../features/calendrier/HeureCell';
import type { CalendrierRow } from '../features/calendrier/types';

export interface MatchGridBaseRow {
  RECLEUNIK: string | number;
  ETAT: number;
  HEURE?: unknown;
  DATE?: string;
  CIRC?: string | null;
  CIRC_COMPLET?: string | null;
  DOMICILE?: string;
  EXTERIEUR?: string;
  DOMICILE_NOM?: string;
  EXTERIEUR_NOM?: string;
  PADOMSource?: string | null;
  PAEXTSource?: string | null;
  BUTDOM: number;
  BUTEXT: number;
  TABDOM: number;
  TABEXT: number;
}

interface StatusColumnConfig<R extends MatchGridBaseRow> {
  editingRowId: GridRowId | null;
  draftValue: number;
  onStartEdit: (row: R) => void;
  onDraftChange: (row: R, nextValue: number) => void;
  onCommit: (row: R, nextValue?: number) => Promise<unknown> | void;
  onCancel: (row: R) => void;
  onTabOut?: (row: R, direction: 'next' | 'prev') => void;
  sortable?: boolean;
}

interface HeureColumnConfig<R extends MatchGridBaseRow> {
  editingRowId: GridRowId | null;
  draftDigits: string;
  onStartEdit: (row: R) => void;
  onDraftChange: (row: R, nextDigits: string) => void;
  onCommit: (row: R) => Promise<unknown> | void;
  onCancel: (row: R) => void;
  onMoveVertical: (row: R, direction: 'up' | 'down') => Promise<unknown> | void;
  onTabOut?: (row: R, direction: 'next' | 'prev') => void;
  sortable?: boolean;
}

interface EditableScoreColumnConfig<R extends MatchGridBaseRow> {
  mode?: 'editable';
  editingRowId: GridRowId | null;
  draft: ScoreDraft;
  canEdit: (row: R) => boolean;
  onStartEdit: (row: R) => void;
  onDraftChange: (row: R, patch: Partial<ScoreDraft>) => void;
  onUserInput: (row: R) => void;
  onCommit: (row: R) => Promise<unknown> | void;
  onCancel: (row: R) => void;
  onMoveVertical: (row: R, direction: 'up' | 'down') => Promise<unknown> | void;
  onTabOut?: (row: R, direction: 'next' | 'prev') => void;
}

interface ReadonlyScoreColumnConfig {
  mode: 'readonly';
  sortable?: boolean;
  valueGetter?: (row: MatchGridBaseRow) => string;
}

type ScoreColumnConfig<R extends MatchGridBaseRow> = EditableScoreColumnConfig<R> | ReadonlyScoreColumnConfig;

interface CircColumnConfig {
  enabled: boolean;
  width?: number;
  sortable?: boolean;
  field?: 'CIRC' | 'CIRC_COMPLET';
  headerName?: string;
}

export function buildMatchGridColumns<R extends MatchGridBaseRow>(
  options: {
    status?: StatusColumnConfig<R>;
    heure?: HeureColumnConfig<R>;
    score: ScoreColumnConfig<R>;
    date?: { enabled: boolean; width?: number; sortable?: boolean; renderCell: (row: R) => ReactNode };
    circ?: CircColumnConfig;
    domicileHeaderName?: string;
    exterieurHeaderName?: string;
  },
): GridColDef<R>[] {
  const columns: GridColDef<R>[] = [];

  if (options.status) {
    columns.push({
      field: 'ETAT',
      headerName: 'Statut',
      width: 90,
      minWidth: 90,
      maxWidth: 90,
      sortable: options.status.sortable ?? true,
      renderCell: (params) => {
        const row = params.row;
        return (
          <StatusCell
            value={Number(row.ETAT)}
            isEditing={String(options.status!.editingRowId) === String(row.RECLEUNIK)}
            draftValue={options.status!.draftValue}
            onStartEdit={() => options.status!.onStartEdit(row)}
            onDraftChange={(nextValue) => options.status!.onDraftChange(row, nextValue)}
            onCommit={(nextValue) => options.status!.onCommit(row, nextValue)}
            onCancel={() => options.status!.onCancel(row)}
            onTabOut={(direction) => options.status!.onTabOut?.(row, direction)}
          />
        );
      },
    });
  }

  if (options.date?.enabled) {
    const width = options.date.width ?? 110;
    columns.push({
      field: 'DATE',
      headerName: 'Date',
      width,
      minWidth: width,
      maxWidth: width,
      sortable: options.date.sortable ?? false,
      renderCell: (params) => options.date!.renderCell(params.row),
    });
  }

  if (options.heure) {
    columns.push({
      field: 'HEURE',
      headerName: 'Heure',
      width: 70,
      minWidth: 70,
      maxWidth: 70,
      align: 'center',
      headerAlign: 'center',
      sortable: options.heure.sortable ?? true,
      renderCell: (params) => {
        const row = params.row;
        return (
          <HeureCell
            value={row.HEURE}
            isEditing={String(options.heure!.editingRowId) === String(row.RECLEUNIK)}
            draftDigits={options.heure!.draftDigits}
            onStartEdit={() => options.heure!.onStartEdit(row)}
            onDraftChange={(digits) => options.heure!.onDraftChange(row, digits)}
            onCommit={() => options.heure!.onCommit(row)}
            onCancel={() => options.heure!.onCancel(row)}
            onMoveVertical={(direction) => options.heure!.onMoveVertical(row, direction)}
            onTabOut={(direction) => options.heure!.onTabOut?.(row, direction)}
          />
        );
      },
    });
  }

  if (options.circ?.enabled) {
    const width = options.circ.width ?? 118;
    const field = options.circ.field ?? 'CIRC';
    columns.push({
      field,
      headerName: options.circ.headerName ?? 'Circonstance',
      width,
      minWidth: width,
      maxWidth: width,
      sortable: options.circ.sortable ?? false,
    });
  }

  columns.push({
    field: 'DOMICILE_NOM',
    headerName: options.domicileHeaderName ?? 'Domicile',
    headerAlign: 'right',
    minWidth: 120,
    flex: 1,
    resizable: false,
    sortable: true,
    renderCell: (params) => (
      <ClubCell
        clubId={String(params.row.DOMICILE ?? '')}
        clubName={String(params.row.DOMICILE_NOM ?? '')}
        alignRight
        italic={
          String(params.row.PADOMSource ?? '').trim().length > 0
          && String(params.row.DOMICILE ?? '').trim().length === 0
        }
      />
    ),
  });

  columns.push({
    field: 'SCORE',
    headerName: 'Score',
    width: 72,
    minWidth: 72,
    maxWidth: 72,
    align: 'center',
    headerAlign: 'center',
    sortable: options.score.mode === 'readonly' ? (options.score.sortable ?? false) : false,
    valueGetter: (_value, row) => {
      if (options.score.mode === 'readonly') {
        return options.score.valueGetter ? options.score.valueGetter(row) : `${row.BUTDOM}-${row.BUTEXT}`;
      }
      return `${row.BUTDOM}-${row.BUTEXT}`;
    },
    renderCell: (params) => {
      const row = params.row;
      if (options.score.mode === 'readonly') {
        const value = options.score.valueGetter ? options.score.valueGetter(row) : `${row.BUTDOM}-${row.BUTEXT}`;
        return (
          <Box sx={{ width: '100%', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </Box>
        );
      }
      const editableScore = options.score as EditableScoreColumnConfig<R>;
      return (
        <ScoreCell
          row={row as unknown as CalendrierRow}
          isEditing={String(editableScore.editingRowId) === String(row.RECLEUNIK)}
          canEdit={editableScore.canEdit(row)}
          draft={editableScore.draft}
          onStartEdit={() => editableScore.onStartEdit(row)}
          onDraftChange={(patch) => editableScore.onDraftChange(row, patch)}
          onUserInput={() => editableScore.onUserInput(row)}
          onCommit={() => editableScore.onCommit(row)}
          onCancel={() => editableScore.onCancel(row)}
          onMoveVertical={(direction) => editableScore.onMoveVertical(row, direction)}
          onTabOut={(direction) => editableScore.onTabOut?.(row, direction)}
        />
      );
    },
  });

  columns.push({
    field: 'EXTERIEUR_NOM',
    headerName: options.exterieurHeaderName ?? 'Exterieur',
    minWidth: 120,
    flex: 1,
    resizable: false,
    sortable: true,
    renderCell: (params) => (
      <ClubCell
        clubId={String(params.row.EXTERIEUR ?? '')}
        clubName={String(params.row.EXTERIEUR_NOM ?? '')}
        italic={
          String(params.row.PAEXTSource ?? '').trim().length > 0
          && String(params.row.EXTERIEUR ?? '').trim().length === 0
        }
      />
    ),
  });

  return columns;
}
