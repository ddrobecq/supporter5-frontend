import type { GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { StatPlayerSentence } from '../../components/StatPlayerSentence';
import { useStatRows } from '../../useStatRows';
import { fetchSeriesInviolabilite, type SerieInviolabiliteRow } from './seriesInviolabiliteApi';

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

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
      {` : série de ${row.SERIE} matchs sans encaisser du ${formatDateDisplay(row.SERIE_DEBUT)} au ${formatDateDisplay(row.SERIE_FIN)}${row.EN_COURS ? ' (série en cours)' : ''}`}
    </StatPlayerSentence>
  );
}

export function SerieInviolabiliteGrid() {
  const [scope, setScope] = useState<number | null>(null);
  const { rows, loading } = useStatRows<SerieInviolabiliteRow>((signal) => fetchSeriesInviolabilite(scope, signal), [scope]);

  return (
    <StatPlayerGrid<SerieInviolabiliteRow>
      rows={rows}
      valueColumns={VALUE_COLUMNS}
      loading={loading}
      hideIdentityColumn
      initialState={{ sorting: { sortModel: [{ field: 'SERIE', sort: 'desc' }] } }}
      scope={scope}
      onScopeChange={setScope}
    />
  );
}
