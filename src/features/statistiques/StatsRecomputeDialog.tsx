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
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { http } from '../../lib/http';
import { toErrorMessage } from '../../components/useEntityPage';
import { useDepsChanged } from '../../lib/useDepsChanged';
import { fetchSaisons } from '../joueur/joueurApi';

type ClickModifiers = { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean };

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
  // Indexes in display order (the reference for ranges).
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reset on open, while rendering, on the dependencies of the load effect below.
  const openChanged = useDepsChanged([open]);
  if (openChanged && open) {
    setSelected([]);
    setAnchorIndex(null);
    setFocusIndex(0);
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
  }

  useEffect(() => {
    if (!open) return;

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

  const applySelection = (next: Set<string>) => {
    setSuccessMessage('');
    setSelected(saisons.filter((saison) => next.has(saison)));
  };

  const focusItem = (index: number) => {
    setFocusIndex(index);
    const element = itemRefs.current[index];
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: 'nearest' });
  };

  const toggleAt = (index: number) => {
    const next = new Set(selected);
    if (next.has(saisons[index])) next.delete(saisons[index]);
    else next.add(saisons[index]);
    applySelection(next);
    setAnchorIndex(index);
  };

  /** Selects anchor..index (display order); additive keeps the current selection. */
  const selectRange = (index: number, additive: boolean, fallbackAnchor: number) => {
    const from = anchorIndex ?? fallbackAnchor;
    const next = additive ? new Set(selected) : new Set<string>();
    saisons.slice(Math.min(from, index), Math.max(from, index) + 1).forEach((saison) => next.add(saison));
    setAnchorIndex(from);
    applySelection(next);
  };

  /** Explorer-like click: plain = only this one, Ctrl/Cmd or checkbox = toggle, Shift = range. */
  const handleItemClick = (index: number, event: ClickModifiers, fromCheckbox = false) => {
    const toggle = fromCheckbox || event.ctrlKey || event.metaKey;
    if (event.shiftKey) {
      selectRange(index, toggle, index);
    } else if (toggle) {
      toggleAt(index);
    } else {
      applySelection(new Set([saisons[index]]));
      setAnchorIndex(index);
    }
    focusItem(index);
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (computing || saisons.length === 0) return;
    const ctrl = event.ctrlKey || event.metaKey;
    const last = saisons.length - 1;
    let target: number;
    switch (event.key) {
      case 'ArrowDown': target = Math.min(focusIndex + 1, last); break;
      case 'ArrowUp': target = Math.max(focusIndex - 1, 0); break;
      case 'Home': target = 0; break;
      case 'End': target = last; break;
      case ' ':
        event.preventDefault();
        if (!event.repeat) toggleAt(focusIndex);
        return;
      case 'a':
      case 'A':
        if (!ctrl) return;
        event.preventDefault();
        applySelection(new Set(saisons));
        return;
      default:
        return;
    }
    event.preventDefault();
    if (event.shiftKey) selectRange(target, ctrl, focusIndex);
    focusItem(target);
  };

  const handleCompute = async () => {
    if (selected.length === 0) return;
    setComputing(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await http.post('/api/admin/stats/recompute', { saisons: selected });
      setSuccessMessage(`Statistiques recalculées pour ${selected.length} saison(s).`);
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
            Sélectionnez une ou plusieurs saisons : les statistiques des joueurs seront recalculées
            à partir des compositions et des événements des matchs, comme lors de l&apos;enregistrement d&apos;un match.
          </Typography>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button
              size="small"
              onClick={() => applySelection(new Set(saisons))}
              disabled={loading || computing || saisons.length === 0}
            >
              Tout sélectionner
            </Button>
            <Button
              size="small"
              onClick={() => applySelection(new Set())}
              disabled={loading || computing || selected.length === 0}
            >
              Aucune
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
              {selected.length} saison(s) sélectionnée(s)
            </Typography>
          </Stack>

          {loading ? (
            <Stack sx={{ alignItems: 'center', py: 3 }}><CircularProgress size={28} /></Stack>
          ) : (
            <List
              dense
              role="listbox"
              aria-label="Saisons"
              aria-multiselectable="true"
              onKeyDown={handleListKeyDown}
              sx={{ maxHeight: 320, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}
            >
              {saisons.map((saison, index) => (
                <ListItemButton
                  key={saison}
                  ref={(element: HTMLDivElement | null) => { itemRefs.current[index] = element; }}
                  role="option"
                  aria-selected={selected.includes(saison)}
                  selected={selected.includes(saison)}
                  tabIndex={index === focusIndex ? 0 : -1}
                  onFocus={() => setFocusIndex(index)}
                  // Shift+click: keep the browser from selecting text.
                  onMouseDown={(event) => { if (event.shiftKey) event.preventDefault(); }}
                  // Space is handled by the list (toggle); keep ButtonBase from turning it into a plain click.
                  onKeyUp={(event) => { if (event.key === ' ') event.preventDefault(); }}
                  onClick={(event) => handleItemClick(index, event)}
                  disabled={computing}
                  dense
                  sx={{ '&.Mui-focusVisible': { outline: 2, outlineColor: 'primary.main', outlineOffset: -2 } }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox
                      edge="start"
                      checked={selected.includes(saison)}
                      tabIndex={-1}
                      disableRipple
                      onClick={(event) => {
                        event.stopPropagation();
                        handleItemClick(index, event, true);
                      }}
                    />
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
