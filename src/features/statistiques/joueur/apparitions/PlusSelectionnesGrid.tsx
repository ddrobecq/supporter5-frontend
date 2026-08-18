import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
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
  const [rows, setRows] = useState<PlusSelectionneRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchPlusSelectionnes(controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return <StatPlayerGrid<PlusSelectionneRow> rows={rows} valueColumns={VALUE_COLUMNS} loading={loading} />;
}
