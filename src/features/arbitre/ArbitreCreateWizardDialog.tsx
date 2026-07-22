import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItemButton, ListItemText, TextField, Typography } from '@mui/material';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { toErrorMessage } from '../../components/useEntityPage';
import { fetchNatio } from '../natio/natioApi';
import type { NatioRow } from '../natio/types';
import { fetchArbitreSuggestions } from './arbitreApi';
import type { ArbitreCreateWizardPayload, ArbitreSuggestionRow } from './types';

interface ArbitreCreateWizardDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: ArbitreCreateWizardPayload) => Promise<void>;
  onError: (message: string) => void;
}

export function ArbitreCreateWizardDialog({ open, onClose, onCreate, onError }: ArbitreCreateWizardDialogProps) {
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [natioId, setNatioId] = useState('');
  const [natioRows, setNatioRows] = useState<NatioRow[]>([]);
  const [suggestions, setSuggestions] = useState<ArbitreSuggestionRow[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSaving(false);
      setNom('');
      setPrenom('');
      setNatioId('');
      setNatioRows([]);
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
      void fetchArbitreSuggestions(query, controller.signal)
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

  const canGoNext = nom.trim().length > 0;
  const canCreate = nom.trim().length > 0 && natioId.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) {
      onError('Nom et nationalite sont requis.');
      return;
    }
    setSaving(true);
    try {
      await onCreate({ nom: nom.trim(), prenom: prenom.trim() || undefined, natioId: natioId.trim().toUpperCase() });
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
      <DialogTitle>Nouvel Arbitre</DialogTitle>
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
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, minHeight: 220, maxHeight: 220, overflowY: 'auto' }}>
              {loadingSuggestions ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1.25 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">Recherche en cours...</Typography>
                </Box>
              ) : suggestions.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 1.25 }}>
                  Aucun arbitre approchant trouve.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {suggestions.map((row) => (
                    <ListItemButton key={row.IDARBITRE} sx={{ py: 0.4 }}>
                      <ListItemText primary={`${String(row.NOM ?? '').toUpperCase()} ${String(row.PRENOM ?? '')} (${String(row.IDNATIO ?? '')})`} />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Box>
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
