import {
  Box,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEntityImage } from '../../lib/useEntityImage';
import { EntityFormDialog } from '../../components/EntityFormDialog';
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
  primaryKey?: string;
  initialData?: EpreuveRow;
  onClose: () => void;
  onSubmit: (payload: EpreuveRow) => Promise<void>;
}

function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function EpreuveFormDialog({
  open,
  mode,
  primaryKey,
  initialData,
  onClose,
  onSubmit,
}: EpreuveFormDialogProps) {
  const [values, setValues] = useState<EpreuveRow>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newVisuelDataUrl, setNewVisuelDataUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const editId = mode === 'edit' ? (initialData?.IDEPREUVE as string | number | undefined) : undefined;
  const existingPhoto = useEntityImage('epreuve', editId);

  useEffect(() => {
    if (!open) {
      setNewVisuelDataUrl(null);
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
    setNewVisuelDataUrl(null);
  }, [open, initialData]);

  const isIdReadOnly = mode === 'edit' && !!primaryKey;

  const trophyPreview = useMemo(() => newVisuelDataUrl ?? existingPhoto.src ?? '', [newVisuelDataUrl, existingPhoto.src]);

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

  const handleVisuelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, EPR_VISUEL: 'Seulement les images (JPEG/PNG/SVG)' }));
      return;
    }
    setPhotoLoading(true);
    try {
      const dataUrl = await imageToDataUrl(file);
      setNewVisuelDataUrl(dataUrl);
      setErrors((prev) => ({ ...prev, EPR_VISUEL: '' }));
    } finally {
      setPhotoLoading(false);
    }
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
      if (newVisuelDataUrl) {
        payload.EPR_VISUEL = newVisuelDataUrl;
      }
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <EntityFormDialog
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Nouvelle Epreuve' : 'Modifier une Epreuve'}
      saving={saving}
      onSave={() => void handleSave()}
      maxWidth="lg"
    >
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
          <Box
            sx={{
              width: 180,
              height: 180,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'grey.100',
              overflow: 'hidden',
              display: 'grid',
              placeItems: 'center',
              position: 'relative',
            }}
          >
            {photoLoading || existingPhoto.loading ? (
              <EmojiEventsRoundedIcon sx={{ fontSize: 72, color: 'text.disabled' }} />
            ) : trophyPreview ? (
              <Box component="img" src={trophyPreview} alt="Visuel de l'épreuve" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <Stack spacing={0.5} sx={{ alignItems: 'center', color: 'text.disabled' }}>
                <EmojiEventsRoundedIcon sx={{ fontSize: 72 }} />
                <Box sx={{ fontSize: 12 }}>Trophée</Box>
              </Stack>
            )}

            <IconButton
              component="label"
              size="small"
              aria-label="Importer un visuel"
              disabled={photoLoading}
              sx={{ position: 'absolute', right: 8, bottom: 8, bgcolor: 'background.paper', boxShadow: 1 }}
            >
              <CloudUploadIcon fontSize="small" />
              <input ref={photoInputRef} type="file" hidden accept="image/*" onChange={(event) => void handleVisuelUpload(event)} />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ minWidth: 0, gridColumn: '2', gridRow: '1', alignSelf: 'start' }}>
          <Stack spacing={0.5} sx={{ width: 180, maxWidth: '100%' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.2 }}>
              IDEPREUVE
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
              label="Epreuve officielle"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(Number(values.EPR_PAYS))}
                  onChange={(e) => setValues((prev) => ({ ...prev, EPR_PAYS: e.target.checked ? 1 : 0 }))}
                />
              }
              label="Epreuve réservée aux équipes nationales"
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
    </EntityFormDialog>
  );
}