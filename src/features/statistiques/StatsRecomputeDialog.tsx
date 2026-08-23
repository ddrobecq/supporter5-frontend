import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { http } from '../../lib/http';
import { toErrorMessage } from '../../components/useEntityPage';
import { fetchSaisons } from '../joueur/joueurApi';

interface StatsRecomputeDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Outils > Statistiques > Calculer statistiques : rejoue le recalcul des stats joueurs des saisons selectionnees. */
export function StatsRecomputeDialog({ open, onClose }: StatsRecomputeDialogProps) {
  const [saisons, setSaisons] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    const controller = new AbortController();
    void fetchSaisons(controller.signal)
      .then((rows) => {
        setSaisons(rows.map((row) => String(row.SAISON ?? '').trim()).filter(Boolean));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setErrorMessage(toErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [open]);

  const toggleSaison = (saison: string) => {
    setSuccessMessage('');
    setSelected((current) => (
      current.includes(saison)
        ? current.filter((item) => item !== saison)
        : [...current, saison]
    ));
  };

  const handleCompute = async () => {
    if (selected.length === 0) return;
    setComputing(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await http.post('/api/admin/stats/recompute', { saisons: selected });
      setSuccessMessage(`Statistiques recalculees pour ${selected.length} saison(s).`);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setComputing(false);
    }
  };

  return (
    <Dialog open={open} onClose={computing ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Calculer les statistiques</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Selectionnez une ou plusieurs saisons : les statistiques des joueurs seront recalculees
            a partir des compositions et des evenements des matchs, comme lors de l&apos;enregistrement d&apos;un match.
          </Typography>

          {loading ? (
            <Stack sx={{ alignItems: 'center', py: 3 }}><CircularProgress size={28} /></Stack>
          ) : (
            <List dense sx={{ maxHeight: 320, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
              {saisons.map((saison) => (
                <ListItemButton
                  key={saison}
                  onClick={() => toggleSaison(saison)}
                  disabled={computing}
                  dense
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox edge="start" checked={selected.includes(saison)} tabIndex={-1} disableRipple />
                  </ListItemIcon>
                  <ListItemText primary={saison} />
                </ListItemButton>
              ))}
            </List>
          )}

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={computing} color="inherit">Fermer</Button>
        <Button
          variant="contained"
          onClick={handleCompute}
          disabled={computing || selected.length === 0}
        >
          Calculer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
