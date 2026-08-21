import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import TableRowsRoundedIcon from '@mui/icons-material/TableRowsRounded';
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { StatGrid } from '../../components/StatGrid';
import { fetchSaisonComposition, type CompositionMetric, type CompositionRow } from './compositionApi';

const HEADERS: Record<CompositionMetric, string> = {
  'nombre-joueurs': 'Nombre de joueurs',
  'nombre-etrangers': "Nombre d'étrangers",
  'nombre-nationalites': 'Nombre de nationalités',
  'age-moyen': "Moyenne d'âge",
  'nombre-matches': 'Nombre de matches',
  'nombre-remplacements': 'Remplacements par match',
};

const UNITS: Record<CompositionMetric, string> = {
  'nombre-joueurs': 'joueurs',
  'nombre-etrangers': 'étrangers',
  'nombre-nationalites': 'nationalités',
  'age-moyen': 'ans',
  'nombre-matches': 'matches',
  'nombre-remplacements': 'remplacements/match',
};

type CompositionViewMode = 'grid' | 'chart';

/** Saison > composition: un item (nb joueurs, étrangers, nationalités, âge moyen, matches, remplacements) par saison. */
export function CompositionGrid({ metric }: { metric: CompositionMetric }) {
  const [rows, setRows] = useState<CompositionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CompositionViewMode>('grid');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchSaisonComposition(metric, controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric]);

  // Le graphe chronologique se lit toujours des saisons les plus anciennes aux plus recentes.
  const chronologicalRows = useMemo(
    () => [...rows].sort((a, b) => a.SAISON.localeCompare(b.SAISON)),
    [rows],
  );

  const columns: GridColDef<CompositionRow>[] = useMemo(() => [
    { field: 'SAISON', headerName: 'Saison', flex: 1, minWidth: 140 },
    {
      field: 'VALEUR',
      headerName: HEADERS[metric],
      flex: 1,
      minWidth: 220,
      type: 'number' as const,
      renderCell: (params) => `${params.value} ${UNITS[metric]}`,
    },
  ], [metric]);

  return (
    <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{HEADERS[metric]}</Typography>
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
          <StatGrid<CompositionRow>
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.SAISON}
            initialState={{
              sorting: { sortModel: [{ field: 'VALEUR', sort: 'desc' }] },
              pagination: { paginationModel: { pageSize: 25, page: 0 } },
            }}
          />
        ) : (
          <Box sx={{ height: '100%', width: '100%' }}>
            <LineChart
              xAxis={[{ data: chronologicalRows.map((row) => row.SAISON), scaleType: 'point', label: 'Saison' }]}
              series={[{ data: chronologicalRows.map((row) => row.VALEUR), label: HEADERS[metric], area: true }]}
              loading={loading}
            />
          </Box>
        )}
      </Box>
    </Stack>
  );
}
