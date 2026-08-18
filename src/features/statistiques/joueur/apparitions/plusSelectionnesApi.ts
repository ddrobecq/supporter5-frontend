import { env } from '../../../../config/env';
import { http } from '../../../../lib/http';
import type { StatPlayerRow } from '../../components/StatPlayerGrid';

export interface PlusSelectionneRow extends StatPlayerRow {
  APPARITIONS: number;
}

export async function fetchPlusSelectionnes(signal?: AbortSignal): Promise<PlusSelectionneRow[]> {
  const { data } = await http.get<{ data: PlusSelectionneRow[] }>(
    `${env.statsPublicResource}/joueur/apparitions/plus-selectionnes`,
    { signal },
  );
  return data.data ?? [];
}
