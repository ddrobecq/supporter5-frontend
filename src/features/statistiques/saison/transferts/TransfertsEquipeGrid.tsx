import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import TableRowsRoundedIcon from '@mui/icons-material/TableRowsRounded';
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { formatMoney } from '../../../../lib/formatMoney';
import { StatGrid } from '../../components/StatGrid';
import { fetchSaisonTransferts, type TransfertEquipeMetric, type TransfertEquipeRow } from './transfertsEquipeApi';

const HEADERS: Record<TransfertEquipeMetric, string> = {
  'achats-cumules': 'Achats cumulés',
  'ventes-cumulees': 'Ventes cumulées',
};

type TransfertEquipeViewMode = 'grid' | 'chart';

/** Saison > Transfert: somme des indemnites d'achat/vente du club supporte, une ligne par saison. */
export function TransfertsEquipeGrid({ metric }: { metric: TransfertEquipeMetric }) {
  const [rows, setRows] = useState<TransfertEquipeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<TransfertEquipeViewMode>('grid');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchSaisonTransferts(metric, controller.signal)
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

  const columns: GridColDef<TransfertEquipeRow>[] = useMemo(() => [
    { field: 'SAISON', headerName: 'Saison', flex: 1, minWidth: 140 },
    {
      field: 'VALEUR',
      headerName: HEADERS[metric],
      flex: 1,
      minWidth: 220,
      type: 'number' as const,
      renderCell: (params) => formatMoney(params.value),
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
          <StatGrid<TransfertEquipeRow>
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
              series={[{ data: chronologicalRows.map((row) => row.VALEUR), label: HEADERS[metric], area: true, valueFormatter: (value) => formatMoney(value) }]}
              loading={loading}
            />
          </Box>
        )}
      </Box>
    </Stack>
  );
}
