import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
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
  const [rows, setRows] = useState<ParSaisonRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchParSaison(controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <StatPlayerGrid<ParSaisonRow>
      rows={rows}
      valueColumns={VALUE_COLUMNS}
      loading={loading}
      getRowId={(row) => `${row.IDJOUEUR}-${row.SAISON}`}
    />
  );
}
