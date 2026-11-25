import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { Checkbox, FormControlLabel, FormHelperText, Paper, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { isTrafficOptedOut, setTrafficOptOut } from '../../lib/trafficVisitor';
import { ThemeModeSelector } from '../../theme/ThemeModeSelector';

export function PublicSettingsPage() {
  const [trafficOptedOut, setTrafficOptedOut] = useState(isTrafficOptedOut);
  const [trafficSaveFailed, setTrafficSaveFailed] = useState(false);

  const handleTrafficOptOutChange = (checked: boolean) => {
    const saved = setTrafficOptOut(checked);
    setTrafficSaveFailed(!saved);
    if (saved) setTrafficOptedOut(checked);
  };

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

      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={1}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Mesure d'audience</Typography>
          <FormControlLabel
            control={<Checkbox checked={trafficOptedOut} onChange={(event) => handleTrafficOptOutChange(event.target.checked)} />}
            label="Ne pas être compté dans les statistiques de visite"
          />
          {trafficSaveFailed && (
            <FormHelperText error>Impossible d'enregistrer ce choix : le stockage du navigateur est indisponible.</FormHelperText>
          )}
          <Typography variant="body2" color="text.secondary">
            Ce site mesure son audience sans cookie publicitaire : un identifiant aléatoire, conservé 13 mois dans votre navigateur, permet de compter les visites. Aucune donnée n'est partagée avec des tiers et votre adresse IP n'est pas conservée.
          </Typography>
        </Stack>
      </Paper>

    </Stack>
  );
}
