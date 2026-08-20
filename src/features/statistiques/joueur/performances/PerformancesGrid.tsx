import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useGridApiRef, type GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { fetchPerformances, type PerformanceMetric, type PerformanceRow } from './performancesApi';

type DisplayMode = 'count' | 'percent';

const LABELS: Record<PerformanceMetric, string> = {
  victoires: 'Victoires',
  nuls: 'Nuls',
  defaites: 'Défaites',
};

const SORT_FIELD: Record<DisplayMode, string> = {
  count: 'RESULTATS',
  percent: 'POURCENTAGE',
};

export function PerformancesGrid({ metric }: { metric: PerformanceMetric }) {
  const [rows, setRows] = useState<PerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<DisplayMode>('count');
  const [scope, setScope] = useState<number | null>(null);
  const apiRef = useGridApiRef();

  // Le tri doit suivre la colonne affichee par le switch, une fois les colonnes remontees.
  useEffect(() => {
    if (rows.length === 0) return;
    apiRef.current?.sortColumn(SORT_FIELD[mode], 'desc');
  }, [apiRef, mode, rows.length]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPerformances(metric, scope, controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric, scope]);

  const columns: GridColDef<PerformanceRow>[] = useMemo(() => (mode === 'percent'
    ? [{
      field: 'POURCENTAGE',
      headerName: `${LABELS[metric]} (%)`,
      width: 160,
      type: 'number' as const,
      align: 'right' as const,
      headerAlign: 'right' as const,
      valueFormatter: (value: number) => `${value} %`,
    }]
    : [{
      field: 'RESULTATS',
      headerName: LABELS[metric],
      width: 160,
      type: 'number' as const,
      align: 'right' as const,
      headerAlign: 'right' as const,
    }]), [metric, mode]);

  return (
    <StatPlayerGrid<PerformanceRow>
      rows={rows}
      valueColumns={columns}
      loading={loading}
      apiRef={apiRef}
      scope={scope}
      onScopeChange={setScope}
      toolbarActions={(
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode}
          onChange={(_event, next: DisplayMode | null) => next && setMode(next)}
        >
          <ToggleButton value="count" aria-label="Afficher le nombre">#</ToggleButton>
          <ToggleButton value="percent" aria-label="Afficher le pourcentage">%</ToggleButton>
        </ToggleButtonGroup>
      )}
    />
  );
}
