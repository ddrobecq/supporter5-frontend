import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';

export interface LigneEvolutionRow {
  SAISON: string;
  GARDIEN: number;
  DEFENSE: number;
  MIL_DEFENSIF: number;
  MIL_OFFENSIF: number;
  ATTAQUE: number;
  MATCHES: number;
}

export async function fetchLignesEvolution(signal?: AbortSignal): Promise<LigneEvolutionRow[]> {
  const { data } = await http.get<{ data: LigneEvolutionRow[] }>(
    `${env.statsPublicResource}/saison/composition/evolution-schema`,
    { signal },
  );
  return data.data ?? [];
}
