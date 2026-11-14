import {
  Alert,
  Button,
  Box,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import { useEffect, useMemo, useState } from 'react';
import { useExternalSaveTrigger } from '../../lib/useExternalSaveTrigger';
import { EntityFormDialog } from '../../components/EntityFormDialog';
import { EntityImageFrame } from '../../components/EntityImageFrame';
import { useDepsChanged } from '../../lib/useDepsChanged';
import { useDirtySignature } from '../../lib/useDirtySignature';
import { getEntityImageUrl, useEntityImage } from '../../lib/useEntityImage';
import type { NatioRow } from './types';

interface NatioFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  embedded?: boolean;
  fields: string[];
  primaryKey?: string;
  initialData?: NatioRow;
  onDirtyChange?: (dirty: boolean) => void;
  onClose: () => void;
  onSubmit: (payload: NatioRow) => Promise<void>;
  saveCount?: number;
}

export function NatioFormDialog({
  open,
  mode,
  embedded = false,
  fields,
  primaryKey,
  initialData,
  onDirtyChange,
  onClose,
  onSubmit,
  saveCount = 0,
}: NatioFormDialogProps) {
  const [values, setValues] = useState<NatioRow>({});
  const [saving, setSaving] = useState(false);
  const [flagDraft, setFlagDraft] = useState<string | null | undefined>(undefined);
  const [flagError, setFlagError] = useState<string | null>(null);
  const [imageRefreshToken, setImageRefreshToken] = useState(0);
  const editId = mode === 'edit' && primaryKey ? (initialData?.[primaryKey] as string | number | undefined) : undefined;
  const existingFlagImage = useEntityImage('natio', editId, imageRefreshToken);
  const { setInitialSignature, syncDirty, markClean } = useDirtySignature(open, onDirtyChange);

  const directFlagUrl = useMemo(() => {
    const hasId = editId !== null && editId !== undefined && String(editId).trim() !== '';
    return hasId ? getEntityImageUrl('natio', editId as string | number) : '';
  }, [editId]);

  const flagPreview = useMemo(
    () => (flagDraft === undefined ? (existingFlagImage.src ?? directFlagUrl) : flagDraft),
    [flagDraft, existingFlagImage.src, directFlagUrl],
  );

  const labelsByField: Record<string, string> = {
    IDNATIO: 'Identifiant',
    NATIO: 'Identifiant',
    CODE: 'Identifiant',
    PAYS: 'Nom',
    NOM: 'Nom',
    NALOCAL: 'Pays local',
    CODE_ISO: 'Code ISO',
    NAT_ISO: 'Code ISO',
    NAT_DRAPEAU: 'Drapeau',
  };

  const resolvedFields = useMemo(() => {
    if (fields.length > 0) {
      return fields;
    }
    if (initialData) {
      return Object.keys(initialData);
    }
    return [];
  }, [fields, initialData]);

  const codeField = useMemo(
    () => resolvedFields.find((field) => ['IDNATIO', 'NATIO', 'CODE'].includes(field)),
    [resolvedFields],
  );
  const nameField = useMemo(
    () => resolvedFields.find((field) => ['PAYS', 'NOM', 'NATIO_NOM'].includes(field)),
    [resolvedFields],
  );
  const localField = useMemo(
    () => resolvedFields.find((field) => field === 'NALOCAL'),
    [resolvedFields],
  );
  const codeIsoField = useMemo(
    () => resolvedFields.find((field) => field === 'NAT_ISO'),
    [resolvedFields],
  );
  const flagField = useMemo(
    () => resolvedFields.find((field) => field === 'NAT_DRAPEAU'),
    [resolvedFields],
  );
  const customFields = useMemo(
    () => new Set([codeField, nameField, localField, codeIsoField, flagField].filter(Boolean) as string[]),
    [codeField, nameField, localField, codeIsoField, flagField],
  );

  // Initialize the form while rendering, on the dependencies of the former effect.
  const initDepsChanged = useDepsChanged([open, resolvedFields, initialData, setInitialSignature]);
  if (initDepsChanged && !open) {
    setFlagDraft(undefined);
  } else if (initDepsChanged) {
    const initial: NatioRow = {};
    for (const field of resolvedFields) {
      initial[field] = (initialData?.[field] as string | number | null | undefined) ?? '';
    }

    setValues(initial);
    setFlagDraft(undefined);
    setFlagError(null);
    // The flag is tracked through flagDraft, not in the signature.
    setInitialSignature(JSON.stringify({ ...initial, NAT_DRAPEAU: '' }));
  }

  useEffect(() => {
    const currentSignature = JSON.stringify({ ...values, NAT_DRAPEAU: flagDraft === undefined ? '' : flagDraft });
    syncDirty(currentSignature);
  }, [flagDraft, syncDirty, values]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: NatioRow = { ...values };
      if (flagField) {
        if (flagDraft === undefined) {
          delete payload[flagField];
        } else {
          payload[flagField] = flagDraft;
        }
      }
      await onSubmit(payload);
      if (mode === 'edit' && flagDraft !== undefined) {
        setFlagDraft(undefined);
        setImageRefreshToken((prev) => prev + 1);
      }
      markClean();
    } finally {
      setSaving(false);
    }
  };

  useExternalSaveTrigger(saveCount, handleSave);

  const content = (
    <>
      <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(140px, 180px) minmax(0, 1fr)',
                columnGap: 2,
                rowGap: 2,
                alignItems: 'start',
                width: '100%',
              }}
      >
            <EntityImageFrame
              width={180}
              height={120}
              loading={flagDraft === undefined && existingFlagImage.loading}
              src={flagPreview}
              alt="Aperçu du drapeau"
              objectFit="contain"
              editable
              accept="image/*"
              onChangeImage={(nextValue) => {
                setFlagDraft(nextValue);
                setFlagError(null);
              }}
              onActionError={setFlagError}
              actionLabels={{
                upload: 'Importer un drapeau',
                paste: 'Coller un drapeau depuis le presse-papiers',
                clear: 'Supprimer le drapeau',
              }}
              fallback={<FlagRoundedIcon sx={{ width: '100%', height: '100%', p: 1.5, color: 'text.disabled' }} />}
              sx={{ border: '1px solid', borderColor: 'divider', justifySelf: 'start' }}
            />

            <Stack
              spacing={1}
              sx={{
                gridColumn: 2,
                minWidth: 0,
                width: '100%',
                justifySelf: 'stretch',
                alignItems: 'stretch',
                mt: 0.5,
              }}
            >
              {codeField ? (
                <TextField
                  label={labelsByField[codeField] ?? codeField}
                  value={String(values[codeField] ?? '')}
                  onChange={(e) => {
                    const next = e.target.value.slice(0, 3);
                    setValues((prev) => ({ ...prev, [codeField]: next }));
                  }}
                  disabled={mode === 'edit' && primaryKey === codeField}
                  size="small"
                  fullWidth
                />
              ) : null}

              {codeIsoField ? (
                <TextField
                  label={labelsByField[codeIsoField]}
                  value={String(values[codeIsoField] ?? '')}
                  onChange={(e) => {
                    const next = e.target.value.slice(0, 3).toUpperCase();
                    setValues((prev) => ({ ...prev, [codeIsoField]: next }));
                  }}
                  size="small"
                  fullWidth
                  slotProps={{ htmlInput: { maxLength: 3 } }}
                />
              ) : null}

              {localField ? (
                <FormControlLabel
                  label={labelsByField[localField]}
                  control={
                    <Switch
                      checked={Boolean(Number(values[localField] ?? 0))}
                      onChange={(_, checked) => setValues((prev) => ({ ...prev, [localField]: checked ? 1 : 0 }))}
                    />
                  }
                  sx={{ ml: 0 }}
                />
              ) : null}
            </Stack>

            {flagError ? (
              <Alert severity="error" sx={{ gridColumn: '1 / -1' }} onClose={() => setFlagError(null)}>
                {flagError}
              </Alert>
            ) : null}

            {nameField ? (
              <TextField
                sx={{ gridColumn: '1 / -1' }}
                label={labelsByField[nameField] ?? nameField}
                value={(values[nameField] as string | number | undefined) ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [nameField]: e.target.value }))}
                fullWidth
                size="small"
              />
            ) : null}
            </Box>

      {resolvedFields.filter((field) => !customFields.has(field)).map((field) => (
        <TextField
          key={field}
          label={labelsByField[field] ?? field}
          value={(values[field] as string | number | undefined) ?? ''}
          onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
          disabled={mode === 'edit' && primaryKey === field}
          fullWidth
          size="small"
        />
      ))}
    </>
  );

  if (embedded) {
    return (
      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
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
      title={mode === 'create' ? 'Nouveau Pays' : 'Modifier un Pays'}
      saving={saving}
      onSave={() => void handleSave()}
      saveLabel="Enregistrer"
    >
      {content}
    </EntityFormDialog>
  );
}
