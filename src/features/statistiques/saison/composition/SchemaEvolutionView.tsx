import { Box, Stack, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { useMemo } from 'react';
import { useStatRows } from '../../useStatRows';
import { fetchLignesEvolution, type LigneEvolutionRow } from './schemaEvolutionApi';

const LINE_SERIES: { key: keyof Omit<LigneEvolutionRow, 'SAISON' | 'MATCHES'>; label: string; color: string }[] = [
  { key: 'GARDIEN', label: 'Gardien', color: '#8d6e63' },
  { key: 'DEFENSE', label: 'Défense', color: '#1565c0' },
  { key: 'MIL_DEFENSIF', label: 'Milieu défensif', color: '#2e7d32' },
  { key: 'MIL_OFFENSIF', label: 'Milieu offensif', color: '#f9a825' },
  { key: 'ATTAQUE', label: 'Attaque', color: '#c62828' },
];

/** Saison > composition: nombre moyen de joueurs par ligne tactique, saisons triees chronologiquement. */
export function SchemaEvolutionView() {
  const { rows, loading } = useStatRows<LigneEvolutionRow>(fetchLignesEvolution, []);

  const chronologicalRows = useMemo(
    () => [...rows].sort((a, b) => a.SAISON.localeCompare(b.SAISON)),
    [rows],
  );

  const series = useMemo(() => LINE_SERIES.map((line) => ({
    id: line.key,
    label: line.label,
    stack: 'total',
    color: line.color,
    data: chronologicalRows.map((row) => row[line.key]),
  })), [chronologicalRows]);

  return (
    <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Nombre moyen de joueurs par ligne (gardien, défense, milieux, attaque)
      </Typography>

      <Box sx={{ flex: 1, minHeight: 320 }}>
        <BarChart
          xAxis={[{ data: chronologicalRows.map((row) => row.SAISON), scaleType: 'band', label: 'Saison' }]}
          series={series}
          loading={loading}
        />
      </Box>
    </Stack>
  );
}
