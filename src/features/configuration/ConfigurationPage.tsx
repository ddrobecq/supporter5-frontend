import FormatColorFillRoundedIcon from '@mui/icons-material/FormatColorFillRounded';
import FormatColorTextRoundedIcon from '@mui/icons-material/FormatColorTextRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { http } from '../../lib/http';
import { toErrorMessage } from '../../components/useEntityPage';
import { pickScreenColor } from '../../lib/screenColorPicker';
import { updateTeamTheme } from '../../lib/themeApi';
import { useAppearance, type TeamAppearanceMode } from '../../theme/AppearanceProvider';
import { ThemeModeSelector } from '../../theme/ThemeModeSelector';
import {
  clearStoredAdminCredentials,
  getStoredAdminCredentials,
  storeAdminCredentials,
} from '../auth/authStore';

interface BackendVersionResponse {
  version?: string;
}

export function ConfigurationPage() {
  const [backendVersion, setBackendVersion] = useState<string>('...');
  const [adminUsername, setAdminUsername] = useState(() => getStoredAdminCredentials()?.username ?? '');
  const [adminPassword, setAdminPassword] = useState(() => getStoredAdminCredentials()?.password ?? '');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const { teamThemes, setTeamTheme } = useAppearance();
  const [themeMessage, setThemeMessage] = useState<string | null>(null);

  const handlePickTeamColor = async (team: TeamAppearanceMode, target: 'background' | 'text') => {
    try {
      const color = await pickScreenColor();
      const colors = { ...teamThemes[team], [target]: color };
      setTeamTheme(team, colors);
      await updateTeamTheme(team, colors);
      setThemeMessage(`Thème ${team} enregistré.`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setThemeMessage(toErrorMessage(error));
    }
  };

  useEffect(() => {
    let cancelled = false;

    void http.get<BackendVersionResponse>('/api/admin/system/version')
      .then(({ data }) => {
        if (cancelled) {
          return;
        }
        setBackendVersion(String(data.version ?? '').trim() || 'unknown');
      })
      .catch(() => {
        if (!cancelled) {
          setBackendVersion('unknown');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveCredentials = () => {
    const username = adminUsername.trim();
    if (!username || !adminPassword) {
      setAuthMessage('Renseignez le login et le mot de passe.');
      return;
    }
    const confirmed = window.confirm('Êtes vous sûr de vouloir enregistrer vos données d\'authentification sur ce navigateur ?');
    if (!confirmed) {
      return;
    }
    storeAdminCredentials({ username, password: adminPassword });
    setAdminUsername(username);
    setAuthMessage('Identifiants enregistres dans ce navigateur.');
  };

  const handleClearCredentials = () => {
    clearStoredAdminCredentials();
    setAdminUsername('');
    setAdminPassword('');
    setAuthMessage('Identifiants effaces.');
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>Configuration</Typography>

      <Card>
        <CardContent>
          <Stack spacing={0.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Version</Typography>
            <Typography variant="body2">Front: v{__APP_VERSION__}</Typography>
            <Typography variant="body2">Back: v{backendVersion}</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Thèmes</Typography>
            <ThemeModeSelector />
            <Typography variant="body2" color="text.secondary">
              Configurez les couleurs des modes Home, Away et Third. Les changements sont enregistrés dans la base.
            </Typography>
            {themeMessage ? <Alert severity="info">{themeMessage}</Alert> : null}
            {(['home', 'away', 'third'] as TeamAppearanceMode[]).map((team) => (
              <Stack key={team} direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography sx={{ width: { xs: '100%', sm: 80 }, fontWeight: 700 }}>{team[0].toUpperCase() + team.slice(1)}</Typography>
                <Box sx={{ width: 34, height: 34, borderRadius: 1, bgcolor: teamThemes[team].background, border: '1px solid', borderColor: 'divider' }} aria-label={`Fond ${team}`} />
                <Tooltip title={`Choisir le fond ${team}`}>
                  <IconButton size="small" onClick={() => void handlePickTeamColor(team, 'background')} aria-label={`Pipette fond ${team}`}>
                    <FormatColorFillRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Box sx={{ width: 34, height: 34, borderRadius: 1, bgcolor: teamThemes[team].text, border: '1px solid', borderColor: 'divider' }} aria-label={`Texte ${team}`} />
                <Tooltip title={`Choisir le texte ${team}`}>
                  <IconButton size="small" onClick={() => void handlePickTeamColor(team, 'text')} aria-label={`Pipette texte ${team}`}>
                    <FormatColorTextRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Authentification</Typography>
            <TextField
              label="Login"
              value={adminUsername}
              onChange={(event) => setAdminUsername(event.target.value)}
              autoComplete="username"
              fullWidth
            />
            <TextField
              label="Mot de passe"
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              autoComplete="current-password"
              fullWidth
            />
            {authMessage ? <Alert severity="info">{authMessage}</Alert> : null}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="contained" onClick={handleSaveCredentials}>Enregistrer</Button>
              <Button variant="outlined" onClick={handleClearCredentials}>Effacer</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
