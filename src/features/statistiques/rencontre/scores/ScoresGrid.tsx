import { Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { ClubIdentityInline } from '../../../../components/ClubIdentityInline';
import { RencontreDateLink } from '../../components/RencontreDateLink';
import { StatMatchGrid } from '../../components/StatMatchGrid';
import { fetchScores, type ScoreMetric, type ScoreRow } from './scoresApi';

const HEADERS: Record<ScoreMetric, string> = {
  victoires: 'Plus larges victoires',
  defaites: 'Plus larges défaites',
  prolifiques: 'Matchs les plus prolifiques',
};

const SORT_FIELDS: Record<ScoreMetric, string> = {
  victoires: 'ECART',
  defaites: 'ECART',
  prolifiques: 'TOTAL_BUTS',
};

function ScoreSentence({ row }: { row: ScoreRow }) {
  return (
    <Typography variant="body2" sx={{ fontSize: 12, lineHeight: 1.4 }}>
      {`${row.BUT_POUR} à ${row.BUT_CONTRE} contre `}
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

export function ScoresGrid({ metric }: { metric: ScoreMetric }) {
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchScores(metric, scope, controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric, scope]);

  const columns: GridColDef<ScoreRow>[] = useMemo(() => [{
    field: SORT_FIELDS[metric],
    headerName: HEADERS[metric],
    flex: 1,
    minWidth: 480,
    type: 'number' as const,
    align: 'left',
    headerAlign: 'left',
    sortable: false,
    renderCell: (params) => <ScoreSentence row={params.row} />,
  }], [metric]);

  return (
    <StatMatchGrid<ScoreRow>
      rows={rows}
      valueColumns={columns}
      loading={loading}
      rowHeight={64}
      scope={scope}
      onScopeChange={setScope}
    />
  );
}
