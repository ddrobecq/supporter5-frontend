import { Box } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import type { MaintenanceCellValue } from './maintenanceApi';

interface MaintenanceResultGridProps {
  columns: string[];
  rows: MaintenanceCellValue[][];
  loading: boolean;
}

interface ResultRow {
  __id: number;
  [field: string]: MaintenanceCellValue | number;
}

/** Largeur moyenne d'un caractere de la grille en densite compacte. */
const CHAR_WIDTH = 7.4;
const CELL_PADDING = 28;
const HEADER_EXTRA = 24;
const MIN_COLUMN_WIDTH = 84;
const MAX_COLUMN_WIDTH = 460;
/** Nombre de lignes echantillonnees pour calibrer la largeur des colonnes. */
const WIDTH_SAMPLE_SIZE = 200;

function displayLength(value: MaintenanceCellValue): number {
  if (value === null) return 4;
  return String(value).length;
}

/**
 * Grille de resultats auto-configurable : les colonnes sont deduites du jeu de
 * resultats et leur largeur est calibree sur le contenu reellement affiche.
 */
export function MaintenanceResultGrid({ columns, rows, loading }: MaintenanceResultGridProps) {
  const gridColumns: GridColDef<ResultRow>[] = useMemo(() => {
    const sample = rows.slice(0, WIDTH_SAMPLE_SIZE);

    return columns.map((label, index) => {
      const field = `c${index}`;
      let maxChars = label.length + 2;
      let numericOnly = true;
      let hasValue = false;

      for (const row of sample) {
        const value = row[index] ?? null;
        maxChars = Math.max(maxChars, displayLength(value));
        if (value !== null) {
          hasValue = true;
          if (typeof value !== 'number') numericOnly = false;
        }
      }

      const contentWidth = Math.round(
        Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, maxChars * CHAR_WIDTH + CELL_PADDING)),
      );
      const headerWidth = Math.round(label.length * CHAR_WIDTH + CELL_PADDING + HEADER_EXTRA);
      const width = Math.min(MAX_COLUMN_WIDTH, Math.max(contentWidth, Math.min(headerWidth, MAX_COLUMN_WIDTH)));
      const alignRight = hasValue && numericOnly;

      return {
        field,
        headerName: label,
        // Poids proportionnel au contenu : les colonnes occupent toute la largeur
        // disponible sans jamais passer sous leur largeur utile.
        flex: width,
        minWidth: width,
        align: alignRight ? 'right' : 'left',
        headerAlign: alignRight ? 'right' : 'left',
        sortable: true,
        renderCell: (params) => {
          const value = params.value as MaintenanceCellValue;
          if (value === null || value === undefined) {
            return <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>NULL</Box>;
          }
          const text = String(value);
          return <Box component="span" title={text} sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</Box>;
        },
      } satisfies GridColDef<ResultRow>;
    });
  }, [columns, rows]);

  const gridRows: ResultRow[] = useMemo(() => rows.map((values, rowIndex) => {
    const row: ResultRow = { __id: rowIndex };
    columns.forEach((_label, columnIndex) => {
      row[`c${columnIndex}`] = values[columnIndex] ?? null;
    });
    return row;
  }), [columns, rows]);

  return (
    <DataGrid<ResultRow>
      rows={gridRows}
      columns={gridColumns}
      loading={loading}
      getRowId={(row) => row.__id}
      density="compact"
      disableRowSelectionOnClick
      showToolbar
      initialState={{ pagination: { paginationModel: { pageSize: 100, page: 0 } } }}
      pageSizeOptions={[25, 50, 100, 250]}
      sx={{
        width: '100%',
        minWidth: 0,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: 12.5,
        '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700 },
        '& .MuiDataGrid-cell': { cursor: 'text', userSelect: 'text' },
      }}
    />
  );
}
