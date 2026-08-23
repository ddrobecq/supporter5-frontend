import { http } from '../../lib/http';

export interface ImportAssociationRow {
  IDImportAssociation: number;
  IMP_NomClub: string;
  IMP_IDCLUB: string;
  CLUB: string | null;
}

export async function fetchImportAssociations(signal?: AbortSignal): Promise<ImportAssociationRow[]> {
  const { data } = await http.get<{ data: ImportAssociationRow[] }>('/api/admin/import/associations', { signal });
  return data.data ?? [];
}

export async function saveImportAssociation(nomClub: string, clubId: string): Promise<ImportAssociationRow> {
  const { data } = await http.post<ImportAssociationRow>('/api/admin/import/associations', { nomClub, clubId });
  return data;
}

export interface ImportRencontrePayloadRow {
  DATE: string;
  HEURE: string;
  IDCIRC: string;
  DOMICILE: string;
  EXTERIEUR: string;
  BUTDOM: string;
  BUTEXT: string;
  TABDOM: string;
  TABEXT: string;
  GROUPE: string;
}

export async function importRencontres(
  tourId: number,
  saison: string,
  rows: ImportRencontrePayloadRow[],
): Promise<{ imported: number }> {
  const { data } = await http.post<{ imported: number }>('/api/admin/import/rencontres', { tourId, saison, rows });
  return data;
}
