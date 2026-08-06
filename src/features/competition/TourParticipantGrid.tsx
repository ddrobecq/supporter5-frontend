import { Box } from '@mui/material';
import { type GridColDef, type GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
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
          const isUnresolved =
            !String(params.row.IDCLUB ?? '').trim() &&
            Boolean(String(params.row.PASource ?? '').trim());
          return (
            <Box
              sx={{
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontStyle: isUnresolved ? 'italic' : 'normal',
              }}
            >
              {String(params.value ?? '')}
            </Box>
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
