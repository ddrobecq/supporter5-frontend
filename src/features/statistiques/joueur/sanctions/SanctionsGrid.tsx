import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { RencontreDateLink } from '../../components/RencontreDateLink';
import { StatPlayerSentence } from '../../components/StatPlayerSentence';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { fetchExclusionsRapides, fetchSanctions, fetchSanctionsParSaison, type ExclusionRapideRow, type SanctionRow, type SanctionSaisonRow } from './sanctionsApi';

type SanctionMetric = 'avertissements' | 'exclusions';

interface SanctionsGridProps {
  metric: SanctionMetric;
}

function label(metric: SanctionMetric): string {
  return metric === 'exclusions' ? 'Exclusions' : 'Avertissements';
}

export function SanctionsGrid({ metric }: SanctionsGridProps) {
  const [rows, setRows] = useState<SanctionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchSanctions(metric, controller.signal).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric]);

  const columns: GridColDef<SanctionRow>[] = [{
    field: 'BUTS', headerName: label(metric), width: 150, type: 'number', align: 'right', headerAlign: 'right',
  }];

  return <StatPlayerGrid<SanctionRow> rows={rows} valueColumns={columns} loading={loading} initialState={{ sorting: { sortModel: [{ field: 'BUTS', sort: 'desc' }] } }} />;
}

export function SanctionsParSaisonGrid({ metric }: SanctionsGridProps) {
  const [rows, setRows] = useState<SanctionSaisonRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchSanctionsParSaison(metric, controller.signal).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric]);

  const columns: GridColDef<SanctionSaisonRow>[] = [
    { field: 'SAISON', headerName: 'Saison', width: 120 },
    { field: 'BUTS', headerName: label(metric), width: 150, type: 'number', align: 'right', headerAlign: 'right' },
  ];

  return (
    <StatPlayerGrid<SanctionSaisonRow>
      rows={rows}
      valueColumns={columns}
      loading={loading}
      getRowId={(row) => `${row.IDJOUEUR}-${row.SAISON}`}
      initialState={{ sorting: { sortModel: [{ field: 'BUTS', sort: 'desc' }] } }}
    />
  );
}

export function ExclusionsRapidesGrid() {
  const [rows, setRows] = useState<ExclusionRapideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchExclusionsRapides(scope, controller.signal).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
    return () => controller.abort();
  }, [scope]);

  const columns: GridColDef<ExclusionRapideRow>[] = [{
    field: 'MINUTE',
    headerName: 'Exclusions les plus rapides',
    flex: 1,
    minWidth: 420,
    sortable: false,
    renderCell: (params) => <ExclusionRapideCell row={params.row} />,
  }];

  return (
    <StatPlayerGrid<ExclusionRapideRow>
      rows={rows}
      valueColumns={columns}
      loading={loading}
      hideIdentityColumn
      initialState={{ sorting: { sortModel: [{ field: 'MINUTE', sort: 'asc' }] } }}
      scope={scope}
      onScopeChange={setScope}
    />
  );
}

function ExclusionRapideCell({ row }: { row: ExclusionRapideRow }) {
  return (
    <StatPlayerSentence joueur={row}>
      {` exclu à la ${row.MINUTE}e minute le `}
      <RencontreDateLink date={row.MATCH_DATE} recleunik={row.RECLEUNIK} />
    </StatPlayerSentence>
  );
}
