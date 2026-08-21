import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import TableRowsRoundedIcon from '@mui/icons-material/TableRowsRounded';
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import type { DataGridProps, GridColDef, GridValidRowModel } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import { StatGrid } from './StatGrid';

type SeasonTrendViewMode = 'grid' | 'chart';

export interface SeasonTrendRow extends GridValidRowModel {
  SAISON: string;
  VALEUR: number;
}

interface SeasonTrendViewProps<Row extends SeasonTrendRow> {
  title: string;
  rows: Row[];
  columns: GridColDef<Row>[];
  loading?: boolean;
  valueFormatter?: (value: number | null) => string;
  initialState?: DataGridProps<Row>['initialState'];
}

export function SeasonTrendView<Row extends SeasonTrendRow>({
  title,
  rows,
  columns,
  loading,
  valueFormatter,
  initialState,
}: SeasonTrendViewProps<Row>) {
  const [view, setView] = useState<SeasonTrendViewMode>('grid');

  const chronologicalRows = useMemo(
    () => [...rows].sort((a, b) => a.SAISON.localeCompare(b.SAISON)),
    [rows],
  );

  return (
    <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_event, next) => next && setView(next)}
        >
          <ToggleButton value="grid" aria-label="Vue grille">
            <TableRowsRoundedIcon fontSize="small" />
          </ToggleButton>
          <ToggleButton value="chart" aria-label="Vue graphique chronologique">
            <BarChartRoundedIcon fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 320 }}>
        {view === 'grid' ? (
          <StatGrid<Row>
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.SAISON}
            initialState={initialState ?? {
              sorting: { sortModel: [{ field: 'VALEUR', sort: 'desc' }] },
              pagination: { paginationModel: { pageSize: 25, page: 0 } },
            }}
          />
        ) : (
          <Box sx={{ height: '100%', width: '100%' }}>
            <LineChart
              xAxis={[{ data: chronologicalRows.map((row) => row.SAISON), scaleType: 'point', label: 'Saison' }]}
              series={[{
                data: chronologicalRows.map((row) => row.VALEUR),
                label: title,
                area: true,
                valueFormatter,
              }]}
              loading={loading}
            />
          </Box>
        )}
      </Box>
    </Stack>
  );
}