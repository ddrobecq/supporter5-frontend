import { createContext, useContext } from 'react';

export type ClassicAppearanceMode = 'light' | 'dark' | 'system';
export type TeamAppearanceMode = 'home' | 'away' | 'third';
export type AppearanceMode = ClassicAppearanceMode | TeamAppearanceMode;

export interface TeamThemeColors {
  background: string;
  text: string;
}

export interface AppearanceContextValue {
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => void;
  teamThemes: Record<TeamAppearanceMode, TeamThemeColors>;
  setTeamTheme: (mode: TeamAppearanceMode, colors: TeamThemeColors) => void;
}

export const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used inside AppearanceProvider');
  }
  return context;
}
