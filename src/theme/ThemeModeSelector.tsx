import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useAppearance, type AppearanceMode, type ClassicAppearanceMode, type TeamAppearanceMode } from './AppearanceProvider';

const CLASSIC_APPEARANCE_OPTIONS: Array<{ value: ClassicAppearanceMode; label: string }> = [
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
  { value: 'system', label: 'Système' },
];

const TEAM_APPEARANCE_OPTIONS: Array<{ value: TeamAppearanceMode; label: string }> = [
  { value: 'home', label: 'Home' },
  { value: 'away', label: 'Away' },
  { value: 'third', label: 'Third' },
];

export function ThemeModeSelector() {
  const { mode, setMode } = useAppearance();
  const classicMode = ['light', 'dark', 'system'].includes(mode) ? mode as ClassicAppearanceMode : null;
  const teamMode = ['home', 'away', 'third'].includes(mode) ? mode as TeamAppearanceMode : null;

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Mode classiques</Typography>
      <ToggleButtonGroup exclusive fullWidth value={classicMode} onChange={(_event, nextMode: ClassicAppearanceMode | null) => { if (nextMode) setMode(nextMode as AppearanceMode); }} aria-label="Mode classiques">
        {CLASSIC_APPEARANCE_OPTIONS.map((option) => <ToggleButton key={option.value} value={option.value} aria-label={option.label}>{option.label}</ToggleButton>)}
      </ToggleButtonGroup>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Mode Team</Typography>
      <ToggleButtonGroup exclusive fullWidth value={teamMode} onChange={(_event, nextMode: TeamAppearanceMode | null) => { if (nextMode) setMode(nextMode as AppearanceMode); }} aria-label="Mode Team">
        {TEAM_APPEARANCE_OPTIONS.map((option) => <ToggleButton key={option.value} value={option.value} aria-label={option.label}>{option.label}</ToggleButton>)}
      </ToggleButtonGroup>
    </Stack>
  );
}
