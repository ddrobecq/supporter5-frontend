import { type GridColDef, type GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { ClubCell } from '../../components/ClubCell';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { TourParticipantMalusCell } from './TourParticipantMalusCell';
import type { TourParticipantRow } from './types';

/** "Malus" column (Ligue tours). Keep the object memoized: it rebuilds the column definitions. */
export interface TourParticipantMalusColumn {
  /** Sum of the participant's malus points (0 = none). */
  getTotal: (row: TourParticipantRow) => number;
  onOpenList: (row: TourParticipantRow) => void;
  onAdd: (row: TourParticipantRow) => void;
  onClearAll: (row: TourParticipantRow) => void;
}

interface TourParticipantGridProps {
  rows: TourParticipantRow[];
  loading?: boolean;
  selection: GridRowId[];
  onSelectionChange: (selection: GridRowId[]) => void;
  getLabel: (row: TourParticipantRow) => string;
  headerLabel?: string;
  onRowClick?: (rowId: GridRowId) => void;
  onRowDoubleClick?: (rowId: GridRowId) => void;
  disableRowSelectionOnClick?: boolean;
  multiSelection?: boolean;
  checkboxSelection?: boolean;
  hideCheckboxSelectionColumn?: boolean;
  /** Adds the "Malus" column; absent by default. */
  malusColumn?: TourParticipantMalusColumn;
}

export function TourParticipantGrid({
  rows,
  loading = false,
  selection,
  onSelectionChange,
  getLabel,
  headerLabel = 'Participant',
  onRowClick,
  onRowDoubleClick,
  disableRowSelectionOnClick,
  multiSelection,
  checkboxSelection,
  hideCheckboxSelectionColumn,
  malusColumn,
}: TourParticipantGridProps) {
  const columns = useMemo<GridColDef<TourParticipantRow>[]>(
    () => [
      {
        field: 'participantLabel',
        headerName: headerLabel,
        flex: 1,
        minWidth: 220,
        valueGetter: (_value, row) => getLabel(row),
        renderCell: (params) => {
          const clubId = String(params.row.IDCLUB ?? '').trim();
          const isUnresolved =
            !clubId &&
            Boolean(String(params.row.PASource ?? '').trim());
          return (
            <ClubCell
              clubId={clubId}
              clubName={String(params.value ?? '')}
              italic={isUnresolved}
            />
          );
        },
      },
      ...(malusColumn ? [{
        field: 'malusTotal',
        headerName: 'Malus',
        width: 140,
        sortable: false,
        valueGetter: (_value, row) => malusColumn.getTotal(row),
        renderCell: (params) => (
          <TourParticipantMalusCell
            total={Number(params.value) || 0}
            clubLabel={getLabel(params.row)}
            hasFocus={params.hasFocus}
            tabIndex={params.tabIndex}
            onOpenList={() => malusColumn.onOpenList(params.row)}
            onAdd={() => malusColumn.onAdd(params.row)}
            onClearAll={() => malusColumn.onClearAll(params.row)}
          />
        ),
      } satisfies GridColDef<TourParticipantRow>] : []),
    ],
    [getLabel, headerLabel, malusColumn],
  );

  return (
    <EntityDataGrid<TourParticipantRow>
      rows={rows}
      columns={columns}
      loading={loading}
      getRowId={(row) => row.PACLEUNIK}
      selection={selection}
      onSelectionChange={onSelectionChange}
      onRowClick={onRowClick}
      onRowDoubleClick={onRowDoubleClick}
      disableRowSelectionOnClick={disableRowSelectionOnClick}
      multiSelection={multiSelection}
      checkboxSelection={checkboxSelection}
      hideCheckboxSelectionColumn={hideCheckboxSelectionColumn}
    />
  );
}
