import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { useEffect, useMemo, useState } from 'react';
import type { TerrainRow } from './types';
import { TerrainVilleSelector } from './TerrainVilleSelector';

interface TerrainFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  fields: string[];
  primaryKey?: string;
  initialData?: TerrainRow;
  onClose: () => void;
  onSubmit: (payload: TerrainRow) => Promise<void>;
}

export function TerrainFormDialog({
  open,
  mode,
  fields,
  primaryKey,
  initialData,
  onClose,
  onSubmit,
}: TerrainFormDialogProps) {
  const [values, setValues] = useState<TerrainRow>({});
  const [saving, setSaving] = useState(false);
  const [villeSelectorOpen, setVilleSelectorOpen] = useState(false);

  const labelsByField: Record<string, string> = {
    TECLEUNIK: 'Code',
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
    // Exclure TERRAIN_LOGO et IDVILLE, inclure VILLE_NOM
    return resolved
      .filter(f => f !== 'TERRAIN_LOGO' && f !== 'IDVILLE')
      .map(f => f);
  }, [fields, initialData]);

  const codeField = useMemo(
    () => resolvedFields.find((field) => ['TECLEUNIK', 'CODE'].includes(field)),
    [resolvedFields],
  );
  const nameField = useMemo(
    () => resolvedFields.find((field) => ['STADE', 'NOM'].includes(field)),
    [resolvedFields],
  );
  const villeField = 'VILLE_NOM';
  const customFields = useMemo(
    () => new Set([codeField, nameField, villeField].filter(Boolean) as string[]),
    [codeField, nameField],
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
  }, [open, resolvedFields, initialData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: TerrainRow = { ...values };
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  const handleVilleSelect = (ville: Record<string, unknown>) => {
    // Update both IDVILLE and VILLE_NOM when selecting a ville
    setValues((prev) => ({
      ...prev,
      IDVILLE: ville.VICLEUNIK ?? prev.IDVILLE,
      VILLE_NOM: ville.NOM ?? prev.VILLE_NOM,
    }));
    setVilleSelectorOpen(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Nouveau Stade' : 'Modifier un Stade'}</DialogTitle>
      <DialogContent sx={{ p: 0, overflowX: 'hidden' }}>
        <Box sx={{ px: 3, pt: 1.5, pb: 1.5 }}>
          <Stack spacing={2} sx={{ width: '100%' }}>
            {codeField ? (
              <TextField
                label={labelsByField[codeField] ?? codeField}
                value={String(values[codeField] ?? '')}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, [codeField]: e.target.value }));
                }}
                disabled={mode === 'edit' && primaryKey === codeField}
                size="small"
                fullWidth
              />
            ) : null}

            {nameField ? (
              <TextField
                label={labelsByField[nameField] ?? nameField}
                value={(values[nameField] as string | number | undefined) ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [nameField]: e.target.value }))}
                fullWidth
                size="small"
              />
            ) : null}

            {resolvedFields.includes(villeField) ? (
              <TextField
                label={labelsByField[villeField]}
                value={(values[villeField] as string | number | undefined) ?? ''}
                fullWidth
                size="small"
                onContextMenu={(e) => {
                  e.preventDefault();
                  setVilleSelectorOpen(true);
                }}
                slotProps={{
                  input: {
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          size="small"
                          variant="text"
                          onClick={() => setVilleSelectorOpen(true)}
                          sx={{ minWidth: 36, p: 0 }}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </Button>
                      </InputAdornment>
                    ),
                  },
                }}
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
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} color="inherit">Annuler</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Enregistrement...' : 'OK'}
        </Button>
      </DialogActions>

      <TerrainVilleSelector
        open={villeSelectorOpen}
        onClose={() => setVilleSelectorOpen(false)}
        onSelect={handleVilleSelect}
      />
    </Dialog>
  );
}
