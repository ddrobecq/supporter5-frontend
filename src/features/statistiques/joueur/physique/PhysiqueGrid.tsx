import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { StatPlayerSentence } from '../../components/StatPlayerSentence';
import { fetchPhysique, type PhysiqueMetric, type PhysiqueRow } from './physiqueApi';

const HEADERS: Record<PhysiqueMetric, string> = {
  grands: 'Les plus grands',
  petits: 'Les plus petits',
  gabarits: 'Gabarits',
};

function formatTaille(hauteur: number): string {
  return `${Math.floor(hauteur / 100)}m${String(hauteur % 100).padStart(2, '0')}`;
}

function PhysiqueCell({ row, metric }: { row: PhysiqueRow; metric: PhysiqueMetric }) {
  return (
    <StatPlayerSentence joueur={row}>
      {` avec ${formatTaille(row.HAUTEUR)}`}
      {metric === 'gabarits' && row.POIDS ? ` pour ${row.POIDS} kg` : null}
    </StatPlayerSentence>
  );
}

export function PhysiqueGrid({ metric }: { metric: PhysiqueMetric }) {
  const [rows, setRows] = useState<PhysiqueRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchPhysique(metric, controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric]);

  const columns: GridColDef<PhysiqueRow>[] = useMemo(() => [{
    field: metric === 'gabarits' ? 'IMC' : 'HAUTEUR',
    headerName: HEADERS[metric],
    flex: 1,
    minWidth: 420,
    type: 'number' as const,
    sortable: false,
    renderCell: (params) => <PhysiqueCell row={params.row} metric={metric} />,
  }], [metric]);

  return (
    <StatPlayerGrid<PhysiqueRow>
      rows={rows}
      valueColumns={columns}
      loading={loading}
      hideIdentityColumn
    />
  );
}
