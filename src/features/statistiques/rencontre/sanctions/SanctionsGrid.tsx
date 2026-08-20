import { Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { ClubIdentityInline } from '../../../../components/ClubIdentityInline';
import { RencontreDateLink } from '../../components/RencontreDateLink';
import { StatMatchGrid } from '../../components/StatMatchGrid';
import { fetchRencontreSanctions, type RencontreSanctionRow, type SanctionMetric } from './sanctionsApi';

const HEADERS: Record<SanctionMetric, string> = {
  avertissements: 'Avertissements',
  exclusions: 'Exclusions',
};

const LABELS: Record<SanctionMetric, (count: number) => string> = {
  avertissements: (count) => `${count} avertissement${count > 1 ? 's' : ''}`,
  exclusions: (count) => `${count} exclusion${count > 1 ? 's' : ''}`,
};

function SanctionSentence({ row, metric }: { row: RencontreSanctionRow; metric: SanctionMetric }) {
  return (
    <Typography variant="body2" sx={{ fontSize: 12, lineHeight: 1.4 }}>
      {`${LABELS[metric](row.NB_SANCTIONS)} contre `}
      <ClubIdentityInline
        clubId={row.ADVERSAIRE_ID}
        clubName={row.ADVERSAIRE_NOM}
        natioId={row.ADVERSAIRE_IDNATIO}
        size={18}
        nameSx={{ fontSize: 12 }}
        sx={{ display: 'inline-flex', verticalAlign: 'middle' }}
      />
      {row.CIRC_COMPLET ? ` lors de ${row.CIRC_COMPLET}` : ''}
      {' le '}
      <RencontreDateLink date={row.DATE} recleunik={row.RECLEUNIK} />
    </Typography>
  );
}

export function SanctionsGrid({ metric }: { metric: SanctionMetric }) {
  const [rows, setRows] = useState<RencontreSanctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchRencontreSanctions(metric, scope, controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric, scope]);

  const columns: GridColDef<RencontreSanctionRow>[] = useMemo(() => [{
    field: 'NB_SANCTIONS',
    headerName: HEADERS[metric],
    flex: 1,
    minWidth: 480,
    type: 'number' as const,
    align: 'left',
    headerAlign: 'left',
    sortable: false,
    renderCell: (params) => <SanctionSentence row={params.row} metric={metric} />,
  }], [metric]);

  return (
    <StatMatchGrid<RencontreSanctionRow>
      rows={rows}
      valueColumns={columns}
      loading={loading}
      rowHeight={64}
      scope={scope}
      onScopeChange={setScope}
    />
  );
}
