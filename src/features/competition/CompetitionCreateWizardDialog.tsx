import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Switch, TextField } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSaving(false);
      setEpreuveId('');
      setSaison('');
      setName('');
      setSameAsLastEdition(false);
      return;
    }

    setEpreuveId(epreuveOptions[0]?.IDEPREUVE ?? '');
    setSaison(saisonOptions[0]?.SAISON ?? '');
    setName('');
    setSameAsLastEdition(false);
  }, [open, epreuveOptions, saisonOptions]);

  const selectedEpreuveName = useMemo(() => {
    const selected = epreuveOptions.find((item) => item.IDEPREUVE === epreuveId);
    return String(selected?.EPREUVE ?? '').trim();
  }, [epreuveId, epreuveOptions]);

  useEffect(() => {
    if (step !== 2) return;
    if (!name.trim()) {
      setName(selectedEpreuveName);
    }
  }, [step, name, selectedEpreuveName]);

  const canGoNext = Number.isInteger(Number(epreuveId)) && Number(epreuveId) > 0 && saison.trim().length > 0;
  const canCreate = canGoNext && name.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) {
      onError('Epreuve, saison et nom sont requis.');
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
      <DialogTitle>Nouvelle Competition</DialogTitle>
      <DialogContent sx={{ p: 0, overflowX: 'hidden' }}>
        <Box sx={{ px: 3, pt: 1.5, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {step === 1 ? (
            <>
              <TextField
                select
                label="Epreuve"
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
                label="Nom de la competition"
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
          <Button onClick={() => setStep(1)} color="inherit" disabled={saving}>Precedent</Button>
        ) : null}
        {step === 1 ? (
          <Button onClick={() => {
            if (!canGoNext) {
              onError('Epreuve et saison requises.');
              return;
            }
            setStep(2);
          }} variant="contained" disabled={saving || !canGoNext}>
            Suivant
          </Button>
        ) : (
          <Button onClick={() => void handleCreate()} variant="contained" disabled={saving || !canCreate}>
            {saving ? 'Enregistrement...' : 'Creer'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
