import type { GridColDef } from '@mui/x-data-grid';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { useStatRows } from '../../useStatRows';
import { fetchPlusSelectionnes, type PlusSelectionneRow } from './plusSelectionnesApi';

const VALUE_COLUMNS: GridColDef<PlusSelectionneRow>[] = [
  {
    field: 'APPARITIONS',
    headerName: 'Apparitions',
    width: 140,
    type: 'number',
    align: 'right',
    headerAlign: 'right',
  },
];

/** Joueur > Apparitions > Plus selectionnes: cumul TITULAIRETOTAL + REMPTOTAL de toutes les saisons. */
export function PlusSelectionnesGrid() {
  const { rows, loading } = useStatRows<PlusSelectionneRow>(fetchPlusSelectionnes, []);

  return <StatPlayerGrid<PlusSelectionneRow> rows={rows} valueColumns={VALUE_COLUMNS} loading={loading} />;
}
