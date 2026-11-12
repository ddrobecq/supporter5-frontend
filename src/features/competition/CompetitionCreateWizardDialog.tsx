import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Switch, TextField } from '@mui/material';
import { useMemo, useState } from 'react';
import { useDepsChanged } from '../../lib/useDepsChanged';
import type { CompetitionCreateWizardPayload, EpreuveOption, SaisonOption } from './types';

interface CompetitionCreateWizardDialogProps {
  open: boolean;
  epreuveOptions: EpreuveOption[];
  saisonOptions: SaisonOption[];
  onClose: () => void;
  onCreate: (payload: CompetitionCreateWizardPayload) => Promise<void>;
  onError: (message: string) => void;
}

export function CompetitionCreateWizardDialog({
  open,
  epreuveOptions,
  saisonOptions,
  onClose,
  onCreate,
  onError,
}: CompetitionCreateWizardDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [epreuveId, setEpreuveId] = useState<number | ''>('');
  const [saison, setSaison] = useState('');
  const [name, setName] = useState('');
  const [sameAsLastEdition, setSameAsLastEdition] = useState(false);

  // (Re)initialisation while rendering: reset on close, defaults on open or when the options change.
  const initDepsChanged = useDepsChanged([open, epreuveOptions, saisonOptions]);
  if (initDepsChanged) {
    if (!open) {
      setStep(1);
      setSaving(false);
      setEpreuveId('');
      setSaison('');
      setName('');
      setSameAsLastEdition(false);
    } else {
      setEpreuveId(epreuveOptions[0]?.IDEPREUVE ?? '');
      setSaison(saisonOptions[0]?.SAISON ?? '');
      setName('');
      setSameAsLastEdition(false);
    }
  }

  const selectedEpreuveName = useMemo(() => {
    const selected = epreuveOptions.find((item) => item.IDEPREUVE === epreuveId);
    return String(selected?.EPREUVE ?? '').trim();
  }, [epreuveId, epreuveOptions]);

  // An empty name on step 2 defaults to the selected epreuve name (adjusted while rendering).
  if (step === 2 && !name.trim() && name !== selectedEpreuveName) {
    setName(selectedEpreuveName);
  }

  const canGoNext = Number.isInteger(Number(epreuveId)) && Number(epreuveId) > 0 && saison.trim().length > 0;
  const canCreate = canGoNext && name.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) {
      onError('Épreuve, saison et nom sont requis.');
      return;
    }

    setSaving(true);
    try {
      await onCreate({
        epreuveId: Number(epreuveId),
        saison: saison.trim(),
        name: name.trim(),
        sameAsLastEdition,
      });
      onClose();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => { if (!saving) onClose(); }} fullWidth maxWidth="sm">
      <DialogTitle>Nouvelle Compétition</DialogTitle>
      <DialogContent sx={{ p: 0, overflowX: 'hidden' }}>
        <Box sx={{ px: 3, pt: 1.5, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {step === 1 ? (
            <>
              <TextField
                select
                label="Épreuve"
                value={epreuveId}
                onChange={(event) => setEpreuveId(Number(event.target.value))}
                fullWidth
                size="small"
              >
                {epreuveOptions.map((option) => (
                  <MenuItem key={option.IDEPREUVE} value={option.IDEPREUVE}>
                    {option.EPREUVE}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Saison"
                value={saison}
                onChange={(event) => setSaison(event.target.value)}
                fullWidth
                size="small"
              >
                {saisonOptions.map((option) => (
                  <MenuItem key={option.SAISON} value={option.SAISON}>
                    {option.SAISON}
                  </MenuItem>
                ))}
              </TextField>
            </>
          ) : (
            <>
              <TextField
                label="Nom de la compétition"
                value={name}
                onChange={(event) => setName(event.target.value)}
                fullWidth
                size="small"
              />
              <FormControlLabel
                control={(
                  <Switch
                    checked={sameAsLastEdition}
                    onChange={(event) => setSameAsLastEdition(event.target.checked)}
                  />
                )}
                label="Même format que la dernière édition"
              />
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>Annuler</Button>
        {step === 2 ? (
          <Button onClick={() => setStep(1)} color="inherit" disabled={saving}>Précédent</Button>
        ) : null}
        {step === 1 ? (
          <Button onClick={() => {
            if (!canGoNext) {
              onError('Épreuve et saison requises.');
              return;
            }
            setStep(2);
          }} variant="contained" disabled={saving || !canGoNext}>
            Suivant
          </Button>
        ) : (
          <Button onClick={() => void handleCreate()} variant="contained" disabled={saving || !canCreate}>
            {saving ? 'Enregistrement...' : 'Créer'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
