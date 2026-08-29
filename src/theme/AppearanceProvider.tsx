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

function normalizeHex(color: string): string {
  const hex = color.trim();
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex.slice(1).split('').map((char) => char + char).join('')}`;
  }
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#244a73';
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const toHex = (channel: number) => channel.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(base: string, overlay: string, amount: number): string {
  const baseRgb = hexToRgb(base);
  const overlayRgb = hexToRgb(overlay);
  const mixChannel = (baseChannel: number, overlayChannel: number) => Math.round(baseChannel + (overlayChannel - baseChannel) * amount);
  return rgbToHex({
    r: mixChannel(baseRgb.r, overlayRgb.r),
    g: mixChannel(baseRgb.g, overlayRgb.g),
    b: mixChannel(baseRgb.b, overlayRgb.b),
  });
}

function buildTeamThemeSurface(baseBackground: string, baseText: string) {
  const white = '#ffffff';
  const black = '#000000';
  const page = mixHex(baseBackground, black, 0.085);
  const paper = mixHex(baseBackground, white, 0.12);
  const box = mixHex(baseBackground, white, 0.22);
  const elevated = mixHex(baseBackground, white, 0.32);
  const border = mixHex(baseText, baseBackground, 0.72);
  const textSecondary = mixHex(baseText, baseBackground, 0.28);
  const textDisabled = mixHex(baseText, baseBackground, 0.52);
  const primary = baseText;
  const primaryLight = mixHex(baseText, white, 0.18);
  const primaryDark = mixHex(baseText, black, 0.12);

  return {
    page,
    paper,
    box,
    elevated,
    border,
    textSecondary,
    textDisabled,
    primary,
    primaryLight,
    primaryDark,
  };
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
  const teamTone = teamTheme ? buildTeamThemeSurface(teamTheme.background, teamTheme.text) : null;
  const paletteMode = isTeamMode ? 'light' : resolvePaletteMode(classicMode, systemMode);
  const theme = useMemo(() => createTheme({
    palette: {
      mode: paletteMode,
      primary: {
        main: teamTone?.primary ?? (paletteMode === 'dark' ? '#8bb8e8' : '#244a73'),
        light: teamTone?.primaryLight ?? (paletteMode === 'dark' ? '#a8c8f0' : '#4b7aa9'),
        dark: teamTone?.primaryDark ?? (paletteMode === 'dark' ? '#6ea6dd' : '#1b3655'),
      },
      background: {
        default: teamTone?.page ?? (paletteMode === 'dark' ? '#121a23' : '#eef2f6'),
        paper: teamTone?.paper ?? (paletteMode === 'dark' ? '#1d2a35' : '#ffffff'),
      },
      ...(teamTheme ? {
        text: {
          primary: teamTheme.text,
          secondary: teamTone?.textSecondary ?? teamTheme.text,
          disabled: teamTone?.textDisabled ?? teamTheme.text,
        },
        divider: teamTone?.border ?? 'rgba(36, 74, 115, 0.16)',
      } : {}),
    },
    shape: {
      borderRadius: 10,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: teamTone ? {
            backgroundColor: teamTone.box,
            border: `1px solid ${teamTone.border}`,
            boxShadow: 'none',
          } : undefined,
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: teamTone ? {
            backgroundColor: teamTone.paper,
            backgroundImage: 'none',
          } : undefined,
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: teamTone ? {
            backgroundColor: teamTone.paper,
            backgroundImage: 'none',
          } : undefined,
        },
      },
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
  }), [paletteMode, teamTheme, teamTone]);

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
