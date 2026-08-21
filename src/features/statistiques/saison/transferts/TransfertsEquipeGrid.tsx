import type { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { formatMoney } from '../../../../lib/formatMoney';
import { SeasonTrendView } from '../../components/SeasonTrendView';
import { useStatRows } from '../../useStatRows';
import { fetchSaisonTransferts, type TransfertEquipeMetric, type TransfertEquipeRow } from './transfertsEquipeApi';

const HEADERS: Record<TransfertEquipeMetric, string> = {
  'achats-cumules': 'Achats cumulés',
  'ventes-cumulees': 'Ventes cumulées',
};

/** Saison > Transfert: somme des indemnites d'achat/vente du club supporte, une ligne par saison. */
export function TransfertsEquipeGrid({ metric }: { metric: TransfertEquipeMetric }) {
  const { rows, loading } = useStatRows<TransfertEquipeRow>((signal) => fetchSaisonTransferts(metric, signal), [metric]);

  const columns: GridColDef<TransfertEquipeRow>[] = useMemo(() => [
    { field: 'SAISON', headerName: 'Saison', flex: 1, minWidth: 140 },
    {
      field: 'VALEUR',
      headerName: HEADERS[metric],
      flex: 1,
      minWidth: 220,
      type: 'number' as const,
      renderCell: (params) => formatMoney(params.value),
    },
  ], [metric]);

  return (
    <SeasonTrendView<TransfertEquipeRow>
      title={HEADERS[metric]}
      rows={rows}
      columns={columns}
      loading={loading}
      valueFormatter={(value) => formatMoney(value ?? 0)}
    />
  );
}
