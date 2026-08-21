import { useEffect, useState } from 'react';
import { useGridApiRef, type GridRowId, type GridRowSelectionModel, type GridValidRowModel } from '@mui/x-data-grid';

interface UseStatGridSearchSelectionOptions<R extends GridValidRowModel> {
  rows: R[];
  apiRef: ReturnType<typeof useGridApiRef>;
  resolveRowId: (row: R) => GridRowId;
  search: string;
  getSearchValues: (row: R) => unknown[];
}

export function useStatGridSearchSelection<R extends GridValidRowModel>({
  rows,
  apiRef,
  resolveRowId,
  search,
  getSearchValues,
}: UseStatGridSearchSelectionOptions<R>) {
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });

  useEffect(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (!normalizedSearch) {
      setRowSelectionModel({ type: 'include', ids: new Set() });
      return;
    }

    const sortedIds = apiRef.current?.getSortedRowIds() ?? rows.map(resolveRowId);
    const firstMatchId = sortedIds.find((rowId) => {
      const row = apiRef.current?.getRow<R>(rowId) ?? rows.find((candidate) => resolveRowId(candidate) === rowId);
      return row
        ? getSearchValues(row).some((value) => String(value ?? '').toLocaleLowerCase().includes(normalizedSearch))
        : false;
    });

    setRowSelectionModel({
      type: 'include',
      ids: firstMatchId == null ? new Set() : new Set([firstMatchId]),
    });

    if (firstMatchId != null) {
      const sortedIndex = sortedIds.indexOf(firstMatchId);
      const pageSize = apiRef.current?.state.pagination.paginationModel.pageSize ?? 25;
      if (sortedIndex >= 0) {
        apiRef.current?.setPage(Math.floor(sortedIndex / pageSize));
        apiRef.current?.scrollToIndexes({ rowIndex: sortedIndex });
      }
    }
  }, [apiRef, rows, search, resolveRowId, getSearchValues]);

  return { rowSelectionModel, setRowSelectionModel };
}