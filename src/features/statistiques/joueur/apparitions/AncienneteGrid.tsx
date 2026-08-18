import { FormControlLabel, Stack, Switch } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { fetchNombreAnneesAuClub, type AncienneteRow } from './ancienneteApi';

const VALUE_COLUMNS: GridColDef<AncienneteRow>[] = [
  {
    field: 'SAISONS',
    headerName: 'Nombre de saisons',
    width: 170,
    type: 'number',
    align: 'right',
    headerAlign: 'right',
  },
];

/** Joueur > Apparitions > Nombre d'annees au club. */
export function AncienneteGrid() {
  const [searchParams, setSearchParams] = useSearchParams();
  const playerOnly = searchParams.get('playerOnly') === 'true';
  const [rows, setRows] = useState<AncienneteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchNombreAnneesAuClub(playerOnly, controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [playerOnly]);

  const handlePlayerOnlyChange = (checked: boolean) => {
    const nextParams = new URLSearchParams(searchParams);
    if (checked) {
      nextParams.set('playerOnly', 'true');
    } else {
      nextParams.delete('playerOnly');
    }
    setSearchParams(nextParams);
  };

  return (
    <Stack spacing={1} sx={{ minHeight: 0, flex: 1 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <FormControlLabel
          control={(
            <Switch
              size="small"
              checked={playerOnly}
              onChange={(event) => handlePlayerOnlyChange(event.target.checked)}
            />
          )}
          label="En tant que joueur"
        />
      </Stack>
      <StatPlayerGrid<AncienneteRow> rows={rows} valueColumns={VALUE_COLUMNS} loading={loading} />
    </Stack>
  );
}
