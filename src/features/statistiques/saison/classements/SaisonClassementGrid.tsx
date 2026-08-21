import { MenuItem, TextField } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { StatPlayerSentence } from '../../components/StatPlayerSentence';
import { useStatRows } from '../../useStatRows';
import { fetchSaisonClassement, fetchSaisons, type SaisonClassementMetric, type SaisonClassementRow } from './saisonClassementApi';

const HEADERS: Record<SaisonClassementMetric, string> = {
  temps: 'Temps de jeu',
  buts: 'Buteurs',
  passes: 'Passeurs',
  sanctions: 'Sanctions',
};

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

function sentence(row: SaisonClassementRow, metric: SaisonClassementMetric): string {
  switch (metric) {
    case 'temps':
      return ` avec ${row.VALEUR.toLocaleString()} minutes jouées`;
    case 'buts':
      return ` avec ${plural(row.VALEUR, 'but')}`;
    case 'passes':
      return ` avec ${plural(row.VALEUR, 'passe décisive', 'passes décisives')}`;
    case 'sanctions':
      return ` avec ${plural(row.JAUNES, 'avertissement')}${row.ROUGES > 0 ? ` et ${plural(row.ROUGES, 'exclusion')}` : ''}`;
  }
}

/** Saison > classements joueurs: temps de jeu, buts, passes ou sanctions sur la saison selectionnee. */
export function SaisonClassementGrid({ metric }: { metric: SaisonClassementMetric }) {
  const [saisons, setSaisons] = useState<string[]>([]);
  const [saison, setSaison] = useState('');
  const { rows, loading } = useStatRows<SaisonClassementRow>(
    (signal) => fetchSaisonClassement(metric, saison, signal),
    [metric, saison],
    { enabled: Boolean(saison) },
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchSaisons(controller.signal)
      .then((data) => {
        setSaisons(data);
        setSaison((current) => current || data[0] || '');
      })
      .catch(() => setSaisons([]));
    return () => controller.abort();
  }, []);

  const columns: GridColDef<SaisonClassementRow>[] = useMemo(() => [{
    field: 'VALEUR',
    headerName: HEADERS[metric],
    flex: 1,
    minWidth: 420,
    type: 'number' as const,
    sortable: false,
    renderCell: (params) => (
      <StatPlayerSentence joueur={params.row}>
        {sentence(params.row, metric)}
      </StatPlayerSentence>
    ),
  }], [metric]);

  return (
    <StatPlayerGrid<SaisonClassementRow>
      rows={rows}
      valueColumns={columns}
      loading={loading}
      hideIdentityColumn
      toolbarActions={(
        <TextField
          select
          size="small"
          label="Saison"
          value={saison}
          onChange={(event) => setSaison(event.target.value)}
          sx={{ minWidth: 160, flexShrink: 0 }}
        >
          {saisons.map((option) => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}
