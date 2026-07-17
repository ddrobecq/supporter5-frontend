import { DataGrid, type GridColDef, type GridRowId } from '@mui/x-data-grid';
import type { VilleRow } from './types';

interface VilleDataGridProps {
  rows: VilleRow[];
  columns: GridColDef[];
  loading: boolean;
  primaryKey?: string;
  onRowClick: (rowId: GridRowId) => void;
  onRowDoubleClick?: (rowId: GridRowId) => void;
  getRowId: (row: VilleRow) => GridRowId;
  density?: 'comfortable' | 'standard' | 'compact';
  pageSizeOptions?: number[];
}

export function VilleDataGrid({
  rows,
  columns,
  loading,
  onRowClick,
  onRowDoubleClick,
  getRowId,
  density = 'compact',
  pageSizeOptions = [25, 50, 100],
}: VilleDataGridProps) {
  return (
    <DataGrid
      rows={rows}
      columns={columns}
      loading={loading}
      getRowId={getRowId}
      pageSizeOptions={pageSizeOptions}
      onRowClick={(params) => onRowClick(params.id)}
      onRowDoubleClick={(params) => onRowDoubleClick?.(params.id)}
      density={density}
      disableColumnMenu
      sx={{ '& .MuiDataGrid-cell': { cursor: 'default' } }}
    />
  );
}
