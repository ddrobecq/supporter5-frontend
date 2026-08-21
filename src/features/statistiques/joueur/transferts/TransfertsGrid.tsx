import type { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { ClubIdentityInline } from '../../../../components/ClubIdentityInline';
import { formatMoney } from '../../../../lib/formatMoney';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { StatPlayerSentence } from '../../components/StatPlayerSentence';
import { useStatRows } from '../../useStatRows';
import { fetchTransferts, type TransfertMetric, type TransfertRow } from './transfertsApi';

const HEADERS: Record<TransfertMetric, string> = {
  achats: 'Achats',
  ventes: 'Ventes',
  'plus-values': 'Plus-values',
  'moins-values': 'Moins-values',
};

function TransfertCell({ row, metric }: { row: TransfertRow; metric: TransfertMetric }) {
  const clubPrefix = metric === 'achats' ? ' en provenance de ' : metric === 'ventes' ? ' vers ' : '';

  return (
    <StatPlayerSentence
      joueur={row}
      trailing={clubPrefix ? (
        <ClubIdentityInline
          clubId={row.CLUB_ID}
          clubName={row.CLUB_NOM}
          natioId={row.CLUB_IDNATIO}
          size={20}
          nameSx={{ fontSize: 12 }}
        />
      ) : null}
    >
      {' pour '}
      {formatMoney(row.MONTANT)}
      {clubPrefix}
    </StatPlayerSentence>
  );
}

export function TransfertsGrid({ metric }: { metric: TransfertMetric }) {
  const { rows, loading } = useStatRows<TransfertRow>((signal) => fetchTransferts(metric, signal), [metric]);

  const columns: GridColDef<TransfertRow>[] = useMemo(() => [{
    field: 'MONTANT',
    headerName: HEADERS[metric],
    flex: 1,
    minWidth: 460,
    type: 'number' as const,
    sortable: false,
    renderCell: (params) => <TransfertCell row={params.row} metric={metric} />,
  }], [metric]);

  return (
    <StatPlayerGrid<TransfertRow>
      rows={rows}
      valueColumns={columns}
      loading={loading}
      hideIdentityColumn
      getRowId={(row) => `${row.IDJOUEUR}-${row.CLUB_ID ?? ''}-${row.MONTANT}`}
    />
  );
}
