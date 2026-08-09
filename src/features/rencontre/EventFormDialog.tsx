import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import HealingRoundedIcon from '@mui/icons-material/HealingRounded';
import ReportRoundedIcon from '@mui/icons-material/ReportRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import SquareRoundedIcon from '@mui/icons-material/SquareRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import { NumberInputField } from '../../components/NumberInputField';
import { toErrorMessage } from '../../components/useEntityPage';
import { createRencontreEvent, updateRencontreEvent, type EventPayload, fetchRencontreSquad } from './rencontreApi';
import type { RencontreHighlightEventRow, SquadPlayerRow } from './types';

const PERIODE_OPTIONS = [
  { value: 1, label: '1ère mi-temps' },
  { value: 2, label: '2ème mi-temps' },
  { value: 3, label: 'Prolongations 1ère' },
  { value: 4, label: 'Prolongations 2ème' },
  { value: 5, label: 'Tirs au but' },
];

const TYPE_EVENT_OPTIONS: { value: number; label: string; icon: ReactElement; color: string }[] = [
  { value: 1, label: 'But',                         icon: <SportsSoccerRoundedIcon fontSize="small" />, color: '#0f766e' },
  { value: 2, label: 'Remplacement',                icon: <AutorenewRoundedIcon fontSize="small" />,    color: '#1d4ed8' },
  { value: 3, label: 'Carton Jaune',                icon: <SquareRoundedIcon fontSize="small" />,       color: '#eab308' },
  { value: 4, label: '2ème Jaune / Expulsion',      icon: <ReportRoundedIcon fontSize="small" />,       color: '#ea580c' },
  { value: 5, label: 'Carton Rouge',                icon: <SquareRoundedIcon fontSize="small" />,       color: '#dc2626' },
  { value: 6, label: 'Penalty sifflé',              icon: <FlagRoundedIcon fontSize="small" />,         color: '#7c3aed' },
  { value: 7, label: 'Penalty marqué',              icon: <TaskAltRoundedIcon fontSize="small" />,      color: '#16a34a' },
  { value: 8, label: 'Penalty manqué',              icon: <CancelRoundedIcon fontSize="small" />,       color: '#b91c1c' },
  { value: 9, label: 'Blessure',                    icon: <HealingRoundedIcon fontSize="small" />,      color: '#be185d' },
];

function getAutoPeriode(min: number): number {
  if (min <= 45) return 1;
  if (min <= 90) return 2;
  if (min <= 105) return 3;
  return 4;
}

function joueur1Label(typeEvent: number): string {
  if (typeEvent === 2) return 'Joueur sortant';
  if (typeEvent === 9) return 'Joueur blessé';
  return 'Action réalisée par';
}

function joueur2Label(typeEvent: number): string {
  if (typeEvent === 2) return 'Joueur entrant';
  return 'Passe décisive de';
}

function showJoueur2(typeEvent: number): boolean {
  return typeEvent === 1 || typeEvent === 2;
}

function getEventDraftSignature(values: {
  adversaire: boolean;
  minute: string;
  periode: number;
  typeEvent: number;
  joueur1Id: string;
  joueur2Id: string;
  comment: string;
}): string {
  return JSON.stringify({
    adversaire: values.adversaire,
    minute: String(values.minute ?? '').trim(),
    periode: Number(values.periode ?? 0),
    typeEvent: Number(values.typeEvent ?? 0),
    joueur1Id: String(values.joueur1Id ?? '').trim(),
    joueur2Id: String(values.joueur2Id ?? '').trim(),
    comment: String(values.comment ?? '').trim(),
  });
}

export interface EventFormDialogActions {
  save: () => Promise<boolean>;
  reset: () => void;
  isSaving: () => boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (highlights: import('./types').RencontreHighlightsRow) => void;
  rencontreId: string;
  event?: RencontreHighlightEventRow | null;
  onDirtyChange?: (dirty: boolean) => void;
  actionsRef?: React.MutableRefObject<EventFormDialogActions | null>;
}

