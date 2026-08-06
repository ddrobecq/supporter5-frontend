import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { http } from '../../lib/http';
import { toErrorMessage } from '../../components/useEntityPage';

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

interface BackendVersionResponse {
  version?: string;
}

function isAllowedSqliteFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return lower.endsWith('.sqlite') || lower.endsWith('.db');
}

export function ConfigurationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [restartLoading, setRestartLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backendVersion, setBackendVersion] = useState<string>('...');

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
