import type { GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { RencontreDateLink } from '../../components/RencontreDateLink';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { StatPlayerSentence } from '../../components/StatPlayerSentence';
import { useStatRows } from '../../useStatRows';
import { fetchButeursParMatch, type ButeurMatchRow } from './buteursMatchApi';

function valueColumns(metric: 'buts' | 'passes'): GridColDef<ButeurMatchRow>[] {
  return [{
    field: 'BUTS',
    headerName: metric === 'passes' ? 'Passeurs sur un match' : 'Buteurs sur un match',
    flex: 1,
    minWidth: 420,
    sortable: false,
    renderCell: (params) => <ButeurMatchCell row={params.row} metric={metric} />,
  }];
}

function ButeurMatchCell({ row, metric }: { row: ButeurMatchRow; metric: 'buts' | 'passes' }) {
  return (
    <StatPlayerSentence joueur={row}>
      {' avec '}
      {row.BUTS} {metric === 'passes' ? 'passes décisives' : 'buts'} le{' '}
      <RencontreDateLink date={row.MATCH_DATE} recleunik={row.RECLEUNIK} />
    </StatPlayerSentence>
  );
}

/** Joueur > Buts > Sur un match: best official single-match scoring performance per player. */
export function ButeursMatchGrid({ metric = 'buts' }: { metric?: 'buts' | 'passes' }) {
  const [scope, setScope] = useState<number | null>(null);
  const { rows, loading } = useStatRows<ButeurMatchRow>((signal) => fetchButeursParMatch(metric, scope, signal), [metric, scope]);

  return (
    <StatPlayerGrid<ButeurMatchRow>
      rows={rows}
      valueColumns={valueColumns(metric)}
      loading={loading}
      hideIdentityColumn
      getRowId={(row) => row.IDJOUEUR}
      scope={scope}
      onScopeChange={setScope}
    />
  );
}
