import { http } from './http';
import type { TeamAppearanceMode, TeamThemeColors } from '../theme/AppearanceProvider';

export interface ThemeRow {
  CODE: TeamAppearanceMode;
  LABEL: string;
  BACKGROUND_COLOR: string;
  TEXT_COLOR: string;
}

export async function fetchTeamThemes(): Promise<Record<TeamAppearanceMode, TeamThemeColors>> {
  const { data } = await http.get<{ data: ThemeRow[] }>('/api/system/themes');
  return data.data.reduce((themes, row) => {
    themes[row.CODE.toLowerCase() as TeamAppearanceMode] = {
      background: row.BACKGROUND_COLOR,
      text: row.TEXT_COLOR,
    };
    return themes;
  }, {} as Record<TeamAppearanceMode, TeamThemeColors>);
}

export async function updateTeamTheme(mode: TeamAppearanceMode, colors: TeamThemeColors): Promise<void> {
  await http.put(`/api/admin/system/themes/${mode.toUpperCase()}`, {
    backgroundColor: colors.background,
    textColor: colors.text,
  });
}
