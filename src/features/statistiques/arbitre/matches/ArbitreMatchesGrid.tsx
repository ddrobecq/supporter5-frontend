import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { StatArbitreGrid } from '../../components/StatArbitreGrid';
import { StatArbitreSentence } from '../../components/StatArbitreSentence';
import { fetchArbitreMatches, type ArbitreMatchesRow } from './arbitreMatchesApi';

function ArbitreMatchesCell({ row }: { row: ArbitreMatchesRow }) {
  return (
    <StatArbitreSentence arbitre={row}>
      {` avec ${row.MATCHES} matches arbitrés`}
    </StatArbitreSentence>
  );
}

const VALUE_COLUMNS: GridColDef<ArbitreMatchesRow>[] = [{
  field: 'MATCHES',
  headerName: 'Matches arbitrés',
  flex: 1,
  minWidth: 420,
  type: 'number',
  sortable: false,
  renderCell: (params) => <ArbitreMatchesCell row={params.row} />,
}];

/** Arbitre > Matches: classement decroissant par nombre de matchs officiels arbitres. */
export function ArbitreMatchesGrid() {
  const [rows, setRows] = useState<ArbitreMatchesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchArbitreMatches(scope, controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [scope]);

  const columns = useMemo(() => VALUE_COLUMNS, []);

  return (
    <StatArbitreGrid<ArbitreMatchesRow>
      rows={rows}
      valueColumns={columns}
      loading={loading}
      hideIdentityColumn
      initialState={{ sorting: { sortModel: [{ field: 'MATCHES', sort: 'desc' }] } }}
      scope={scope}
      onScopeChange={setScope}
    />
  );
}
