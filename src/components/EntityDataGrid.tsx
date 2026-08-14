import {
  DataGrid,
  type GridCellParams,
  type GridColDef,
  type GridPaginationModel,
  type GridRowClassNameParams,
  type GridRowId,
  type GridValidRowModel,
} from '@mui/x-data-grid';

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
  label?: string;
  showToolbar?: boolean;
  paginationMode?: 'client' | 'server';
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (model: GridPaginationModel) => void;
  rowCount?: number;
  multiSelection?: boolean;
  checkboxSelection?: boolean;
  hideCheckboxSelectionColumn?: boolean;
  editMode?: 'cell' | 'row';
  processRowUpdate?: (newRow: RowModel, oldRow: RowModel) => Promise<RowModel> | RowModel;
  onProcessRowUpdateError?: (error: unknown) => void;
  isCellEditable?: (params: GridCellParams<RowModel>) => boolean;
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
  label,
  showToolbar = false,
  paginationMode = 'client',
  paginationModel,
  onPaginationModelChange,
  rowCount,
  multiSelection = false,
  checkboxSelection = false,
  hideCheckboxSelectionColumn = false,
  editMode,
  processRowUpdate,
  onProcessRowUpdateError,
  isCellEditable,
}: EntityDataGridProps<RowModel>) {
  return (
    <DataGrid
      rows={rows}
      columns={columns}
      loading={loading}
      getRowId={getRowId}
      rowSelectionModel={{ type: 'include', ids: new Set(selection) }}
      onRowSelectionModelChange={(model) => {
        const ids = Array.from(model.ids);
        if (ids.length === 0) {
          onSelectionChange([]);
          return;
        }
        onSelectionChange(multiSelection ? ids : [ids[0]]);
      }}
      pageSizeOptions={pageSizeOptions}
      onRowDoubleClick={(params) => onRowDoubleClick?.(params.id)}
      disableRowSelectionOnClick={disableRowSelectionOnClick}
      checkboxSelection={checkboxSelection}
      pagination
      paginationMode={paginationMode}
      paginationModel={paginationModel}
      onPaginationModelChange={onPaginationModelChange}
      rowCount={rowCount}
      editMode={editMode}
      processRowUpdate={processRowUpdate}
      onProcessRowUpdateError={onProcessRowUpdateError}
      isCellEditable={isCellEditable}
      onRowClick={(params) => {
        if (onRowClick) {
          onRowClick(params.id);
          return;
        }
        if (editMode) {
          return;
        }
        if (!multiSelection) {
          onSelectionChange([params.id]);
        }
      }}
      onCellKeyDown={(params, event) => {
        if (editMode) {
          return;
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          window.requestAnimationFrame(() => {
            const activeElement = document.activeElement as HTMLElement | null;
            const focusedRowElement = activeElement?.closest<HTMLElement>('.MuiDataGrid-row[data-id]');
            const focusedIdAttr = focusedRowElement?.getAttribute('data-id');
            if (!focusedIdAttr) {
              return;
            }

            const focusedRow = rows.find((row) => String(getRowId(row)) === focusedIdAttr);
            const nextId = focusedRow ? getRowId(focusedRow) : focusedIdAttr;
            if (selection.length === 1 && selection[0] === nextId) {
              return;
            }
            onSelectionChange([nextId]);
          });
          return;
        }

        if (event.key !== 'Enter') {
          return;
        }

        (event as { defaultMuiPrevented?: boolean }).defaultMuiPrevented = true;
        event.preventDefault();
        event.stopPropagation();
        onSelectionChange([params.id]);
        onRowDoubleClick?.(params.id);
      }}
      getRowClassName={getRowClassName}
      density={density}
      label={label}
      showToolbar={showToolbar}
      disableColumnMenu
      sx={{
        width: '100%',
        minWidth: 0,
        '& .MuiDataGrid-cell': { cursor: 'default' },
        '& .competition-finished-row': {
          backgroundColor: 'rgba(66, 66, 66, 0.18)',
          color: 'text.secondary',
        },
        '& .competition-finished-row:hover': {
          backgroundColor: 'rgba(66, 66, 66, 0.24)',
        },
        '& .competition-finished-row.Mui-selected, & .competition-finished-row.Mui-selected:hover': {
          backgroundColor: 'rgba(66, 66, 66, 0.3)',
        },
        ...(hideCheckboxSelectionColumn
          ? {
              '& .MuiDataGrid-columnHeaderCheckbox': { display: 'none' },
              '& .MuiDataGrid-cellCheckbox': { display: 'none' },
            }
          : {}),
      }}
    />
  );
}
