import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { DEFAULT_NATIO_ID, NatioAutocomplete } from '../../components/NatioAutocomplete';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { CreateWizardSuggestionPanel } from '../../components/CreateWizardSuggestionPanel';
import { toErrorMessage } from '../../components/useEntityPage';
import { useDepsChanged } from '../../lib/useDepsChanged';
import { useNatioList } from '../natio/natioStore';
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
  const [natioId, setNatioId] = useState(DEFAULT_NATIO_ID);
  const { rows: natioRows } = useNatioList();
  const [suggestions, setSuggestions] = useState<ArbitreSuggestionRow[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Reset on close, while rendering, on the dependencies of the focus effect below.
  const openChanged = useDepsChanged([open]);
  if (openChanged && !open) {
    setStep(1);
    setSaving(false);
    setNom('');
    setPrenom('');
    setNatioId(DEFAULT_NATIO_ID);
    setSuggestions([]);
    setLoadingSuggestions(false);
  }

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 10);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open]);

  // An empty query clears the suggestions while rendering, on the dependencies of the search effect below.
  const suggestionDepsChanged = useDepsChanged([nom, onError, open, step]);
  if (suggestionDepsChanged && open && step === 1 && !nom.trim()) {
    setSuggestions([]);
    setLoadingSuggestions(false);
  }

  useEffect(() => {
    if (!open || step !== 1) return;

    const query = nom.trim();
    if (!query) return;

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
      // Always consume Enter here: this dialog is a MUI Portal, so React's synthetic
      // event would otherwise keep bubbling through the *component* tree into whatever
      // dialog/picker sits behind it in the DOM (e.g. a "Sélection d'un arbitre" modal),
      // validating its own selection.
      event.stopPropagation();

      const target = event.target as HTMLElement | null;
      if (target?.tagName.toLowerCase() === 'textarea') return;

      const comboBox = target?.closest('[role="combobox"]');
      if (comboBox?.getAttribute('aria-expanded') === 'true') {
        // An open dropdown (e.g. the nationality autocomplete) handles Enter itself
        // to select its highlighted option; don't also advance the wizard step.
        return;
      }

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
            <CreateWizardSuggestionPanel
              loading={loadingSuggestions}
              rows={suggestions}
              emptyText="Aucun arbitre approchant trouvé."
              getKey={(row) => row.IDARBITRE}
              getPrimaryText={(row) => `${String(row.NOM ?? '').toUpperCase()} ${String(row.PRENOM ?? '')} (${String(row.IDNATIO ?? '')})`}
            />
          ) : (
            <>
              <TextField
                label="Prénom"
                value={prenom}
                onChange={(event) => setPrenom(event.target.value)}
                fullWidth
                size="small"
              />

              <NatioAutocomplete
                natioDatas={natioRows}
                value={natioId}
                onChange={setNatioId}
                label="Nationalité"
              />
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>Annuler</Button>
        {step === 2 ? <Button onClick={() => setStep(1)} color="inherit" disabled={saving}>Précédent</Button> : null}
        <Button onClick={handlePrimary} variant="contained" disabled={saving || (step === 1 ? !canGoNext : !canCreate)}>
          {saving ? 'Enregistrement...' : step === 1 ? 'Suivant' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
