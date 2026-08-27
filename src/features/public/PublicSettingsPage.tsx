import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useAppearance, type AppearanceMode, type ClassicAppearanceMode, type TeamAppearanceMode } from '../../theme/AppearanceProvider';

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

export function PublicSettingsPage() {
  const { mode, setMode } = useAppearance();
  const classicMode = ['light', 'dark', 'system'].includes(mode) ? mode as ClassicAppearanceMode : null;
  const teamMode = ['home', 'away', 'third'].includes(mode) ? mode as TeamAppearanceMode : null;

  return (
    <Stack spacing={2}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <SettingsRoundedIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Paramètres</Typography>
        </Stack>
        <Typography color="text.secondary">Les paramètres seront disponibles prochainement.</Typography>
      </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Apparences</Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Mode classiques</Typography>
          <ToggleButtonGroup exclusive fullWidth value={classicMode} onChange={(_event, nextMode: ClassicAppearanceMode | null) => { if (nextMode) setMode(nextMode as AppearanceMode); }} aria-label="Mode classiques">
            {CLASSIC_APPEARANCE_OPTIONS.map((option) => <ToggleButton key={option.value} value={option.value} aria-label={option.label}>{option.label}</ToggleButton>)}
          </ToggleButtonGroup>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Mode Team</Typography>
          <ToggleButtonGroup exclusive fullWidth value={teamMode} onChange={(_event, nextMode: TeamAppearanceMode | null) => { if (nextMode) setMode(nextMode as AppearanceMode); }} aria-label="Mode Team">
            {TEAM_APPEARANCE_OPTIONS.map((option) => <ToggleButton key={option.value} value={option.value} aria-label={option.label}>{option.label}</ToggleButton>)}
          </ToggleButtonGroup>
        </Stack>
      </Paper>

    </Stack>
  );
}
