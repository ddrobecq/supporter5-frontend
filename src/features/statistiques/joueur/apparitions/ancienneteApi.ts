import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';
import type { StatPlayerRow } from '../../components/StatPlayerGrid';

export interface AncienneteRow extends StatPlayerRow {
  SAISONS: number;
}

export async function fetchNombreAnneesAuClub(
  playerOnly: boolean,
  signal?: AbortSignal,
): Promise<AncienneteRow[]> {
  const { data } = await http.get<{ data: AncienneteRow[] }>(
    `${env.statsPublicResource}/joueur/apparitions/anciennete`,
    { params: { playerOnly }, signal },
  );
  return data.data ?? [];
}
