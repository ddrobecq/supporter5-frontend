import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';
import type {} from '@mui/x-data-grid/themeAugmentation';
import { fetchTeamThemes } from '../lib/themeApi';

export type ClassicAppearanceMode = 'light' | 'dark' | 'system';
export type TeamAppearanceMode = 'home' | 'away' | 'third';
export type AppearanceMode = ClassicAppearanceMode | TeamAppearanceMode;

export interface TeamThemeColors {
  background: string;
  text: string;
}

interface AppearanceContextValue {
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => void;
  teamThemes: Record<TeamAppearanceMode, TeamThemeColors>;
  setTeamTheme: (mode: TeamAppearanceMode, colors: TeamThemeColors) => void;
}

const CLASSIC_APPEARANCE_STORAGE_KEY = 'supporter:appearance-classic-mode:v1';
const TEAM_APPEARANCE_STORAGE_KEY = 'supporter:appearance-team-mode:v1';
const APPEARANCE_STORAGE_KEY = 'supporter:appearance-mode:v2';
const LEGACY_APPEARANCE_STORAGE_KEY = 'supporter:appearance-mode:v1';
const AppearanceContext = createContext<AppearanceContextValue | null>(null);

const DEFAULT_TEAM_THEMES: Record<TeamAppearanceMode, TeamThemeColors> = {
  home: { background: '#ffffff', text: '#244a73' },
  away: { background: '#eef2f6', text: '#244a73' },
  third: { background: '#e8eaf6', text: '#244a73' },
};

function readStoredMode(): AppearanceMode {
  const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system' || stored === 'home' || stored === 'away' || stored === 'third') {
    return stored;
  }
  const classic = localStorage.getItem(CLASSIC_APPEARANCE_STORAGE_KEY);
  const team = localStorage.getItem(TEAM_APPEARANCE_STORAGE_KEY);
  const legacy = localStorage.getItem(LEGACY_APPEARANCE_STORAGE_KEY);
  if (legacy === 'light' || legacy === 'dark' || legacy === 'system' || legacy === 'home' || legacy === 'away' || legacy === 'third') {
    return legacy;
  }
  if (team === 'away' || team === 'third') return team;
  return classic === 'dark' || classic === 'system' ? classic : 'light';
}

function getSystemMode(): PaletteMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolvePaletteMode(mode: ClassicAppearanceMode, systemMode: PaletteMode): PaletteMode {
  return mode === 'dark' || mode === 'system' && systemMode === 'dark' ? 'dark' : 'light';
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AppearanceMode>(() => readStoredMode());
  const [teamThemes, setTeamThemes] = useState(DEFAULT_TEAM_THEMES);
  const [systemMode, setSystemMode] = useState<PaletteMode>(() => getSystemMode());

  useEffect(() => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    void fetchTeamThemes().then((themes) => {
      if (!cancelled && Object.keys(themes).length === 3) setTeamThemes(themes);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => setSystemMode(event.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const classicMode = mode as ClassicAppearanceMode;
  const isTeamMode = mode === 'home' || mode === 'away' || mode === 'third';
  const teamTheme = isTeamMode ? teamThemes[mode] : null;
  const paletteMode = isTeamMode ? 'light' : resolvePaletteMode(classicMode, systemMode);
  const theme = useMemo(() => createTheme({
    palette: {
      mode: paletteMode,
      primary: {
        main: paletteMode === 'dark' ? '#8bb8e8' : '#244a73',
      },
      background: {
        default: teamTheme?.background ?? (paletteMode === 'dark' ? '#121a23' : '#eef2f6'),
        ...(teamTheme ? { paper: teamTheme.background } : {}),
      },
      ...(teamTheme ? { text: { primary: teamTheme.text, secondary: teamTheme.text } } : {}),
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiDataGrid: {
        styleOverrides: {
          columnHeaders: {
            backgroundColor: paletteMode === 'dark' ? '#263442' : '#e0e0e0',
          },
          columnHeader: {
            backgroundColor: paletteMode === 'dark' ? '#263442' : '#e0e0e0',
          },
          filler: {
            backgroundColor: paletteMode === 'dark' ? '#263442' : '#e0e0e0',
          },
          columnHeaderTitle: {
            fontWeight: 700,
          },
          row: {
            '&.Mui-selected': {
              backgroundColor: paletteMode === 'dark' ? '#315b86' : '#244a73',
              color: '#ffffff',
            },
            '&.Mui-selected:hover': {
              backgroundColor: paletteMode === 'dark' ? '#315b86' : '#244a73',
            },
          },
        },
      },
    },
  }), [paletteMode, teamTheme]);

  return (
    <AppearanceContext.Provider value={{ mode, setMode, teamThemes, setTeamTheme: (teamMode, colors) => setTeamThemes((previous) => ({ ...previous, [teamMode]: colors })) }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used inside AppearanceProvider');
  }
  return context;
}
