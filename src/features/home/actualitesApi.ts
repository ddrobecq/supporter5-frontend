import { http } from '../../lib/http';
import { env } from '../../config/env';

export type ActualiteCategorie = 'Transferts' | 'Infirmerie' | 'Competitions' | 'Groupe' | 'Club';

export interface Actualite {
  id: string;
  titre: string;
  extrait: string;
  lien: string;
  source: string;
  publieLe: string;
  categorie: ActualiteCategorie;
  imageUrl?: string;
}

export async function fetchActualites(signal?: AbortSignal): Promise<Actualite[]> {
  const { data } = await http.get<{ data?: Actualite[] }>('/api/actualites', { signal });
  return Array.isArray(data?.data)
    ? data.data.map((actualite) => ({
      ...actualite,
      imageUrl: actualite.imageUrl ? new URL(actualite.imageUrl, env.apiBaseUrl).toString() : undefined,
    }))
    : [];
}