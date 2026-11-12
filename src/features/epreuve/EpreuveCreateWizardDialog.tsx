import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { CreateWizardSuggestionPanel } from '../../components/CreateWizardSuggestionPanel';
import { toErrorMessage } from '../../components/useEntityPage';
import { useDepsChanged } from '../../lib/useDepsChanged';
import { createEpreuveWithWizard, fetchEpreuveSuggestions } from './epreuveApi';

interface EpreuveCreateWizardDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (createdId: string | number, label: string) => Promise<void> | void;
  onError: (message: string) => void;
}

export function EpreuveCreateWizardDialog({ open, onClose, onCreated, onError }: EpreuveCreateWizardDialogProps) {
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ IDEPREUVE: number; EPREUVE: string; SCORE: number }>>([]);

  // Reset on close, while rendering, on the dependencies of the focus effect below.
  const openChanged = useDepsChanged([open]);
  if (openChanged && !open) {
    setName('');
    setSaving(false);
    setLoadingSuggestions(false);
    setSuggestions([]);
  }

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 10);
    return () => window.clearTimeout(timer);
  }, [open]);

  // An empty query clears the suggestions while rendering, on the dependencies of the search effect below.
  const suggestionDepsChanged = useDepsChanged([name, onError, open]);
  if (suggestionDepsChanged && open && !name.trim()) {
    setSuggestions([]);
    setLoadingSuggestions(false);
  }

  useEffect(() => {
    if (!open) return;

    const query = name.trim();
    if (!query) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoadingSuggestions(true);
      void fetchEpreuveSuggestions(query, controller.signal)
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
  }, [name, onError, open]);

  const canCreate = name.trim().length > 0;

  const handleCreate = async () => {
    if (!canCreate) {
      onError("Le nom de l'épreuve est requis.");
      return;
    }

    setSaving(true);
    try {
      const created = await createEpreuveWithWizard({ name: name.trim() });
      const createdId = created?.IDEPREUVE;
      if (createdId === undefined || createdId === null || String(createdId).trim() === '') {
        onError('Création réussie mais identifiant introuvable.');
        return;
      }
      const label = String(created?.EPREUVE ?? '').trim() || name.trim();
      await onCreated(createdId, label);
      onClose();
    } catch (error) {
      onError(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
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
      if (!saving) void handleCreate();
    }
  };

  return (
    <Dialog open={open} onClose={() => { if (!saving) onClose(); }} fullWidth maxWidth="sm" onKeyDown={handleKeyDown}>
      <DialogTitle>Nouvelle Épreuve</DialogTitle>
      <DialogContent sx={{ p: 0, overflowX: 'hidden' }}>
        <Box sx={{ px: 3, pt: 1.5, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Nom"
            value={name}
            onChange={(event) => setName(event.target.value)}
            inputRef={nameInputRef}
            fullWidth
            size="small"
            autoFocus
          />

          <CreateWizardSuggestionPanel
            loading={loadingSuggestions}
            rows={suggestions}
            emptyText="Aucune épreuve approchante trouvée."
            getKey={(row) => row.IDEPREUVE}
            getPrimaryText={(row) => String(row.EPREUVE ?? '')}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>Annuler</Button>
        <Button onClick={() => void handleCreate()} variant="contained" disabled={saving || !canCreate}>
          {saving ? 'Enregistrement...' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
