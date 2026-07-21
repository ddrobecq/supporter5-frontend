import { DataGrid, type GridColDef, type GridRowClassNameParams, type GridRowId, type GridValidRowModel } from '@mui/x-data-grid';

interface EntityDataGridProps<RowModel extends GridValidRowModel> {
  rows: RowModel[];
  columns: GridColDef<RowModel>[];
  loading: boolean;
  getRowId: (row: RowModel) => GridRowId;
  selection: GridRowId[];
  onSelectionChange: (selection: GridRowId[]) => void;
  onRowDoubleClick?: (rowId: GridRowId) => void;
  onRowClick?: (rowId: GridRowId) => void;
  disableRowSelectionOnClick?: boolean;
  pageSizeOptions?: number[];
  density?: 'comfortable' | 'standard' | 'compact';
  getRowClassName?: (params: GridRowClassNameParams<RowModel>) => string;
}

export function EntityDataGrid<RowModel extends GridValidRowModel>({
  rows,
  columns,
  loading,
  getRowId,
  selection,
  onSelectionChange,
  onRowDoubleClick,
  onRowClick,
  disableRowSelectionOnClick = false,
  pageSizeOptions = [25, 50, 100],
  density = 'compact',
  getRowClassName,
}: EntityDataGridProps<RowModel>) {
  return (
    <DataGrid
      rows={rows}
      columns={columns}
      loading={loading}
      getRowId={getRowId}
      rowSelectionModel={{ type: 'include', ids: new Set(selection) }}
      onRowSelectionModelChange={(model) => onSelectionChange(model.ids.size > 0 ? [Array.from(model.ids)[0]] : [])}
      pageSizeOptions={pageSizeOptions}
      onRowDoubleClick={(params) => onRowDoubleClick?.(params.id)}
      disableRowSelectionOnClick={disableRowSelectionOnClick}
      onRowClick={(params) => {
        if (onRowClick) {
          onRowClick(params.id);
          return;
        }
        onSelectionChange([params.id]);
      }}
      getRowClassName={getRowClassName}
      density={density}
      disableColumnMenu
      sx={{ '& .MuiDataGrid-cell': { cursor: 'default' } }}
    />
  );
}
