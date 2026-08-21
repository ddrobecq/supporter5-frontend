import type { GridColDef } from '@mui/x-data-grid';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { useStatRows } from '../../useStatRows';
import { fetchParSaison, type ParSaisonRow } from './parSaisonApi';

const VALUE_COLUMNS: GridColDef<ParSaisonRow>[] = [
  {
    field: 'SAISON',
    headerName: 'Saison',
    width: 120,
  },
  {
    field: 'APPARITIONS',
    headerName: 'Apparitions',
    width: 140,
    type: 'number',
    align: 'right',
    headerAlign: 'right',
  },
];

/** Joueur > Apparitions > Sur une saison: TITULAIRETOTAL + REMPTOTAL, 1 ligne par joueur/saison. */
export function ParSaisonGrid() {
  const { rows, loading } = useStatRows<ParSaisonRow>(fetchParSaison, []);

  return (
    <StatPlayerGrid<ParSaisonRow>
      rows={rows}
      valueColumns={VALUE_COLUMNS}
      loading={loading}
      getRowId={(row) => `${row.IDJOUEUR}-${row.SAISON}`}
    />
  );
}