export function EventFormDialog({ open, onClose, onSaved, rencontreId, event, onDirtyChange, actionsRef }: Props) {
  const isEdit = event != null;

  const [adversaire, setAdversaire] = useState(false);
  const [minute, setMinute] = useState('');
  const [periode, setPeriode] = useState(1);
  const [typeEvent, setTypeEvent] = useState(1);
  const [joueur1, setJoueur1] = useState<SquadPlayerRow | null>(null);
  const [joueur2, setJoueur2] = useState<SquadPlayerRow | null>(null);
  const [comment, setComment] = useState('');
  const [squad, setSquad] = useState<SquadPlayerRow[]>([]);
  const [squadLoading, setSquadLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adversaireRef = useRef<HTMLInputElement>(null);
  const initialSignatureRef = useRef('');
  const savingRef = useRef(false);

  // Load squad on open
  useEffect(() => {
    if (!open) return;
    setSquadLoading(true);
    void fetchRencontreSquad(rencontreId)
      .then((data) => setSquad(data.filter((p) => p.POS_TYPE === 1)))
      .catch(() => setSquad([]))
      .finally(() => setSquadLoading(false));
  }, [open, rencontreId]);

  // Populate form when editing
  useEffect(() => {
    if (!open) return;
    if (event) {
      setAdversaire(event.ADVERSAIRE === 1);
      setMinute(String(event.MINUTE ?? ''));
      setPeriode(event.PERIODE ?? 1);
      setTypeEvent(event.TYPE_EVENT ?? 1);
      setComment(event.COMMENT ?? '');
      initialSignatureRef.current = getEventDraftSignature({
        adversaire: event.ADVERSAIRE === 1,
        minute: String(event.MINUTE ?? ''),
        periode: event.PERIODE ?? 1,
        typeEvent: event.TYPE_EVENT ?? 1,
        joueur1Id: String(event.JOUEUR1 ?? ''),
        joueur2Id: String(event.JOUEUR2 ?? ''),
        comment: String(event.COMMENT ?? ''),
      });
      // joueur1/2 resolved after squad loads
    } else {
      setAdversaire(false);
      setMinute('');
      setPeriode(1);
      setTypeEvent(1);
      setJoueur1(null);
      setJoueur2(null);
      setComment('');
      setError(null);
      initialSignatureRef.current = getEventDraftSignature({
        adversaire: false,
        minute: '',
        periode: 1,
        typeEvent: 1,
        joueur1Id: '',
        joueur2Id: '',
        comment: '',
      });
    }
  }, [open, event]);

  // Resolve player objects once squad is loaded
  useEffect(() => {
    if (!event || squad.length === 0) return;
    setJoueur1(squad.find((p) => p.IDJOUEUR === event.JOUEUR1) ?? null);
    setJoueur2(squad.find((p) => p.IDJOUEUR === event.JOUEUR2) ?? null);
  }, [event, squad]);

  const isDirty = open && getEventDraftSignature({
    adversaire,
    minute,
    periode,
    typeEvent,
    joueur1Id: joueur1?.IDJOUEUR ?? '',
    joueur2Id: joueur2?.IDJOUEUR ?? '',
    comment,
  }) !== initialSignatureRef.current;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const playerLabel = (p: SquadPlayerRow) =>
    p.SURNOM?.trim() || `${p.NOM} ${p.PRENOM}`.trim();

  const handleSave = async (): Promise<boolean> => {
    const min = parseInt(minute, 10);
    if (!Number.isFinite(min) || min < 0) {
      setError('La minute doit être un nombre positif.');
      return false;
    }
    const payload: EventPayload = {
      adversaire: adversaire ? 1 : 0,
      minute: min,
      periode,
      typeEvent,
      joueur1: adversaire ? null : (joueur1?.IDJOUEUR ?? null),
      joueur2: adversaire ? null : (joueur2?.IDJOUEUR ?? null),
      comment: comment.trim() || null,
    };
    setSaving(true);
    savingRef.current = true;
    setError(null);
    try {
      const result = isEdit
        ? await updateRencontreEvent(rencontreId, event!.EVCLEUNIK, payload)
        : await createRencontreEvent(rencontreId, payload);
      initialSignatureRef.current = getEventDraftSignature({
        adversaire,
        minute,
        periode,
        typeEvent,
        joueur1Id: joueur1?.IDJOUEUR ?? '',
        joueur2Id: joueur2?.IDJOUEUR ?? '',
        comment,
      });
      onSaved(result);
      onClose();
      return true;
    } catch (err) {
      setError(toErrorMessage(err));
      return false;
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const handleReset = () => {
    if (event) {
      setAdversaire(event.ADVERSAIRE === 1);
      setMinute(String(event.MINUTE ?? ''));
      setPeriode(event.PERIODE ?? 1);
      setTypeEvent(event.TYPE_EVENT ?? 1);
      setComment(event.COMMENT ?? '');
      setJoueur1(squad.find((p) => p.IDJOUEUR === event.JOUEUR1) ?? null);
      setJoueur2(squad.find((p) => p.IDJOUEUR === event.JOUEUR2) ?? null);
      return;
    }

    setAdversaire(false);
    setMinute('');
    setPeriode(1);
    setTypeEvent(1);
    setJoueur1(null);
    setJoueur2(null);
    setComment('');
    setError(null);
  };

  useEffect(() => {
    if (!actionsRef) return;
    actionsRef.current = {
      save: handleSave,
      reset: handleReset,
      isSaving: () => savingRef.current,
    };
  });

  // Focus adversaire checkbox on open
  useEffect(() => {
    if (open) {
      setTimeout(() => adversaireRef.current?.focus(), 0);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Modifier l\'événement' : 'Ajouter un événement'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <Typography color="error" variant="body2">{error}</Typography> : null}

          <FormControlLabel
            control={<Checkbox checked={adversaire} onChange={(e) => setAdversaire(e.target.checked)} slotProps={{ input: { ref: adversaireRef } }} />}
            label="Action concernant l'adversaire"
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <NumberInputField
              label="Minute de jeu"
              value={minute}
              onChange={(v) => {
                const val = v == null ? '' : String(v);
                setMinute(val);
                if (v != null && v > 0) setPeriode(getAutoPeriode(v));
              }}
              min={0}
              max={130}
            />
            <FormControl fullWidth>
              <InputLabel>Comptant pour</InputLabel>
              <Select value={periode} label="Comptant pour" onChange={(e) => setPeriode(Number(e.target.value))}>
                {PERIODE_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <FormControl fullWidth>
            <InputLabel>Type d'événement</InputLabel>
            <Select value={typeEvent} label="Type d'événement" onChange={(e) => setTypeEvent(Number(e.target.value))}>
              {TYPE_EVENT_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: o.color, display: 'flex', alignItems: 'center' }}>{o.icon}</Box>
                    {o.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!adversaire ? (
            <>
              <Autocomplete
                options={squad}
                loading={squadLoading}
                value={joueur1}
                onChange={(_, v) => setJoueur1(v)}
                getOptionLabel={playerLabel}
                isOptionEqualToValue={(a, b) => a.IDJOUEUR === b.IDJOUEUR}
                renderInput={(params) => (
                  <TextField {...params} label={joueur1Label(typeEvent)} />
                )}
              />
              {showJoueur2(typeEvent) ? (
                <Autocomplete
                  options={squad}
                  loading={squadLoading}
                  value={joueur2}
                  onChange={(_, v) => setJoueur2(v)}
                  getOptionLabel={playerLabel}
                  isOptionEqualToValue={(a, b) => a.IDJOUEUR === b.IDJOUEUR}
                  renderInput={(params) => (
                    <TextField {...params} label={joueur2Label(typeEvent)} />
                  )}
                />
              ) : null}
            </>
          ) : null}

          <TextField
            label="Commentaires"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            multiline
            minRows={2}
            maxRows={5}
            slotProps={{ htmlInput: { lang: 'fr', spellCheck: true } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={saving}>Annuler</Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
