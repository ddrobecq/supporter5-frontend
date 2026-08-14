import { type GridColDef, type GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { ClubCell } from '../../components/ClubCell';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import type { TourParticipantRow } from './types';

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
    ],
    [getLabel, headerLabel],
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
