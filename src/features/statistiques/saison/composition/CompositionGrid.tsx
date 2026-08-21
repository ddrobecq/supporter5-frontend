import type { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { SeasonTrendView } from '../../components/SeasonTrendView';
import { useStatRows } from '../../useStatRows';
import { fetchSaisonComposition, type CompositionMetric, type CompositionRow } from './compositionApi';

const HEADERS: Record<CompositionMetric, string> = {
  'nombre-joueurs': 'Nombre de joueurs',
  'nombre-etrangers': "Nombre d'étrangers",
  'nombre-nationalites': 'Nombre de nationalités',
  'age-moyen': "Moyenne d'âge",
  'nombre-matches': 'Nombre de matches',
  'nombre-remplacements': 'Remplacements par match',
};

const UNITS: Record<CompositionMetric, string> = {
  'nombre-joueurs': 'joueurs',
  'nombre-etrangers': 'étrangers',
  'nombre-nationalites': 'nationalités',
  'age-moyen': 'ans',
  'nombre-matches': 'matches',
  'nombre-remplacements': 'remplacements/match',
};

/** Saison > composition: un item (nb joueurs, étrangers, nationalités, âge moyen, matches, remplacements) par saison. */
export function CompositionGrid({ metric }: { metric: CompositionMetric }) {
  const { rows, loading } = useStatRows<CompositionRow>((signal) => fetchSaisonComposition(metric, signal), [metric]);

  const columns: GridColDef<CompositionRow>[] = useMemo(() => [
    { field: 'SAISON', headerName: 'Saison', flex: 1, minWidth: 140 },
    {
      field: 'VALEUR',
      headerName: HEADERS[metric],
      flex: 1,
      minWidth: 220,
      type: 'number' as const,
      renderCell: (params) => `${params.value} ${UNITS[metric]}`,
    },
  ], [metric]);

  return (
    <SeasonTrendView<CompositionRow>
      title={HEADERS[metric]}
      rows={rows}
      columns={columns}
      loading={loading}
    />
  );
}
