import type { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { SeasonTrendView } from '../../components/SeasonTrendView';
import { useStatRows } from '../../useStatRows';
import { fetchSaisonSanctionsEquipe, type SanctionEquipeMetric, type SanctionEquipeRow } from './sanctionsEquipeApi';

const HEADERS: Record<SanctionEquipeMetric, string> = {
  avertissements: 'Avertissements',
  exclusions: 'Expulsions',
  'avertissements-match': 'Avertissements par Match',
  'exclusions-match': 'Expulsions par Match',
};

/** Saison > Sanction: avertissements/exclusions du club supporte, une ligne par saison. */
export function SanctionsEquipeGrid({ metric }: { metric: SanctionEquipeMetric }) {
  const { rows, loading } = useStatRows<SanctionEquipeRow>((signal) => fetchSaisonSanctionsEquipe(metric, signal), [metric]);

  const columns: GridColDef<SanctionEquipeRow>[] = useMemo(() => [
    { field: 'SAISON', headerName: 'Saison', flex: 1, minWidth: 140 },
    {
      field: 'VALEUR',
      headerName: HEADERS[metric],
      flex: 1,
      minWidth: 220,
      type: 'number' as const,
    },
  ], [metric]);

  return (
    <SeasonTrendView<SanctionEquipeRow>
      title={HEADERS[metric]}
      rows={rows}
      columns={columns}
      loading={loading}
    />
  );
}
