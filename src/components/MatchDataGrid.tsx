import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { Box } from '@mui/material';
import { DataGrid, type DataGridProps, type GridRowParams, type GridValidRowModel } from '@mui/x-data-grid';
import { useCallback, useEffect, useRef, useState } from 'react';

type RowSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

type StatusAnchor = {
  rowId: string;
  status: Exclude<RowSaveStatus, 'idle'>;
  top: number;
};

interface MatchDataGridProps<R extends GridValidRowModel> extends DataGridProps<R> {
  isDefaultHeureSort?: boolean;
  openMatchOnDoubleClick?: boolean;
  getMatchId?: (row: R) => string | number | null | undefined;
  rowSaveStatusMap?: Record<string, RowSaveStatus>;
  saveStatusAnchorField?: string;
}

export function MatchDataGrid<R extends GridValidRowModel>(props: MatchDataGridProps<R>) {
  const {
    sx,
    density = 'compact',
    isDefaultHeureSort = false,
    openMatchOnDoubleClick = false,
    getMatchId,
    rowSaveStatusMap,
    saveStatusAnchorField = 'ETAT',
    onRowDoubleClick,
    ...rest
  } = props;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [statusAnchors, setStatusAnchors] = useState<StatusAnchor[]>([]);

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

  const updateStatusAnchors = useCallback(() => {
    if (!rowSaveStatusMap || Object.keys(rowSaveStatusMap).length === 0) {
      setStatusAnchors([]);
      return;
    }

    const wrapper = wrapperRef.current;
    if (!wrapper) {
      setStatusAnchors([]);
      return;
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    const statusCells = wrapper.querySelectorAll<HTMLElement>(`.MuiDataGrid-cell[data-field="${saveStatusAnchorField}"]`);
    const nextAnchors: StatusAnchor[] = [];

    statusCells.forEach((cell) => {
      const rowId = cell.parentElement?.getAttribute('data-id') ?? '';
      if (!rowId) return;

      const status = rowSaveStatusMap[rowId] ?? 'idle';
      if (status === 'idle') return;

      const cellRect = cell.getBoundingClientRect();
      nextAnchors.push({
        rowId,
        status,
        top: cellRect.top - wrapperRect.top + (cellRect.height / 2),
      });
    });

    setStatusAnchors(nextAnchors);
  }, [rowSaveStatusMap, saveStatusAnchorField]);

  useEffect(() => {
    if (!rowSaveStatusMap) {
      setStatusAnchors([]);
      return;
    }

    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const refresh = () => {
      window.requestAnimationFrame(updateStatusAnchors);
    };

    const virtualScroller = wrapper.querySelector<HTMLElement>('.MuiDataGrid-virtualScroller');
    const renderZone = wrapper.querySelector<HTMLElement>('.MuiDataGrid-virtualScrollerRenderZone');

    refresh();
    virtualScroller?.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', refresh);

    const observer = new MutationObserver(refresh);
    if (renderZone) {
      observer.observe(renderZone, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'data-id'],
      });
    }

    return () => {
      virtualScroller?.removeEventListener('scroll', refresh);
      window.removeEventListener('resize', refresh);
      observer.disconnect();
    };
  }, [rowSaveStatusMap, updateStatusAnchors]);

  return (
    <Box ref={wrapperRef} sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <DataGrid
        {...rest}
        density={density}
        onRowDoubleClick={handleRowDoubleClick}
        sx={{
          width: '100%',
          '@keyframes spin': {
            from: { transform: 'rotate(0deg)' },
            to: { transform: 'rotate(360deg)' },
          },
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

      {statusAnchors.length > 0 ? (
        <Box
          sx={{
            position: 'absolute',
            left: -14,
            top: 0,
            width: 14,
            height: '100%',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          {statusAnchors.map((anchor) => (
            <Box
              key={`${anchor.rowId}-${anchor.status}`}
              sx={{
                position: 'absolute',
                top: anchor.top,
                left: 0,
                transform: 'translateY(-50%)',
                width: 14,
                height: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {anchor.status === 'saving' ? (
                <AutorenewRoundedIcon sx={{ fontSize: 14, color: 'info.main', animation: 'spin 1s linear infinite' }} />
              ) : anchor.status === 'saved' ? (
                <CheckCircleRoundedIcon sx={{ fontSize: 14, color: 'success.main' }} />
              ) : (
                <ErrorOutlineRoundedIcon sx={{ fontSize: 14, color: 'error.main' }} />
              )}
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
