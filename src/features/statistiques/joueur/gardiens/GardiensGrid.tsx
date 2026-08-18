import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
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
export function GardiensGrid() {
  const [rows, setRows] = useState<GardienRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchMeilleursGardiens(controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <StatPlayerGrid<GardienRow>
      rows={rows}
      valueColumns={VALUE_COLUMNS}
      loading={loading}
      initialState={{ sorting: { sortModel: [{ field: 'MINUTES_PAR_BUT_ENCAISSE', sort: 'desc' }] } }}
    />
  );
}
