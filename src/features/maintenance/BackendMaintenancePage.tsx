import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import { http } from '../../lib/http';
import { toErrorMessage } from '../../components/useEntityPage';
import { formatDateTimeFr } from '../../lib/formatDate';
import { getStoredDirectoryHandle } from './backupDirectoryStore';
import { forceBackupNow, isFileSystemAccessSupported, pickBackupDirectory } from './backupRunner';
import { getBackupSettings, saveBackupSettings, type BackupFrequency, type BackupSettings } from './backupSettings';

interface UploadDatabaseResponse {
  message?: string;
  path?: string;
  size?: number;
  restartRequired?: boolean;
}

interface RestartBackendResponse {
  message?: string;
  scheduledInMs?: number;
}

function isAllowedSqliteFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return lower.endsWith('.sqlite') || lower.endsWith('.db');
}

const FREQUENCY_OPTIONS: Array<{ value: BackupFrequency; label: string }> = [
  { value: 'daily', label: 'Quotidien' },
  { value: 'weekly', label: 'Hebdo' },
];

export function BackendMaintenancePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [restartLoading, setRestartLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [backupSettings, setBackupSettings] = useState<BackupSettings>(() => getBackupSettings());
  const [backupDirHandle, setBackupDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [backupNowLoading, setBackupNowLoading] = useState(false);
  const fsSupported = isFileSystemAccessSupported();

  useEffect(() => {
    let cancelled = false;
    void getStoredDirectoryHandle().then((handle) => {
      if (!cancelled) setBackupDirHandle(handle);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateBackupSettings = (patch: Partial<BackupSettings>) => {
    setBackupSettings(saveBackupSettings(patch));
  };

  const handleToggleBackupEnabled = async (_event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
    if (checked && !backupDirHandle) {
      try {
        const handle = await pickBackupDirectory();
        setBackupDirHandle(handle);
        updateBackupSettings({ enabled: true, directoryName: handle.name });
      } catch {
        // Picker annule ou non supporte: le toggle reste eteint.
      }
      return;
    }
    updateBackupSettings({ enabled: checked });
  };

  const handleChangeBackupDirectory = async () => {
    try {
      const handle = await pickBackupDirectory();
      setBackupDirHandle(handle);
      updateBackupSettings({ directoryName: handle.name });
    } catch {
      // Picker annule.
    }
  };

  const handleFrequencyChange = (_event: MouseEvent<HTMLElement>, value: BackupFrequency | null) => {
    if (!value) return;
    updateBackupSettings({ frequency: value });
  };

  const handleKeepCountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseInt(event.target.value, 10);
    updateBackupSettings({ keepCount: Number.isFinite(parsed) && parsed > 0 ? parsed : 1 });
  };

  const handleBackupNow = async () => {
    if (!backupDirHandle) return;
    setBackupNowLoading(true);
    try {
      await forceBackupNow(backupDirHandle);
    } finally {
      setBackupSettings(getBackupSettings());
      setBackupNowLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setErrorMessage('Selectionnez un fichier SQLite (.sqlite ou .db).');
      return;
    }

    if (!isAllowedSqliteFile(file)) {
      setErrorMessage('Extension non supportee. Utilisez un fichier .sqlite ou .db.');
      return;
    }

    const confirmed = window.confirm(
      'Confirmez-vous l import de cette base sur le serveur ? Un redemarrage du backend sera necessaire pour l utiliser.',
    );
    if (!confirmed) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await http.post<UploadDatabaseResponse>('/api/admin/system/database/upload', formData);

      const baseMessage = data.message ?? 'Base importee sur le serveur.';
      const restartHint = data.restartRequired
        ? ' Redemarrez le backend Render pour charger cette base en memoire.'
        : '';

      setSuccessMessage(`${baseMessage}${restartHint}`);
      setFile(null);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleRestartBackend = async () => {
    const confirmed = window.confirm(
      'Confirmez-vous le redemarrage du backend ? Les requetes seront interrompues quelques secondes.',
    );
    if (!confirmed) {
      return;
    }

    setRestartLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data } = await http.post<RestartBackendResponse>('/api/admin/system/restart');
      setSuccessMessage(data.message ?? 'Redemarrage du backend programme.');
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setRestartLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloadLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await http.get<Blob>('/api/admin/system/database/download', {
        responseType: 'blob',
      });

      const contentDisposition = String(response.headers['content-disposition'] ?? '');
      const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
      const fallbackName = `supporter-${new Date().toISOString().slice(0, 10)}.sqlite`;
      const rawName = match?.[1] ? decodeURIComponent(match[1]) : fallbackName;
      const fileName = rawName.replace(/[\\/:*?"<>|]/g, '_');

      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      setSuccessMessage('Telechargement de la base demarre.');
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>Maintenance</Typography>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Sauvegarde</Typography>
              <Typography variant="body2" color="text.secondary">
                Telecharge automatiquement une copie de la base de prod sur ce poste, a chaque passage en Admin.
              </Typography>
            </Box>

            {fsSupported ? (
              <FormControlLabel
                control={(
                  <Switch
                    checked={backupSettings.enabled}
                    onChange={(event, checked) => void handleToggleBackupEnabled(event, checked)}
                  />
                )}
                label="Activer la sauvegarde automatique sur ce device"
              />
            ) : (
              <Alert severity="warning">Sauvegarde automatique impossible sur ce navigateur</Alert>
            )}

            {fsSupported && backupSettings.enabled ? (
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
                  <TextField
                    label="Repertoire de sauvegarde"
                    value={backupDirHandle?.name ?? backupSettings.directoryName ?? 'Aucun dossier selectionne'}
                    slotProps={{ input: { readOnly: true } }}
                    fullWidth
                  />
                  <Button
                    variant="outlined"
                    startIcon={<FolderRoundedIcon />}
                    onClick={() => void handleChangeBackupDirectory()}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    {backupDirHandle ? 'Changer...' : 'Choisir...'}
                  </Button>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
                  <Typography variant="body2" sx={{ minWidth: 90 }}>Frequence</Typography>
                  <ToggleButtonGroup
                    exclusive
                    color="primary"
                    value={backupSettings.frequency}
                    onChange={handleFrequencyChange}
                    size="small"
                  >
                    {FREQUENCY_OPTIONS.map((option) => (
                      <ToggleButton key={option.value} value={option.value}>{option.label}</ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Stack>

                <TextField
                  label="Profondeur de l'historique (nombre de sauvegardes conservees)"
                  type="number"
                  value={backupSettings.keepCount}
                  onChange={handleKeepCountChange}
                  slotProps={{ htmlInput: { min: 1 } }}
                  sx={{ maxWidth: { sm: 360 } }}
                />

                <Typography variant="body2" color="text.secondary">
                  Derniere sauvegarde : {backupSettings.lastBackupAt ? formatDateTimeFr(backupSettings.lastBackupAt) : 'jamais'}
                </Typography>

                <Button
                  variant="contained"
                  startIcon={<SaveRoundedIcon />}
                  onClick={() => void handleBackupNow()}
                  disabled={backupNowLoading || !backupDirHandle}
                  sx={{ width: { xs: '100%', md: 280 } }}
                >
                  {backupNowLoading ? 'Sauvegarde en cours...' : 'Sauvegarder maintenant'}
                </Button>
              </Stack>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Base de donnees</Typography>
              <Typography variant="body2" color="text.secondary">
                Gerez la base SQLite active du backend: import sur serveur et telechargement local.
              </Typography>
            </Box>

            {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
              <Box
                sx={{
                  flex: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 2,
                }}
              >
                <Stack spacing={1.5} sx={{ height: '100%' }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Uploader</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Importez un fichier SQLite (.sqlite/.db) dans le chemin configure par SQLITE_DB_PATH.
                    </Typography>
                  </Box>

                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileOutlinedIcon />}
                    disabled={loading || downloadLoading || restartLoading}
                    fullWidth
                  >
                    Selectionner un fichier
                    <input
                      type="file"
                      hidden
                      accept=".sqlite,.db,application/x-sqlite3"
                      onChange={(event) => {
                        const selected = event.target.files?.[0] ?? null;
                        setFile(selected);
                        setErrorMessage(null);
                      }}
                    />
                  </Button>

                  <Typography variant="body2" color="text.secondary" sx={{ minHeight: 22 }}>
                    {file ? `Fichier selectionne: ${file.name}` : 'Aucun fichier selectionne.'}
                  </Typography>

                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => void handleImport()}
                    disabled={loading || !file || downloadLoading || restartLoading}
                    fullWidth
                  >
                    {loading ? 'Import en cours...' : 'Importer la base'}
                  </Button>
                </Stack>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  p: 2,
                }}
              >
                <Stack spacing={1.5} sx={{ height: '100%' }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Downloader</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Telechargez en local le fichier SQLite actuellement utilise par le backend.
                    </Typography>
                  </Box>

                  <Box sx={{ minHeight: 22 }} />

                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<DownloadRoundedIcon />}
                    onClick={() => void handleDownload()}
                    disabled={downloadLoading || loading || restartLoading}
                    fullWidth
                  >
                    {downloadLoading ? 'Telechargement...' : 'Telecharger la base'}
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Maintenance backend</Typography>
              <Typography variant="body2" color="text.secondary">
                Redemarrez le service backend apres un upload de base pour charger le nouveau fichier.
              </Typography>
            </Box>

            <Button
              variant="outlined"
              color="warning"
              startIcon={<AutorenewRoundedIcon />}
              onClick={() => void handleRestartBackend()}
              disabled={restartLoading || loading || downloadLoading}
              sx={{ width: { xs: '100%', md: 280 } }}
            >
              {restartLoading ? 'Redemarrage...' : 'Redemarrer le backend'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
