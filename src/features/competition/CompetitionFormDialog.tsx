import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityFormDialog } from '../../components/EntityFormDialog';
import { EntityImageFrame } from '../../components/EntityImageFrame';
import { getEntityImageUrl, useEntityImage } from '../../lib/useEntityImage';
import { useDirtySignature } from '../../lib/useDirtySignature';
import type { EpreuveOption, CompetitionRow, SaisonOption } from './types';

interface CompetitionFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  embedded?: boolean;
  primaryKey?: string;
  initialData?: CompetitionRow;
  epreuveOptions: EpreuveOption[];
  saisonOptions: SaisonOption[];
  onDirtyChange?: (dirty: boolean) => void;
  onClose: () => void;
  onSubmit: (payload: CompetitionRow) => Promise<void>;
  saveCount?: number;
}

export function CompetitionFormDialog({
  open,
  mode,
  embedded = false,
  primaryKey,
  initialData,
  epreuveOptions,
  saisonOptions,
  onDirtyChange,
  onClose,
  onSubmit,
  saveCount = 0,
}: CompetitionFormDialogProps) {
  const [values, setValues] = useState<CompetitionRow>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoDraft, setLogoDraft] = useState<string | null | undefined>(undefined);
  const [imageRefreshToken, setImageRefreshToken] = useState(0);
  const { setInitialSignature, syncDirty, markClean } = useDirtySignature(open, onDirtyChange);

  const editId = mode === 'edit' ? (initialData?.COCLEUNIK as string | number | undefined) : undefined;
  const existingLogo = useEntityImage('competition', editId, imageRefreshToken);

  useEffect(() => {
    if (!open) {
      setLogoDraft(undefined);
      return;
    }

    const defaultSaison = saisonOptions[0]?.SAISON ?? '';

    setValues({
      COCLEUNIK: initialData?.COCLEUNIK ?? '',
      IDEPREUVE: Number(initialData?.IDEPREUVE ?? 0) || '',
      NOM: initialData?.NOM ?? '',
      SAISON: initialData?.SAISON ?? defaultSaison,
      CO_ANNEE: Number(initialData?.CO_ANNEE ?? 0),
      CO_WEB: initialData?.CO_WEB ?? '',
      CO_COMMENT: initialData?.CO_COMMENT ?? '',
      LOGO: initialData?.LOGO ?? '',
    });
    setErrors({});
    setLogoDraft(undefined);
    setInitialSignature(JSON.stringify({
      COCLEUNIK: initialData?.COCLEUNIK ?? '',
      IDEPREUVE: Number(initialData?.IDEPREUVE ?? 0) || '',
      NOM: initialData?.NOM ?? '',
      SAISON: initialData?.SAISON ?? defaultSaison,
      CO_ANNEE: Number(initialData?.CO_ANNEE ?? 0),
      CO_WEB: initialData?.CO_WEB ?? '',
      CO_COMMENT: initialData?.CO_COMMENT ?? '',
      LOGO: '',
    }));
  }, [open, initialData, saisonOptions]);

  useEffect(() => {
    const currentSignature = JSON.stringify({
      COCLEUNIK: values.COCLEUNIK ?? '',
      IDEPREUVE: Number(values.IDEPREUVE ?? 0) || '',
      NOM: values.NOM ?? '',
      SAISON: values.SAISON ?? '',
      CO_ANNEE: Number(values.CO_ANNEE ?? 0),
      CO_WEB: values.CO_WEB ?? '',
      CO_COMMENT: values.CO_COMMENT ?? '',
      LOGO: logoDraft === undefined ? '' : logoDraft,
    });
    syncDirty(currentSignature);
  }, [logoDraft, syncDirty, values]);

  const isIdReadOnly = mode === 'edit' && !!primaryKey;

  const directLogoUrl = useMemo(() => {
    const hasId = editId !== null && editId !== undefined && String(editId).trim() !== '';
    return hasId ? getEntityImageUrl('competition', editId as string | number) : '';
  }, [editId]);

  const logoPreview = useMemo(
    () => (logoDraft === undefined ? (existingLogo.src ?? directLogoUrl) : logoDraft),
    [logoDraft, existingLogo.src, directLogoUrl],
  );

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    const nom = String(values.NOM ?? '').trim();
    const saison = String(values.SAISON ?? '').trim();
    const epreuveId = Number(values.IDEPREUVE);
    const site = String(values.CO_WEB ?? '').trim();

    if (!nom) nextErrors.NOM = 'Nom requis';
    if (!saison) nextErrors.SAISON = 'Saison requise';
    if (!Number.isInteger(epreuveId) || epreuveId <= 0) nextErrors.IDEPREUVE = 'Epreuve requise';
    if (site) {
      try {
        const parsed = new URL(site);
        if (!parsed.hostname || parsed.protocol !== 'https:') {
          nextErrors.CO_WEB = 'URL invalide';
        }
      } catch {
        nextErrors.CO_WEB = 'URL invalide';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const payload: CompetitionRow = {
        ...values,
        COCLEUNIK: String(values.COCLEUNIK ?? '').trim() ? Number(values.COCLEUNIK) : values.COCLEUNIK,
        IDEPREUVE: Number(values.IDEPREUVE),
        NOM: String(values.NOM ?? '').trim(),
        SAISON: String(values.SAISON ?? '').trim(),
        CO_ANNEE: values.CO_ANNEE ? 1 : 0,
        CO_WEB: String(values.CO_WEB ?? '').trim(),
        CO_COMMENT: String(values.CO_COMMENT ?? '').trim(),
      };
      if (logoDraft !== undefined) {
        payload.LOGO = logoDraft;
      }
      await onSubmit(payload);
      if (mode === 'edit' && logoDraft !== undefined) {
        setLogoDraft(undefined);
        setImageRefreshToken((prev) => prev + 1);
      }
      markClean();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  useEffect(() => { if (saveCount > 0) void handleSaveRef.current(); }, [saveCount]);

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
            loading={logoDraft === undefined && existingLogo.loading}
            src={logoPreview}
            alt="Logo de la competition"
            objectFit="contain"
            editable
            accept="image/*"
            onChangeImage={(nextValue) => {
              setLogoDraft(nextValue);
              setErrors((prev) => ({ ...prev, LOGO: '' }));
            }}
            onActionError={(message) => setErrors((prev) => ({ ...prev, LOGO: message }))}
            actionLabels={{
              upload: 'Importer un logo',
              paste: 'Coller un logo depuis le presse-papiers',
              clear: 'Supprimer le logo',
            }}
            sx={{ border: '1px solid', borderColor: 'divider' }}
            fallback={(
              <Stack spacing={0.5} sx={{ alignItems: 'center', color: 'text.disabled' }}>
                <EmojiEventsIcon sx={{ fontSize: 72 }} />
                <Box sx={{ fontSize: 12 }}>Competition</Box>
              </Stack>
            )}
          />
        </Box>

        <Box sx={{ minWidth: 0, gridColumn: '2', gridRow: '1', alignSelf: 'start' }}>
          <Stack spacing={0.5} sx={{ width: 180, maxWidth: '100%' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.2 }}>
              COCLEUNIK
            </Typography>
            <TextField
              value={String(values.COCLEUNIK ?? '')}
              onChange={(e) => setValues((prev) => ({ ...prev, COCLEUNIK: e.target.value }))}
              size="small"
              fullWidth
              disabled={isIdReadOnly}
              helperText={isIdReadOnly ? 'Auto-genere' : 'Code numerique'}
              error={Boolean(errors.COCLEUNIK)}
            />
          </Stack>
        </Box>

        <Box sx={{ minWidth: 0, gridColumn: '1 / -1', gridRow: '2' }}>
          <Stack spacing={2}>
            <TextField
              label="Nom de la competition"
              value={String(values.NOM ?? '')}
              onChange={(e) => setValues((prev) => ({ ...prev, NOM: e.target.value }))}
              size="small"
              fullWidth
              error={Boolean(errors.NOM)}
              helperText={errors.NOM}
            />

            <TextField
              select
              label="Epreuve"
              value={Number(values.IDEPREUVE ?? 0) || ''}
              onChange={(e) => setValues((prev) => ({ ...prev, IDEPREUVE: Number(e.target.value) }))}
              size="small"
              fullWidth
              error={Boolean(errors.IDEPREUVE)}
              helperText={errors.IDEPREUVE}
            >
              {epreuveOptions.map((option) => (
                <MenuItem key={option.IDEPREUVE} value={option.IDEPREUVE}>
                  {option.EPREUVE}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Saison"
              value={String(values.SAISON ?? '')}
              onChange={(e) => setValues((prev) => ({ ...prev, SAISON: e.target.value }))}
              size="small"
              fullWidth
              error={Boolean(errors.SAISON)}
              helperText={errors.SAISON}
            >
              {saisonOptions.map((option) => (
                <MenuItem key={option.SAISON} value={option.SAISON}>
                  {option.SAISON}
                </MenuItem>
              ))}
            </TextField>

            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(Number(values.CO_ANNEE))}
                  onChange={(e) => setValues((prev) => ({ ...prev, CO_ANNEE: e.target.checked ? 1 : 0 }))}
                />
              }
              label="Competition sur une annee pleine"
            />

            <TextField
              label="Site officiel"
              value={String(values.CO_WEB ?? '')}
              onChange={(e) => setValues((prev) => ({ ...prev, CO_WEB: e.target.value }))}
              size="small"
              fullWidth
              placeholder="https://..."
              error={Boolean(errors.CO_WEB)}
              helperText={errors.CO_WEB}
            />

            <TextField
              label="Commentaire"
              value={String(values.CO_COMMENT ?? '')}
              onChange={(e) => setValues((prev) => ({ ...prev, CO_COMMENT: e.target.value }))}
              size="small"
              fullWidth
              multiline
              minRows={3}
            />
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
      title={mode === 'create' ? 'Nouvelle Competition' : 'Modifier une Competition'}
      saving={saving}
      onSave={() => void handleSave()}
      maxWidth="lg"
    >
      {content}
    </EntityFormDialog>
  );
}
