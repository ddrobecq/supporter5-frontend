import { create } from 'zustand';
import { fetchSupportedClubContext } from './systemApi';

const SUPPORTED_CLUB_FALLBACK_ID = '0001';
const SUPPORTED_CLUB_FALLBACK_NAME = 'Club supporte';

interface SupportedClubState {
  clubId: string;
  clubName: string;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

let loadPromise: Promise<void> | null = null;

export const supportedClubStore = create<SupportedClubState>((set, get) => ({
  clubId: SUPPORTED_CLUB_FALLBACK_ID,
  clubName: SUPPORTED_CLUB_FALLBACK_NAME,
  loaded: false,
  loading: false,
  error: null,
  load: async () => {
    const state = get();
    if (state.loaded) return;
    if (loadPromise) return loadPromise;

    set({ loading: true, error: null });
    loadPromise = fetchSupportedClubContext()
      .then((context) => {
        const clubId = context.clubId || SUPPORTED_CLUB_FALLBACK_ID;
        const clubName = context.clubName || SUPPORTED_CLUB_FALLBACK_NAME;
        set({
          clubId,
          clubName,
          loaded: true,
          loading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        set({
          loaded: true,
          loading: false,
          error: message,
        });
      })
      .finally(() => {
        loadPromise = null;
      });

    return loadPromise;
  },
}));
