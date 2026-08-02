import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
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
import { useState } from 'react';
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

function isAllowedSqliteFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return lower.endsWith('.sqlite') || lower.endsWith('.db');
}

export function ConfigurationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [restartLoading, setRestartLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>Configuration</Typography>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Base de donnees</Typography>
              <Typography variant="body2" color="text.secondary">
                Importez un fichier SQLite (.sqlite/.db) dans le chemin configure par SQLITE_DB_PATH cote backend.
              </Typography>
            </Box>

            {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileOutlinedIcon />}
              disabled={loading}
              sx={{ width: 'fit-content' }}
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

            <Typography variant="body2" color="text.secondary">
              {file ? `Fichier selectionne: ${file.name}` : 'Aucun fichier selectionne.'}
            </Typography>

            <Button
              variant="contained"
              color="primary"
              onClick={() => void handleImport()}
              disabled={loading || !file}
              sx={{ width: 'fit-content' }}
            >
              {loading ? 'Import en cours...' : 'Importer'}
            </Button>

            <Button
              variant="outlined"
              color="warning"
              startIcon={<AutorenewRoundedIcon />}
              onClick={() => void handleRestartBackend()}
              disabled={restartLoading || loading}
              sx={{ width: 'fit-content' }}
            >
              {restartLoading ? 'Redemarrage...' : 'Redemarrer le backend'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
