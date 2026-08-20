import { Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { ClubIdentityInline } from '../../../../components/ClubIdentityInline';
import { RencontreDateLink } from '../../components/RencontreDateLink';
import { StatMatchGrid } from '../../components/StatMatchGrid';
import { fetchAffluence, type AffluenceRow } from './affluenceApi';

function AffluenceSentence({ row }: { row: AffluenceRow }) {
  return (
    <Typography variant="body2" sx={{ fontSize: 12, lineHeight: 1.4 }}>
      {`${row.NBSPECT.toLocaleString()} spect. contre `}
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

export function AffluenceGrid() {
  const [rows, setRows] = useState<AffluenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchAffluence(scope, controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [scope]);

  const columns: GridColDef<AffluenceRow>[] = useMemo(() => [{
    field: 'NBSPECT',
    headerName: 'Affluence',
    flex: 1,
    minWidth: 480,
    type: 'number' as const,
    align: 'left',
    headerAlign: 'left',
    sortable: false,
    renderCell: (params) => <AffluenceSentence row={params.row} />,
  }], []);

  return (
    <StatMatchGrid<AffluenceRow>
      rows={rows}
      valueColumns={columns}
      loading={loading}
      rowHeight={64}
      scope={scope}
      onScopeChange={setScope}
    />
  );
}
