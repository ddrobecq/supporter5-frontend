import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { Paper, Stack, Typography } from '@mui/material';

export function PublicSettingsPage() {
  return (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <SettingsRoundedIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Paramètres</Typography>
        </Stack>
        <Typography color="text.secondary">Les paramètres seront disponibles prochainement.</Typography>
      </Stack>
    </Paper>
  );
}
