import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export type CompositionMetric =
  | 'nombre-joueurs'
  | 'nombre-etrangers'
  | 'nombre-nationalites'
  | 'age-moyen'
  | 'nombre-matches'
  | 'nombre-remplacements';

export interface CompositionRow {
  SAISON: string;
  VALEUR: number;
}

export async function fetchSaisonComposition(metric: CompositionMetric, signal?: AbortSignal): Promise<CompositionRow[]> {
  const { data } = await http.get<{ data: CompositionRow[] }>(
    `${env.statsPublicResource}/saison/composition/${metric}`,
    { signal },
  );
  return data.data ?? [];
}
