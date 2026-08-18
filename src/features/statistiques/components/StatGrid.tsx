import MilitaryTechRoundedIcon from '@mui/icons-material/MilitaryTechRounded';
import { Box, Tooltip } from '@mui/material';
import { DataGrid, useGridApiRef, type DataGridProps, type GridColDef, type GridRowClassNameParams, type GridValidRowModel } from '@mui/x-data-grid';

export interface StatGridProps<R extends GridValidRowModel> extends Partial<DataGridProps<R>> {
  rows: R[];
  columns: DataGridProps<R>['columns'];
  loading?: boolean;
  initialState?: DataGridProps<R>['initialState'];
}

/** Socle générique pour toutes les grilles de statistiques (StatPlayerGrid, StatMatchGrid, ...). */
export function StatGrid<R extends GridValidRowModel>({ rows, columns, loading, sx, initialState, getRowClassName, apiRef: externalApiRef, ...rest }: StatGridProps<R>) {
  const localApiRef = useGridApiRef();
  const apiRef = externalApiRef ?? localApiRef;
  const mergedInitialState = {
    pagination: { paginationModel: { pageSize: 25, page: 0 } },
    ...(initialState || {}),
  };

  const rankColumn: GridColDef<R> = {
    field: '__statRank',
    headerName: '#',
    width: 62,
    sortable: false,
    filterable: false,
    disableColumnMenu: true,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => {
      const sortedIds = params.api.getSortedRowIds();
      const rowIndex = sortedIds.indexOf(params.id);
      if (rowIndex < 0) return '-';

      const sortModel = params.api.getSortModel();
      const sortField = sortModel[0]?.field
        ?? columns.find((column) => column.type === 'number' && column.field !== '__statRank')?.field
        ?? columns.find((column) => column.field !== 'joueur' && column.field !== '__statRank')?.field;
      if (!sortField) return rowIndex + 1;

      const currentValue = params.row[sortField];
      const previousRow = rowIndex > 0 ? params.api.getRow(sortedIds[rowIndex - 1]) : null;
      if (previousRow && previousRow[sortField] === currentValue) return '-';

      const rank = rowIndex + 1;
      if (rank > 3) return rank;

      const medal = rank === 1
        ? { label: "Médaille d'or", color: '#d4a72c', size: 32 }
        : rank === 2
          ? { label: 'Médaille d\'argent', color: '#8b949e', size: 28 }
          : { label: 'Médaille de bronze', color: '#b87333', size: 28 };

      return (
        <Tooltip title={medal.label}>
          <MilitaryTechRoundedIcon aria-label={medal.label} sx={{ color: medal.color, fontSize: medal.size }} />
        </Tooltip>
      );
    },
  };

  const mergedGetRowClassName = (params: GridRowClassNameParams<R>) => {
    const externalClass = getRowClassName?.(params) ?? '';
    const firstSortedRowId = apiRef.current?.getSortedRowIds()[0];
    return [externalClass, params.id === firstSortedRowId ? 'stat-rank-first-row' : ''].filter(Boolean).join(' ');
  };

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        '& .stat-rank-first-row': {
          minHeight: '68px !important',
          height: '68px !important',
          alignItems: 'center !important',
        },
        '& .stat-rank-first-row .MuiDataGrid-cell': {
          minHeight: '68px !important',
          height: '68px !important',
          display: 'flex !important',
          alignItems: 'center !important',
          justifyContent: 'flex-start !important',
          textAlign: 'left',
        },
        '& .stat-rank-first-row .MuiDataGrid-cellContent, & .stat-rank-first-row .MuiTypography-root': {
          fontSize: '14px !important',
          fontWeight: 600,
          alignSelf: 'center',
        },
        '& .stat-rank-first-row .MuiAvatar-root': {
          width: '38px',
          height: '38px',
        },
        ...sx,
      }}
    >
      <DataGrid<R>
        rows={rows}
        columns={[rankColumn, ...columns]}
        apiRef={apiRef}
        loading={loading}
        getRowClassName={mergedGetRowClassName}
        density="compact"
        disableRowSelectionOnClick
        hideFooterSelectedRowCount
        pageSizeOptions={[25, 50, 100]}
        initialState={mergedInitialState}
        {...rest}
      />
    </Box>
  );
}
