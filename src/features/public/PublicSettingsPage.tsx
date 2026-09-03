import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { Paper, Stack, Typography } from '@mui/material';
import { ThemeModeSelector } from '../../theme/ThemeModeSelector';

export function PublicSettingsPage() {
  return (
    <Stack spacing={2}>
      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <SettingsRoundedIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Paramètres</Typography>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Apparences</Typography>
          <ThemeModeSelector />
        </Stack>
      </Paper>

    </Stack>
  );
}
