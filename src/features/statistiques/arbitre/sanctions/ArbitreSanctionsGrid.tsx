import type { GridColDef } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import { StatArbitreGrid } from '../../components/StatArbitreGrid';
import { StatArbitreSentence } from '../../components/StatArbitreSentence';
import { useStatRows } from '../../useStatRows';
import { fetchArbitreSanctions, type ArbitreSanctionMetric, type ArbitreSanctionRow } from './arbitreSanctionsApi';

const HEADERS: Record<ArbitreSanctionMetric, string> = {
  avertissements: 'Avertissements donnés',
  exclusions: 'Exclusions prononcées',
};

const LABELS: Record<ArbitreSanctionMetric, (count: number) => string> = {
  avertissements: (count) => `avec ${count} avertissement${count > 1 ? 's' : ''} distribué${count > 1 ? 's' : ''}`,
  exclusions: (count) => `avec ${count} exclusion${count > 1 ? 's' : ''} prononcée${count > 1 ? 's' : ''}`,
};

function ArbitreSanctionCell({ row, metric }: { row: ArbitreSanctionRow; metric: ArbitreSanctionMetric }) {
  return (
    <StatArbitreSentence arbitre={row}>
      {` ${LABELS[metric](row.TOTAL)}`}
    </StatArbitreSentence>
  );
}

/** Arbitre > Sanctions: classement decroissant par nombre de cartons donnes (avertissements ou exclusions). */
export function ArbitreSanctionsGrid({ metric }: { metric: ArbitreSanctionMetric }) {
  const [scope, setScope] = useState<number | null>(null);
  const { rows, loading } = useStatRows<ArbitreSanctionRow>((signal) => fetchArbitreSanctions(metric, scope, signal), [metric, scope]);

  const columns: GridColDef<ArbitreSanctionRow>[] = useMemo(() => [{
    field: 'TOTAL',
    headerName: HEADERS[metric],
    flex: 1,
    minWidth: 420,
    type: 'number' as const,
    sortable: false,
    renderCell: (params) => <ArbitreSanctionCell row={params.row} metric={metric} />,
  }], [metric]);

  return (
    <StatArbitreGrid<ArbitreSanctionRow>
      rows={rows}
      valueColumns={columns}
      loading={loading}
      hideIdentityColumn
      initialState={{ sorting: { sortModel: [{ field: 'TOTAL', sort: 'desc' }] } }}
      scope={scope}
      onScopeChange={setScope}
    />
  );
}
