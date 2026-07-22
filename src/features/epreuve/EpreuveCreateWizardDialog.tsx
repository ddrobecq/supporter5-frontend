import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItemButton, ListItemText, TextField, Typography } from '@mui/material';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { toErrorMessage } from '../../components/useEntityPage';
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

  useEffect(() => {
    if (!open) {
      setName('');
      setSaving(false);
      setLoadingSuggestions(false);
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 10);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const query = name.trim();
    if (!query) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

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
      onError('Le nom de l epreuve est requis.');
      return;
    }

    setSaving(true);
    try {
      const created = await createEpreuveWithWizard({ name: name.trim() });
      const createdId = created?.IDEPREUVE;
      if (createdId === undefined || createdId === null || String(createdId).trim() === '') {
        onError('Creation reussie mais identifiant introuvable.');
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
      <DialogTitle>Nouvelle Epreuve</DialogTitle>
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

          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, minHeight: 220, maxHeight: 220, overflowY: 'auto' }}>
            {loadingSuggestions ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1.25 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">Recherche en cours...</Typography>
              </Box>
            ) : suggestions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 1.25 }}>
                Aucune epreuve approchante trouvee.
              </Typography>
            ) : (
              <List dense disablePadding>
                {suggestions.map((row) => (
                  <ListItemButton key={row.IDEPREUVE} sx={{ py: 0.4 }}>
                    <ListItemText primary={String(row.EPREUVE ?? '')} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>Annuler</Button>
        <Button onClick={() => void handleCreate()} variant="contained" disabled={saving || !canCreate}>
          {saving ? 'Enregistrement...' : 'Creer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
