import { http } from '../../lib/http';

export interface SupportedClubContext {
  clubId: string;
  clubName: string;
}

export async function fetchSupportedClubContext(): Promise<SupportedClubContext> {
  const { data } = await http.get<SupportedClubContext>('/api/admin/system/context');
  return {
    clubId: String(data?.clubId ?? '').trim(),
    clubName: String(data?.clubName ?? '').trim(),
  };
}
