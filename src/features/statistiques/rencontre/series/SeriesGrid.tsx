import { Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { RencontreDateLink } from '../../components/RencontreDateLink';
import { StatMatchGrid, type StatMatchRow } from '../../components/StatMatchGrid';
import { fetchRencontreSeries, type RencontreSerieMetric, type RencontreSerieRow } from './seriesApi';

const HEADERS: Record<RencontreSerieMetric, string> = {
  victoires: 'Série de victoires',
  nuls: 'Série de nuls',
  defaites: 'Série de défaites',
  invincibilite: "Série d'invincibilité",
  inviolabilite: "Série d'inviolabilité",
  inefficacite: "Série d'inefficacité",
};

const LABELS: Record<RencontreSerieMetric, (count: number) => string> = {
  victoires: (count) => `${count} victoires consécutives`,
  nuls: (count) => `${count} nuls consécutifs`,
  defaites: (count) => `${count} défaites consécutives`,
  invincibilite: (count) => `${count} matchs d'invincibilité`,
  inviolabilite: (count) => `${count} matchs sans encaisser`,
  inefficacite: (count) => `${count} matchs sans marquer`,
};

interface SerieRowWithId extends RencontreSerieRow, StatMatchRow {
  RECLEUNIK: number;
}

function SerieSentence({ row, metric }: { row: SerieRowWithId; metric: RencontreSerieMetric }) {
  return (
    <Typography variant="body2" sx={{ fontSize: 12, lineHeight: 1.4 }}>
      {`${LABELS[metric](row.SERIE)} du `}
      <RencontreDateLink date={row.SERIE_DEBUT} recleunik={row.SERIE_DEBUT_RECLEUNIK} />
      {' au '}
      <RencontreDateLink date={row.SERIE_FIN} recleunik={row.SERIE_FIN_RECLEUNIK} />
      {row.EN_COURS ? ' (série en cours)' : ''}
    </Typography>
  );
}

export function SeriesGrid({ metric }: { metric: RencontreSerieMetric }) {
  const [rows, setRows] = useState<SerieRowWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchRencontreSeries(metric, scope, controller.signal)
      .then((data) => setRows(data.map((row) => ({ ...row, RECLEUNIK: row.SERIE_FIN_RECLEUNIK }))))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric, scope]);

  const columns: GridColDef<SerieRowWithId>[] = useMemo(() => [{
    field: 'SERIE',
    headerName: HEADERS[metric],
    flex: 1,
    minWidth: 460,
    type: 'number' as const,
    align: 'left',
    headerAlign: 'left',
    sortable: false,
    renderCell: (params) => <SerieSentence row={params.row} metric={metric} />,
  }], [metric]);

  return (
    <StatMatchGrid<SerieRowWithId>
      rows={rows}
      valueColumns={columns}
      loading={loading}
      getRowId={(row) => `${row.SERIE_DEBUT_RECLEUNIK}-${row.SERIE_FIN_RECLEUNIK}`}
      rowHeight={64}
      hideSearch
      scope={scope}
      onScopeChange={setScope}
    />
  );
}
