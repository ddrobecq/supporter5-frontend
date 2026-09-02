import { create } from 'zustand';
import type { RecentOpenedRecord } from './types';
import { readRecentOpenedRecordsFromStorage, upsertRecentOpenedRecord } from './recentRecordsStorage';
import { buildPublicRecentOpenedRecord, PUBLIC_RECENT_OPENED_STORAGE_KEY } from './publicRecentRecords';

interface PublicRecentRecordsState {
  records: RecentOpenedRecord[];
  remember: (path: string, label: string) => void;
}

export const publicRecentRecordsStore = create<PublicRecentRecordsState>((set, get) => ({
  records: readRecentOpenedRecordsFromStorage(PUBLIC_RECENT_OPENED_STORAGE_KEY, buildPublicRecentOpenedRecord),
  remember: (path, label) => {
    const next = upsertRecentOpenedRecord(get().records, path, label, buildPublicRecentOpenedRecord);
    set({ records: next });
    try {
      window.localStorage.setItem(PUBLIC_RECENT_OPENED_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  },
}));
