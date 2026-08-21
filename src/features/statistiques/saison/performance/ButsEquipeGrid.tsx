import type { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { SeasonTrendView } from '../../components/SeasonTrendView';
import { useStatRows } from '../../useStatRows';
import { fetchSaisonButsEquipe, type ButsEquipeMetric, type ButsEquipeRow } from './butsEquipeApi';

const HEADERS: Record<ButsEquipeMetric, string> = {
  'buts-pour': 'Buts Pour',
  'buts-contre': 'Buts Contre',
  'buts-pour-match': 'Buts Pour par Match',
  'buts-contre-match': 'Buts Contre par Match',
  'buts-match': 'Nombre de Buts par match',
};

/** Saison > Performance: buts marques/encaisses du club supporte, matchs officiels uniquement, une ligne par saison. */
export function ButsEquipeGrid({ metric }: { metric: ButsEquipeMetric }) {
  const { rows, loading } = useStatRows<ButsEquipeRow>((signal) => fetchSaisonButsEquipe(metric, signal), [metric]);

  const columns: GridColDef<ButsEquipeRow>[] = useMemo(() => [
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
    <SeasonTrendView<ButsEquipeRow>
      title={HEADERS[metric]}
      rows={rows}
      columns={columns}
      loading={loading}
    />
  );
}
