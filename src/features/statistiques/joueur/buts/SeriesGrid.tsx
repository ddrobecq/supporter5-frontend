import type { GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { StatPlayerSentence } from '../../components/StatPlayerSentence';
import { useStatRows } from '../../useStatRows';
import { fetchSeriesButeurs, type SerieButeurRow } from './seriesApi';

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function valueColumns(metric: 'buts' | 'passes'): GridColDef<SerieButeurRow>[] {
  return [{
    field: 'SERIE',
    headerName: metric === 'passes' ? 'Série de passes' : 'Série de buts',
    flex: 1,
    minWidth: 420,
    type: 'number',
    sortable: false,
    renderCell: (params) => <SerieCell row={params.row} metric={metric} />,
  }];
}

function SerieCell({ row, metric }: { row: SerieButeurRow; metric: 'buts' | 'passes' }) {
  return (
    <StatPlayerSentence joueur={row}>
      {` : série de ${row.SERIE} ${metric === 'passes' ? 'passes décisives' : 'buts'} du ${formatDateDisplay(row.SERIE_DEBUT)} au ${formatDateDisplay(row.SERIE_FIN)}${row.EN_COURS ? ' (série en cours)' : ''}`}
    </StatPlayerSentence>
  );
}

/** Joueur > Buts > Serie: longest run of scored matches, ignoring matches not played. */
export function SeriesGrid({ metric = 'buts' }: { metric?: 'buts' | 'passes' }) {
  const [scope, setScope] = useState<number | null>(null);
  const { rows, loading } = useStatRows<SerieButeurRow>((signal) => fetchSeriesButeurs(metric, scope, signal), [metric, scope]);

  return (
    <StatPlayerGrid<SerieButeurRow>
      rows={rows}
      valueColumns={valueColumns(metric)}
      loading={loading}
      hideIdentityColumn
      initialState={{ sorting: { sortModel: [{ field: 'SERIE', sort: 'desc' }] } }}
      scope={scope}
      onScopeChange={setScope}
    />
  );
}
