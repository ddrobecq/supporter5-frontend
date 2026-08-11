import { DataGrid, type DataGridProps, type GridRowParams, type GridValidRowModel } from '@mui/x-data-grid';

interface MatchDataGridProps<R extends GridValidRowModel> extends DataGridProps<R> {
  isDefaultHeureSort?: boolean;
  openMatchOnDoubleClick?: boolean;
  getMatchId?: (row: R) => string | number | null | undefined;
}

export function MatchDataGrid<R extends GridValidRowModel>(props: MatchDataGridProps<R>) {
  const {
    sx,
    isDefaultHeureSort = false,
    openMatchOnDoubleClick = false,
    getMatchId,
    onRowDoubleClick,
    ...rest
  } = props;

  const resolveMatchId = (row: R): string | number | null => {
    if (getMatchId) {
      const value = getMatchId(row);
      return value ?? null;
    }

    const recleunik = (row as Record<string, unknown>).RECLEUNIK;
    if (recleunik === null || recleunik === undefined) {
      return null;
    }

    return String(recleunik);
  };

  const handleRowDoubleClick: NonNullable<DataGridProps<R>['onRowDoubleClick']> = (params: GridRowParams<R>, event, details) => {
    onRowDoubleClick?.(params, event, details);

    if (!openMatchOnDoubleClick) {
      return;
    }

    const matchId = resolveMatchId(params.row);
    if (matchId === null || matchId === '') {
      return;
    }
    const path = `/admin/rencontres/${encodeURIComponent(String(matchId))}`;
    const label = 'Rencontre';

    window.dispatchEvent(new CustomEvent('supporter:tab-open', {
      detail: {
        path,
        label,
        unique: true,
        uniqueByPath: true,
      },
    }));
  };

  return (
    <DataGrid
      {...rest}
      onRowDoubleClick={handleRowDoubleClick}
      sx={{
        width: '100%',
        '& .MuiDataGrid-cell': { cursor: 'default' },
        '& .MuiDataGrid-row.status-terminee .MuiDataGrid-cell': { color: 'common.black' },
        '& .MuiDataGrid-row.status-terminee.Mui-selected .MuiDataGrid-cell': { color: 'common.white' },
        '& .MuiDataGrid-row.status-en-cours .MuiDataGrid-cell': { color: 'success.light' },
        '& .MuiDataGrid-row.status-en-attente .MuiDataGrid-cell': { color: 'grey.400' },
        '& .MuiDataGrid-row.status-programmee .MuiDataGrid-cell': { color: 'grey.400' },
        '& .MuiDataGrid-row.status-non-jouee .MuiDataGrid-cell': { color: 'grey.400' },
        '& .MuiDataGrid-row.selected-calendar-row': {
          backgroundColor: 'action.hover',
        },
        ...(isDefaultHeureSort
          ? {
              '& .MuiDataGrid-columnHeader[data-field="HEURE"] .MuiDataGrid-iconButtonContainer': {
                visibility: 'hidden',
                width: 0,
              },
            }
          : {}),
        ...sx,
      }}
    />
  );
}
