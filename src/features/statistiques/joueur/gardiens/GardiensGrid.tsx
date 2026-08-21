import type { GridColDef } from '@mui/x-data-grid';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { useStatRows } from '../../useStatRows';
import { fetchMeilleursGardiens, type GardienRow } from './gardiensApi';

const VALUE_COLUMNS: GridColDef<GardienRow>[] = [
  {
    field: 'MINUTES_PAR_BUT_ENCAISSE',
    headerName: 'Fréquence',
    width: 140,
    type: 'number',
    align: 'right',
    headerAlign: 'right',
    valueFormatter: (value: number) => `${Math.round(value)} min`,
  },
];

/** Joueur > Gardiens > Meilleur gardien: minutes per conceded official goal. */
// Pas de filtre par competition ici: MATCHES/MINUTES viennent des totaux saison de JOUEUR
// (non filtrables par match), donc le filtre fausserait le ratio (seul BUTS_ENCAISSES serait filtre).
export function GardiensGrid() {
  const { rows, loading } = useStatRows<GardienRow>((signal) => fetchMeilleursGardiens(null, signal), []);

  return (
    <StatPlayerGrid<GardienRow>
      rows={rows}
      valueColumns={VALUE_COLUMNS}
      loading={loading}
      initialState={{ sorting: { sortModel: [{ field: 'MINUTES_PAR_BUT_ENCAISSE', sort: 'desc' }] } }}
    />
  );
}
