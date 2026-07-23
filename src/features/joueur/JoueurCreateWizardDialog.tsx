import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { CreateWizardSuggestionPanel } from '../../components/CreateWizardSuggestionPanel';
import { toErrorMessage } from '../../components/useEntityPage';
import { fetchNatio } from '../natio/natioApi';
import type { NatioRow } from '../natio/types';
import { fetchJoueurPostes, fetchJoueurSuggestions } from './joueurApi';
import type { JoueurCreateWizardPayload, JoueurSuggestionRow, PosteOption } from './types';

interface JoueurCreateWizardDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: JoueurCreateWizardPayload) => Promise<void>;
  onError: (message: string) => void;
}

export function JoueurCreateWizardDialog({ open, onClose, onCreate, onError }: JoueurCreateWizardDialogProps) {
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [alias, setAlias] = useState('');
  const [posteId, setPosteId] = useState('');
  const [natioId, setNatioId] = useState('');
  const [natioRows, setNatioRows] = useState<NatioRow[]>([]);
  const [posteOptions, setPosteOptions] = useState<PosteOption[]>([]);
  const [suggestions, setSuggestions] = useState<JoueurSuggestionRow[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSaving(false);
      setNom('');
      setPrenom('');
      setAlias('');
      setPosteId('');
      setNatioId('');
      setNatioRows([]);
      setPosteOptions([]);
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    const timer = window.setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 10);

    const controller = new AbortController();
    void fetchNatio('', controller.signal)
      .then((result) => setNatioRows(result.data ?? []))
      .catch(() => {});

    void fetchJoueurPostes(controller.signal)
      .then((result) => setPosteOptions(result ?? []))
      .catch(() => {});

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open]);

  useEffect(() => {
    if (!open || step !== 1) return;

    const query = nom.trim();
    if (!query) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoadingSuggestions(true);
      void fetchJoueurSuggestions(query, controller.signal)
        .then((result) => setSuggestions(result.data ?? []))
        .catch((error: unknown) => {
          if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') return;
          onError(toErrorMessage(error));
        })
        .finally(() => setLoadingSuggestions(false));
    }, 320);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [nom, onError, open, step]);

  const countryOptions = natioRows
    .map((row) => ({ id: String(row.IDNATIO ?? row.ID ?? '').trim(), label: String(row.PAYS ?? row.NOM ?? '').trim() }))
    .filter((row) => row.id.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label));

  const posteSelectOptions = posteOptions
    .map((row) => ({ id: String(row.POS_ID), label: String(row.POS_NOM ?? '').trim() }))
    .filter((row) => row.id.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label));

  const canGoNext = nom.trim().length > 0;
  const canCreate = nom.trim().length > 0
    && natioId.trim().length > 0
    && posteId.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) {
      onError('Nom, nationalite et poste sont requis.');
      return;
    }
    setSaving(true);
    try {
      await onCreate({
        nom: nom.trim(),
        prenom: prenom.trim() || undefined,
        natioId: natioId.trim().toUpperCase(),
        posteId: Number(posteId),
        alias: alias.trim() || undefined,
      });
      onClose();
    } catch (error) {
      onError(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handlePrimary = () => {
    if (step === 1) {
      if (!canGoNext) {
        onError('Le nom est requis.');
        return;
      }
      setStep(2);
      return;
    }
    void handleCreate();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!saving) onClose();
      return;
    }
    if (event.key === 'Enter') {
      const target = event.target as HTMLElement | null;
      if (target?.tagName.toLowerCase() === 'textarea') return;
      event.preventDefault();
      if (!saving) handlePrimary();
    }
  };

  return (
    <Dialog open={open} onClose={() => { if (!saving) onClose(); }} fullWidth maxWidth="sm" onKeyDown={handleKeyDown}>
      <DialogTitle>Nouveau Joueur</DialogTitle>
      <DialogContent sx={{ p: 0, overflowX: 'hidden' }}>
        <Box sx={{ px: 3, pt: 1.5, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Nom"
            value={nom}
            onChange={(event) => setNom(event.target.value.toUpperCase())}
            inputRef={nameInputRef}
            fullWidth
            size="small"
            autoFocus
          />

          {step === 1 ? (
            <CreateWizardSuggestionPanel
              loading={loadingSuggestions}
              rows={suggestions}
              emptyText="Aucun joueur approchant trouve."
              getKey={(row) => row.IDJOUEUR}
              getPrimaryText={(row) => `${String(row.NOM ?? '').toUpperCase()} ${String(row.PRENOM ?? '')} (${String(row.IDNATIO ?? '')})`}
            />
          ) : (
            <>
              <TextField
                label="Prenom"
                value={prenom}
                onChange={(event) => setPrenom(event.target.value)}
                fullWidth
                size="small"
              />

              <TextField
                label="Alias"
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                fullWidth
                size="small"
                helperText="Non obligatoire. Si renseigne, le prenom peut rester vide."
              />

              <TextField
                select
                label="Nationalite"
                value={natioId}
                onChange={(event) => setNatioId(event.target.value)}
                fullWidth
                size="small"
                slotProps={{ select: { native: true } }}
              >
                <option value=""></option>
                {countryOptions.map((option) => (
                  <option key={option.id} value={option.id}>{`${option.label} (${option.id})`}</option>
                ))}
              </TextField>

              <TextField
                select
                label="Poste"
                value={posteId}
                onChange={(event) => setPosteId(event.target.value)}
                fullWidth
                size="small"
                required
                slotProps={{ select: { native: true } }}
              >
                <option value=""></option>
                {posteSelectOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </TextField>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>Annuler</Button>
        {step === 2 ? <Button onClick={() => setStep(1)} color="inherit" disabled={saving}>Precedent</Button> : null}
        <Button onClick={handlePrimary} variant="contained" disabled={saving || (step === 1 ? !canGoNext : !canCreate)}>
          {saving ? 'Enregistrement...' : step === 1 ? 'Suivant' : 'Creer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
