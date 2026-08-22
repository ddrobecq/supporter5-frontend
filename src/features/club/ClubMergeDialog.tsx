import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { ClubSelectField } from '../../components/ClubSelectField';
import { toErrorMessage } from '../../components/useEntityPage';
import { mergeClubs } from './clubApi';

interface ClubRef {
  clubId: string;
  clubName: string;
}

const EMPTY_CLUB: ClubRef = { clubId: '', clubName: '' };

interface ClubMergeDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Outils > Clubs > Fusionner : reaffecte RENCO/PARTICIP du club source vers le club cible puis supprime le club source. */
export function ClubMergeDialog({ open, onClose }: ClubMergeDialogProps) {
  const [source, setSource] = useState<ClubRef>(EMPTY_CLUB);
  const [target, setTarget] = useState<ClubRef>(EMPTY_CLUB);
  const [confirming, setConfirming] = useState(false);
  const [merging, setMerging] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setSource(EMPTY_CLUB);
    setTarget(EMPTY_CLUB);
    setConfirming(false);
    setMerging(false);
    setErrorMessage('');
    setSuccessMessage('');
  }, [open]);

  const sameClub = Boolean(source.clubId) && source.clubId === target.clubId;
  const canMerge = Boolean(source.clubId) && Boolean(target.clubId) && !sameClub;

  const handleMerge = async () => {
    if (!canMerge) return;
    setMerging(true);
    setErrorMessage('');
    try {
      const result = await mergeClubs(source.clubId, target.clubId);
      setSuccessMessage(
        `Fusion effectuee : ${result.rencontresDomicile + result.rencontresExterieur} rencontre(s) et `
        + `${result.participations} participation(s) reaffectees, club source supprime.`,
      );
      setConfirming(false);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
      setConfirming(false);
    } finally {
      setMerging(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={merging ? undefined : onClose} fullWidth maxWidth="sm">
        <DialogTitle>Fusionner deux clubs</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Les rencontres et les classements du club source seront attribués au club cible,
              puis le club source sera supprimé.
            </Typography>

            <ClubSelectField
              label="Club source (sera supprimé)"
              clubId={source.clubId}
              clubName={source.clubName}
              onChange={(next) => {
                setSource(next);
                setSuccessMessage('');
                setErrorMessage('');
              }}
              required
              disabled={merging}
            />

            <ClubSelectField
              label="Club cible (conservé)"
              clubId={target.clubId}
              clubName={target.clubName}
              onChange={(next) => {
                setTarget(next);
                setSuccessMessage('');
                setErrorMessage('');
              }}
              required
              disabled={merging}
            />

            {sameClub ? (
              <Alert severity="warning">Le club source et le club cible doivent être différents.</Alert>
            ) : null}
            {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
            {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={merging} color="inherit">Fermer</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => setConfirming(true)}
            disabled={!canMerge || merging}
          >
            Fusionner
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirming} onClose={merging ? undefined : () => setConfirming(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmer la fusion</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            {`Fusionner "${source.clubName || source.clubId}" dans "${target.clubName || target.clubId}" ? `}
            Cette opération est irréversible : le club source et son historique de noms et de stades seront supprimés.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)} disabled={merging} color="inherit">Annuler</Button>
          <Button variant="contained" color="warning" onClick={handleMerge} disabled={merging}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
