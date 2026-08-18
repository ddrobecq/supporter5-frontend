import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { fetchButeurs, fetchButeursParSaison, fetchEfficaciteButeurs, type ButeurRow, type ButeurSaisonRow, type EfficaciteButeurRow } from './buteursApi';

function valueColumns(metric: ScoringMetric): GridColDef<ButeurRow>[] {
  return [
  {
    field: 'BUTS',
    headerName: metric === 'passes' ? 'Passes' : 'Buts',
    width: 120,
    type: 'number',
    align: 'right',
    headerAlign: 'right',
    sortable: true,
  },
  ];
}

function saisonValueColumns(metric: ScoringMetric): GridColDef<ButeurSaisonRow>[] {
  return [
    { field: 'SAISON', headerName: 'Saison', width: 120 },
    { field: 'BUTS', headerName: metric === 'passes' ? 'Passes' : 'Buts', width: 120, type: 'number', align: 'right', headerAlign: 'right' },
  ];
}

function efficaciteValueColumns(metric: ScoringMetric): GridColDef<EfficaciteButeurRow>[] {
  return [
  { field: 'BUTS', headerName: metric === 'passes' ? 'Passes' : 'Buts', width: 100, type: 'number', align: 'right', headerAlign: 'right' },
  { field: 'MATCHES', headerName: 'Matchs', width: 110, type: 'number', align: 'right', headerAlign: 'right' },
  { field: 'MINUTES', headerName: 'Minutes jouées', width: 150, type: 'number', align: 'right', headerAlign: 'right' },
  {
    field: 'MINUTES_PAR_BUT',
    headerName: 'Fréquence',
    width: 150,
    type: 'number',
    align: 'right',
    headerAlign: 'right',
    valueFormatter: (value: number) => `${Math.round(value)} min`,
  },
  ];
}

/** Joueur > Buts > General: cumulative goals across all seasons. */
type ScoringMetric = 'buts' | 'passes';

interface ScoringGridProps {
  metric?: ScoringMetric;
}

export function ButeursGrid({ metric = 'buts' }: ScoringGridProps) {
  const [rows, setRows] = useState<ButeurRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchButeurs(metric, controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric]);

  return (
    <StatPlayerGrid<ButeurRow>
      rows={rows}
      valueColumns={valueColumns(metric)}
      loading={loading}
      initialState={{ sorting: { sortModel: [{ field: 'BUTS', sort: 'desc' }] } }}
    />
  );
}

export function ButeursParSaisonGrid({ metric = 'buts' }: ScoringGridProps) {
  const [rows, setRows] = useState<ButeurSaisonRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchButeursParSaison(metric, controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric]);

  return (
    <StatPlayerGrid<ButeurSaisonRow>
      rows={rows}
      valueColumns={saisonValueColumns(metric)}
      loading={loading}
      getRowId={(row) => `${row.IDJOUEUR}-${row.SAISON}`}
      initialState={{ sorting: { sortModel: [{ field: 'BUTS', sort: 'desc' }] } }}
    />
  );
}

export function EfficaciteButeursGrid({ metric = 'buts' }: ScoringGridProps) {
  const [rows, setRows] = useState<EfficaciteButeurRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchEfficaciteButeurs(metric, controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric]);

  return (
    <StatPlayerGrid<EfficaciteButeurRow>
      rows={rows}
      valueColumns={efficaciteValueColumns(metric)}
      loading={loading}
      initialState={{
        sorting: { sortModel: [{ field: 'MINUTES_PAR_BUT', sort: 'asc' }] },
        columns: { columnVisibilityModel: { BUTS: false, MATCHES: false, MINUTES: false } },
      }}
    />
  );
}
