import {
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import { useEffect, useMemo, useState } from 'react';
import { getEntityImageUrl, useEntityImage } from '../../lib/useEntityImage';
import { EntityFormDialog } from '../../components/EntityFormDialog';
import { EntityImageFrame } from '../../components/EntityImageFrame';
import type { EpreuveRow } from './types';

const SCOPE_OPTIONS = [
  { value: 1, label: 'Régionale ou amateur' },
  { value: 2, label: 'Championnat national' },
  { value: 3, label: 'Coupe nationale' },
  { value: 4, label: 'Compétitions européennes et intercontinentales' },
] as const;

interface EpreuveFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  embedded?: boolean;
  primaryKey?: string;
  initialData?: EpreuveRow;
  onClose: () => void;
  onSubmit: (payload: EpreuveRow) => Promise<void>;
}

export function EpreuveFormDialog({
  open,
  mode,
  embedded = false,
  primaryKey,
  initialData,
  onClose,
  onSubmit,
}: EpreuveFormDialogProps) {
  const [values, setValues] = useState<EpreuveRow>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [visuelDraft, setVisuelDraft] = useState<string | null | undefined>(undefined);

  const editId = mode === 'edit' ? (initialData?.IDEPREUVE as string | number | undefined) : undefined;
  const existingPhoto = useEntityImage('epreuve', editId);

  useEffect(() => {
    if (!open) {
      setVisuelDraft(undefined);
      return;
    }

    setValues({
      IDEPREUVE: initialData?.IDEPREUVE ?? '',
      EPREUVE: initialData?.EPREUVE ?? '',
      SCOPE: Number(initialData?.SCOPE ?? 1),
      OFFICIELLE: initialData?.OFFICIELLE ?? 0,
      EPR_VISUEL: initialData?.EPR_VISUEL ?? '',
      EPR_WEB: initialData?.EPR_WEB ?? '',
      EPR_PAYS: initialData?.EPR_PAYS ?? 0,
    });
    setErrors({});
    setVisuelDraft(undefined);
  }, [open, initialData]);

  const isIdReadOnly = mode === 'edit' && !!primaryKey;

  const directTrophyUrl = useMemo(() => {
    const hasId = editId !== null && editId !== undefined && String(editId).trim() !== '';
    return hasId ? getEntityImageUrl('epreuve', editId as string | number) : '';
  }, [editId]);

  const trophyPreview = useMemo(
    () => (visuelDraft === undefined ? (existingPhoto.src ?? directTrophyUrl) : visuelDraft),
    [visuelDraft, existingPhoto.src, directTrophyUrl],
  );

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    const id = String(values.IDEPREUVE ?? '').trim();
    const name = String(values.EPREUVE ?? '').trim();

    if (!id && mode === 'edit') nextErrors.IDEPREUVE = 'ID requis';
    if (!name) nextErrors.EPREUVE = 'Nom requis';
    if (![1, 2, 3, 4].includes(Number(values.SCOPE))) nextErrors.SCOPE = 'Type invalide';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: EpreuveRow = {
        ...values,
        IDEPREUVE: String(values.IDEPREUVE ?? '').trim() ? Number(values.IDEPREUVE) : values.IDEPREUVE,
        EPREUVE: String(values.EPREUVE ?? '').trim(),
        SCOPE: Number(values.SCOPE),
        OFFICIELLE: values.OFFICIELLE ? 1 : 0,
        EPR_PAYS: values.EPR_PAYS ? 1 : 0,
      };
      if (visuelDraft !== undefined) {
        payload.EPR_VISUEL = visuelDraft;
      }
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '180px minmax(0, 1fr)',
          columnGap: 2,
          rowGap: 2,
          alignItems: 'start',
          width: '100%',
        }}
      >
        <Box sx={{ width: 180, maxWidth: '100%', flexShrink: 0, gridColumn: '1', gridRow: '1' }}>
          <EntityImageFrame
            width={180}
            height={180}
            loading={visuelDraft === undefined && existingPhoto.loading}
            src={trophyPreview}
            alt="Visuel de l'épreuve"
            objectFit="contain"
            editable
            accept="image/*"
            onChangeImage={(nextValue) => {
              setVisuelDraft(nextValue);
              setErrors((prev) => ({ ...prev, EPR_VISUEL: '' }));
            }}
            onActionError={(message) => setErrors((prev) => ({ ...prev, EPR_VISUEL: message }))}
            actionLabels={{
              upload: 'Importer un visuel',
              paste: 'Coller un visuel depuis le presse-papiers',
              clear: 'Supprimer le visuel',
            }}
            sx={{ border: '1px solid', borderColor: 'divider' }}
            fallback={(
              <Stack spacing={0.5} sx={{ alignItems: 'center', color: 'text.disabled' }}>
                <EmojiEventsRoundedIcon sx={{ fontSize: 72 }} />
                <Box sx={{ fontSize: 12 }}>Trophée</Box>
              </Stack>
            )}
          />
        </Box>

        <Box sx={{ minWidth: 0, gridColumn: '2', gridRow: '1', alignSelf: 'start' }}>
          <Stack spacing={0.5} sx={{ width: 180, maxWidth: '100%' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.2 }}>
              IDÉPREUVE
            </Typography>
            <TextField
              value={String(values.IDEPREUVE ?? '')}
              onChange={(e) => setValues((prev) => ({ ...prev, IDEPREUVE: e.target.value }))}
              size="small"
              fullWidth
              disabled={isIdReadOnly}
              helperText={isIdReadOnly ? 'Auto-généré' : 'Code numérique'}
              error={Boolean(errors.IDEPREUVE)}
            />
          </Stack>
        </Box>

        <Box sx={{ minWidth: 0, gridColumn: '1 / -1', gridRow: '2' }}>
          <Stack spacing={2}>
            <TextField
              label="Nom de l'épreuve"
              value={String(values.EPREUVE ?? '')}
              onChange={(e) => setValues((prev) => ({ ...prev, EPREUVE: e.target.value }))}
              size="small"
              fullWidth
              error={Boolean(errors.EPREUVE)}
              helperText={errors.EPREUVE}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(Number(values.OFFICIELLE))}
                  onChange={(e) => setValues((prev) => ({ ...prev, OFFICIELLE: e.target.checked ? 1 : 0 }))}
                />
              }
              label="Épreuve officielle"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(Number(values.EPR_PAYS))}
                  onChange={(e) => setValues((prev) => ({ ...prev, EPR_PAYS: e.target.checked ? 1 : 0 }))}
                />
              }
              label="Épreuve réservée aux équipes nationales"
            />
            <TextField
              select
              label="Type"
              value={Number(values.SCOPE ?? 1)}
              onChange={(e) => setValues((prev) => ({ ...prev, SCOPE: Number(e.target.value) }))}
              size="small"
              fullWidth
              error={Boolean(errors.SCOPE)}
              helperText={errors.SCOPE}
            >
              {SCOPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Box>
      </Box>
    </>
  );

  if (embedded) {
    return (
      <Box sx={{ bgcolor: '#ffffff', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
        <Stack spacing={2}>
          {content}
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose} color="inherit">Annuler</Button>
            <Button onClick={() => void handleSave()} variant="contained" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    );
  }

  return (
    <EntityFormDialog
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Nouvelle Épreuve' : 'Modifier une Épreuve'}
      saving={saving}
      onSave={() => void handleSave()}
      maxWidth="lg"
    >
      {content}
    </EntityFormDialog>
  );
}