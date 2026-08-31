import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { toErrorMessage } from '../../components/useEntityPage';
import { MaintenanceResultGrid } from './MaintenanceResultGrid';
import {
  MAINTENANCE_CONFIRMATION_STATUS,
  MAINTENANCE_ROW_LIMIT_OPTIONS,
  runMaintenanceQuery,
  type MaintenanceQueryResult,
} from './maintenanceApi';
import { requiresConfirmation } from './sqlAnalysis';

const SQL_STORAGE_KEY = 'supporter.maintenance.sql';
const DEFAULT_ROW_LIMIT = 500;

function readStoredSql(): string {
  try {
    return window.localStorage.getItem(SQL_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

/** Outils > Maintenance : console SQL libre sur la base de donnees. */
export function MaintenancePage() {
  const [sql, setSql] = useState<string>(readStoredSql);
  const [rowLimit, setRowLimit] = useState(DEFAULT_ROW_LIMIT);
  const [running, setRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<MaintenanceQueryResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SQL_STORAGE_KEY, sql);
    } catch {
      // Stockage indisponible (mode prive) : la persistance est simplement ignoree.
    }
  }, [sql]);

  const execute = async (confirm: boolean) => {
    const trimmedSql = sql.trim();
    if (!trimmedSql) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setRunning(true);
    setErrorMessage('');
    try {
      const queryResult = await runMaintenanceQuery({
        sql: trimmedSql,
        confirm,
        limit: rowLimit,
        signal: controller.signal,
      });
      setResult(queryResult);
    } catch (error) {
      if (controller.signal.aborted) return;
      // Filet de securite : le backend a detecte une ecriture que l'analyse locale n'avait pas vue.
      if (axios.isAxiosError(error) && error.response?.status === MAINTENANCE_CONFIRMATION_STATUS) {
        setConfirmOpen(true);
        return;
      }
      setResult(null);
      setErrorMessage(toErrorMessage(error));
    } finally {
      if (!controller.signal.aborted) setRunning(false);
    }
  };

  const handleRun = () => {
    if (running || !sql.trim()) return;
    if (requiresConfirmation(sql)) {
      setConfirmOpen(true);
      return;
    }
    void execute(false);
  };

  const handleConfirmedRun = () => {
    setConfirmOpen(false);
    void execute(true);
  };

  const selectResult = result?.kind === 'select' ? result : null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        height: 'calc(100vh - 220px)',
        minHeight: 540,
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700 }}>Requêter la BdD</Typography>
        <Typography variant="body2" color="text.secondary">
          Requête SQL exécutée directement sur la base. Ctrl+Entrée pour exécuter.
        </Typography>
      </Stack>

      <TextField
        value={sql}
        onChange={(event) => setSql(event.target.value)}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            handleRun();
          }
        }}
        multiline
        minRows={5}
        maxRows={14}
        fullWidth
        placeholder="SELECT IDJOUEUR, NOM, PRENOM FROM JOUEUR ORDER BY NOM"
        spellCheck={false}
        slotProps={{
          input: {
            sx: {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: 13.5,
              alignItems: 'flex-start',
            },
          },
        }}
      />

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<PlayArrowRoundedIcon />}
          onClick={handleRun}
          disabled={running || !sql.trim()}
        >
          {running ? 'Exécution...' : 'Exécuter'}
        </Button>
        <Button
          color="inherit"
          onClick={() => {
            setSql('');
            setResult(null);
            setErrorMessage('');
          }}
          disabled={running}
        >
          Effacer
        </Button>
        <TextField
          select
          size="small"
          label="Lignes max"
          value={rowLimit}
          onChange={(event) => setRowLimit(Number(event.target.value))}
          disabled={running}
          sx={{ minWidth: 140 }}
        >
          {MAINTENANCE_ROW_LIMIT_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </TextField>
        {selectResult ? (
          <Typography variant="body2" color="text.secondary">
            {`${selectResult.rowCount} ligne(s) - ${selectResult.columns.length} colonne(s) - ${selectResult.durationMs} ms`}
          </Typography>
        ) : null}
      </Stack>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {selectResult?.mutating ? (
        <Alert severity="warning">
          Cette requête a également modifié la base de données.
        </Alert>
      ) : null}

      {selectResult?.truncated ? (
        <Alert severity="warning">
          {`Résultat tronqué à ${selectResult.limit} lignes. Affinez la requête ou augmentez la limite.`}
        </Alert>
      ) : null}

      {result?.kind === 'mutation' ? (
        <Alert severity="success">
          {`Requête exécutée en ${result.durationMs} ms : ${result.changes ?? 0} ligne(s) modifiée(s).`}
          {result.lastInsertRowid !== null && result.lastInsertRowid !== undefined
            ? ` Dernier identifiant inséré : ${result.lastInsertRowid}.`
            : ''}
        </Alert>
      ) : null}

      {result?.kind === 'script' ? (
        <Alert severity="success">
          {`Script exécuté en ${result.durationMs} ms.`}
        </Alert>
      ) : null}

      <Box sx={{ flex: 1, minHeight: 220, display: 'flex', minWidth: 0 }}>
        {selectResult ? (
          <MaintenanceResultGrid
            columns={selectResult.columns}
            rows={selectResult.rows}
            loading={running}
          />
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Aucun résultat à afficher. Saisissez une requête SELECT puis cliquez sur Exécuter.
            </Typography>
          </Box>
        )}
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberRoundedIcon color="warning" />
          Confirmer la modification
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography variant="body2">
              Cette requête peut modifier la base de données de manière irréversible.
              Voulez-vous vraiment l&apos;exécuter ?
            </Typography>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1.25,
                maxHeight: 220,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: 12.5,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'action.hover',
              }}
            >
              {sql.trim()}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setConfirmOpen(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleConfirmedRun}>
            Exécuter la requête
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
