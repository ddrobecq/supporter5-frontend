import {
  Box,
  Button,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { VillePicker } from '../../components/VillePicker';
import { EntityFormDialog } from '../../components/EntityFormDialog';
import { useDirtySignature } from '../../lib/useDirtySignature';
import type { TerrainRow } from './types';

interface TerrainFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  embedded?: boolean;
  fields: string[];
  primaryKey?: string;
  initialData?: TerrainRow;
  onDirtyChange?: (dirty: boolean) => void;
  onClose: () => void;
  onSubmit: (payload: TerrainRow) => Promise<void>;
  saveCount?: number;
}

export function TerrainFormDialog({
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
}: TerrainFormDialogProps) {
  const [values, setValues] = useState<TerrainRow>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { setInitialSignature, syncDirty, markClean } = useDirtySignature(open, onDirtyChange);

  const labelsByField: Record<string, string> = {
    STADE: 'Nom',
    VILLE_NOM: 'Ville',
  };

  const resolvedFields = useMemo(() => {
    let resolved: string[] = [];
    if (fields.length > 0) {
      resolved = fields;
    } else if (initialData) {
      resolved = Object.keys(initialData);
    }
    const autoIncrementField = primaryKey ?? 'TECLEUNIK';
    // Exclure les champs techniques et la cle auto-incrementee du formulaire.
    return resolved
      .filter((field) => field !== 'TERRAIN_LOGO' && field !== 'IDVILLE' && field !== autoIncrementField && field !== 'TECLEUNIK')
      .map(f => f);
  }, [fields, initialData, primaryKey]);

  const nameField = useMemo(
    () => resolvedFields.find((field) => ['STADE', 'NOM'].includes(field)),
    [resolvedFields],
  );
  const villeField = 'VILLE_NOM';
  const customFields = useMemo(
    () => new Set([nameField, villeField].filter(Boolean) as string[]),
    [nameField],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const initial: TerrainRow = {};
    for (const field of resolvedFields) {
      initial[field] = (initialData?.[field] as string | number | null | undefined) ?? '';
    }
    // Always include IDVILLE in values for saving, even if not visible in form
    if (initialData?.IDVILLE !== undefined) {
      initial.IDVILLE = initialData.IDVILLE;
    }
    setValues(initial);
    setErrors({});
    setInitialSignature(JSON.stringify(initial));
  }, [open, resolvedFields, initialData]);

  useEffect(() => {
    syncDirty(JSON.stringify(values));
  }, [syncDirty, values]);

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};
    const nameValue = nameField ? String(values[nameField] ?? '').trim() : '';
    const villeId = String(values.IDVILLE ?? '').trim();
    if (nameField && !nameValue) {
      nextErrors[nameField] = 'Nom requis';
    }
    if (!villeId) {
      nextErrors[villeField] = 'Ville requise';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      const autoIncrementField = primaryKey ?? 'TECLEUNIK';
      const payload = Object.fromEntries(
        Object.entries(values).filter(([field]) => field !== autoIncrementField && field !== 'TECLEUNIK'),
      ) as TerrainRow;
      await onSubmit(payload);
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
        {nameField ? (
          <TextField
            label={labelsByField[nameField] ?? nameField}
            value={(values[nameField] as string | number | undefined) ?? ''}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, [nameField]: e.target.value }));
              setErrors((prev) => ({ ...prev, [nameField]: '' }));
            }}
            fullWidth
            size="small"
            required
            error={Boolean(errors[nameField])}
            helperText={errors[nameField]}
          />
        ) : null}

        {resolvedFields.includes(villeField) ? (
          <VillePicker
            villeId={String(values['IDVILLE'] ?? '')}
            villeName={String(values[villeField] ?? '')}
            onChange={(id, name) => {
              setValues((prev) => ({ ...prev, IDVILLE: id, [villeField]: name }));
              setErrors((prev) => ({ ...prev, [villeField]: '' }));
            }}
            label={labelsByField[villeField]}
            required
            error={Boolean(errors[villeField])}
            helperText={errors[villeField]}
          />
        ) : null}

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

  return (
    <>
      {embedded ? (
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
      ) : (
        <EntityFormDialog
          open={open}
          onClose={onClose}
          title={mode === 'create' ? 'Nouveau Stade' : 'Modifier un Stade'}
          saving={saving}
          onSave={() => void handleSave()}
          saveLabel="Enregistrer"
        >
          {content}
        </EntityFormDialog>
      )}

    </>
  );
}
