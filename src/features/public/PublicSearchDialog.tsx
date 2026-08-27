import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { CircularProgress, Dialog, DialogContent, DialogTitle, List, ListItemButton, ListItemText, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { fetchClubSuggestions } from '../club/clubApi';
import { fetchCompetition } from '../competition/competitionApi';
import { fetchJoueurSuggestions } from '../joueur/joueurApi';

interface PublicSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

type SearchKind = 'joueur' | 'club' | 'compet';

export function PublicSearchDialog({ open, onClose, onNavigate }: PublicSearchDialogProps) {
  const [kind, setKind] = useState<SearchKind>('joueur');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; label: string; detail?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    const search = query.trim();
    const request = kind === 'joueur'
      ? fetchJoueurSuggestions(search, controller.signal).then((response) => response.data.map((row) => ({ id: row.IDJOUEUR, label: `${row.NOM} ${row.PRENOM}`.trim() })))
      : kind === 'club'
        ? fetchClubSuggestions(search, controller.signal).then((response) => response.data.map((row) => ({ id: row.IDCLUB, label: row.CLUB_NOM_COMPLET, detail: row.CLUB_ABREGE })))
        : fetchCompetition(search, undefined, controller.signal).then((response) => response.data.map((row) => ({ id: String(row.COCLEUNIK ?? ''), label: String(row.NOM ?? ''), detail: String(row.SAISON ?? '') })));
    void request.then(setResults).catch(() => setResults([])).finally(() => setLoading(false));
    return () => controller.abort();
  }, [kind, open, query]);

  const choose = (result: { id: string }) => {
    const prefix = kind === 'club' ? '/clubs' : kind === 'joueur' ? '/joueurs' : '/competitions';
    onNavigate(`${prefix}/${encodeURIComponent(result.id)}`);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            height: 'min(90vh, 980px)',
            maxHeight: 'calc(100% - 32px)',
          },
        },
      }}
    >
      <DialogTitle>Rechercher</DialogTitle>
      <DialogContent sx={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Stack spacing={2} sx={{ pt: 1, minHeight: 0, flex: 1 }}>
          <ToggleButtonGroup exclusive value={kind} onChange={(_event, value: SearchKind | null) => { if (value) setKind(value); }} fullWidth size="small">
            <ToggleButton value="joueur">Joueur</ToggleButton>
            <ToggleButton value="club">Club</ToggleButton>
            <ToggleButton value="compet">Compet</ToggleButton>
          </ToggleButtonGroup>
          <TextField inputRef={searchInputRef} autoFocus fullWidth label="Recherche" placeholder="Deux caractères minimum" value={query} onChange={(event) => setQuery(event.target.value)} slotProps={{ input: { startAdornment: <SearchRoundedIcon sx={{ mr: 1, color: 'text.secondary' }} /> } }} />
          {loading ? <Stack sx={{ alignItems: 'center', py: 2 }}><CircularProgress size={24} /></Stack> : null}
          {!loading && query.trim().length >= 2 && results.length === 0 ? <Typography color="text.secondary">Aucun résultat.</Typography> : null}
          <List dense disablePadding sx={{ minHeight: 0, overflowY: 'auto', flex: 1 }}>
            {results.map((result) => <ListItemButton key={result.id} onClick={() => choose(result)}><ListItemText primary={result.label} secondary={result.detail} /></ListItemButton>)}
          </List>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
