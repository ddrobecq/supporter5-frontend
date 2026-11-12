import type { GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { formatDateFr } from '../../../../lib/formatDate';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { StatPlayerSentence } from '../../components/StatPlayerSentence';
import { useStatRows } from '../../useStatRows';
import { fetchSeriesInviolabilite, type SerieInviolabiliteRow } from './seriesInviolabiliteApi';

const VALUE_COLUMNS: GridColDef<SerieInviolabiliteRow>[] = [{
  field: 'SERIE',
  headerName: "Série d'inviolabilité",
  flex: 1,
  minWidth: 460,
  type: 'number',
  sortable: false,
  renderCell: (params) => <SerieInviolabiliteCell row={params.row} />,
}];

function SerieInviolabiliteCell({ row }: { row: SerieInviolabiliteRow }) {
  return (
    <StatPlayerSentence joueur={row}>
      {` : série de ${row.SERIE} matchs sans encaisser du ${formatDateFr(row.SERIE_DEBUT)} au ${formatDateFr(row.SERIE_FIN)}${row.EN_COURS ? ' (série en cours)' : ''}`}
    </StatPlayerSentence>
  );
}

export function SerieInviolabiliteGrid() {
  const [scope, setScope] = useState<number | null>(null);
  const { rows, loading, error } = useStatRows<SerieInviolabiliteRow>((signal) => fetchSeriesInviolabilite(scope, signal), [scope]);

  return (
    <StatPlayerGrid<SerieInviolabiliteRow>
      rows={rows}
      valueColumns={VALUE_COLUMNS}
      loading={loading}
      error={error}
      hideIdentityColumn
      initialState={{ sorting: { sortModel: [{ field: 'SERIE', sort: 'desc' }] } }}
      scope={scope}
      onScopeChange={setScope}
    />
  );
}
