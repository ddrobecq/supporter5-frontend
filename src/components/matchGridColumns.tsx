import { type ReactNode } from 'react';
import { type GridColDef, type GridRowId } from '@mui/x-data-grid';
import { Box, Typography } from '@mui/material';
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

interface EditableStatusColumnConfig<R extends MatchGridBaseRow> {
  mode?: 'editable';
  editingRowId: GridRowId | null;
  draftValue: number;
  onStartEdit: (row: R) => void;
  onDraftChange: (row: R, nextValue: number) => void;
  onCommit: (row: R, nextValue?: number) => Promise<unknown> | void;
  onCancel: (row: R) => void;
  onTabOut?: (row: R, direction: 'next' | 'prev') => void;
  sortable?: boolean;
}

interface ReadonlyStatusColumnConfig {
  mode: 'readonly';
  sortable?: boolean;
}

type StatusColumnConfig<R extends MatchGridBaseRow> = EditableStatusColumnConfig<R> | ReadonlyStatusColumnConfig;

interface EditableHeureColumnConfig<R extends MatchGridBaseRow> {
  mode?: 'editable';
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

interface ReadonlyHeureColumnConfig {
  mode: 'readonly';
  sortable?: boolean;
}

type HeureColumnConfig<R extends MatchGridBaseRow> = EditableHeureColumnConfig<R> | ReadonlyHeureColumnConfig;

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

function formatReadonlyScore(row: MatchGridBaseRow): string {
  const status = Number(row.ETAT);
  if (status === 1 || status === 5) {
    return '-vs-';
  }
  if (status === 4) {
    return '';
  }
  return `${row.BUTDOM}-${row.BUTEXT}`;
}

function getStatusLabel(value: number): string {
  return ({ 1: 'En attente', 2: 'En cours', 3: 'Terminée', 4: 'Non jouée', 5: 'Programmée' } as Record<number, string>)[value] ?? `Etat ${value}`;
}

function ReadonlyScoreCell({ row, value }: { row: MatchGridBaseRow; value: string }) {
  const tabDom = Number(row.TABDOM ?? 0);
  const tabExt = Number(row.TABEXT ?? 0);

  return (
    <Box sx={{ width: '100%', textAlign: 'center', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      {tabDom > 0 ? <Typography component="sup" sx={{ fontSize: 9, mr: 0.3 }}>{tabDom}</Typography> : null}
      {value}
      {tabExt > 0 ? <Typography component="sup" sx={{ fontSize: 9, ml: 0.3 }}>{tabExt}</Typography> : null}
    </Box>
  );
}

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
    onClubClick?: (clubId: string, clubName: string) => void;
    isDomicileWinner?: (row: R) => boolean;
    isExterieurWinner?: (row: R) => boolean;
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
        if (options.status!.mode === 'readonly') {
          return getStatusLabel(Number(row.ETAT));
        }
        const editableStatus = options.status as EditableStatusColumnConfig<R>;
        return (
          <StatusCell
            value={Number(row.ETAT)}
            isEditing={String(editableStatus.editingRowId) === String(row.RECLEUNIK)}
            draftValue={editableStatus.draftValue}
            onStartEdit={() => editableStatus.onStartEdit(row)}
            onDraftChange={(nextValue) => editableStatus.onDraftChange(row, nextValue)}
            onCommit={(nextValue) => editableStatus.onCommit(row, nextValue)}
            onCancel={() => editableStatus.onCancel(row)}
            onTabOut={(direction) => editableStatus.onTabOut?.(row, direction)}
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
        if (options.heure!.mode === 'readonly') {
          return <Box sx={{ width: '100%', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{String(row.HEURE ?? '').replace(/^(\d{2})(\d{2})$/, '$1:$2')}</Box>;
        }
        const editableHeure = options.heure as EditableHeureColumnConfig<R>;
        return (
          <HeureCell
            value={row.HEURE}
            isEditing={String(editableHeure.editingRowId) === String(row.RECLEUNIK)}
            draftDigits={editableHeure.draftDigits}
            onStartEdit={() => editableHeure.onStartEdit(row)}
            onDraftChange={(digits) => editableHeure.onDraftChange(row, digits)}
            onCommit={() => editableHeure.onCommit(row)}
            onCancel={() => editableHeure.onCancel(row)}
            onMoveVertical={(direction) => editableHeure.onMoveVertical(row, direction)}
            onTabOut={(direction) => editableHeure.onTabOut?.(row, direction)}
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
        bold={options.isDomicileWinner?.(params.row) ?? false}
        onClick={String(params.row.DOMICILE ?? '').trim() ? () => options.onClubClick?.(String(params.row.DOMICILE), String(params.row.DOMICILE_NOM ?? '')) : undefined}
      />
    ),
  });

  columns.push({
    field: 'SCORE',
    headerName: 'Score',
    width: 100,
    minWidth: 100,
    maxWidth: 100,
    align: 'center',
    headerAlign: 'center',
    sortable: options.score.mode === 'readonly' ? (options.score.sortable ?? false) : false,
    valueGetter: (_value, row) => {
      if (options.score.mode === 'readonly') {
        return options.score.valueGetter ? options.score.valueGetter(row) : formatReadonlyScore(row);
      }
      return `${row.BUTDOM}-${row.BUTEXT}`;
    },
    renderCell: (params) => {
      const row = params.row;
      if (options.score.mode === 'readonly') {
        const value = options.score.valueGetter ? options.score.valueGetter(row) : formatReadonlyScore(row);
        return <ReadonlyScoreCell row={row} value={value} />;
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
        bold={options.isExterieurWinner?.(params.row) ?? false}
        onClick={String(params.row.EXTERIEUR ?? '').trim() ? () => options.onClubClick?.(String(params.row.EXTERIEUR), String(params.row.EXTERIEUR_NOM ?? '')) : undefined}
      />
    ),
  });

  return columns;
}
