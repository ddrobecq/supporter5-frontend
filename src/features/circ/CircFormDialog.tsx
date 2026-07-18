import { MenuItem, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { EntityFormDialog } from '../../components/EntityFormDialog';
import { CIRC_TYPE_OPTIONS } from './circColumnsHelper';
import type { CircRow } from './types';

interface CircFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  primaryKey?: string;
  initialData?: CircRow;
  onClose: () => void;
  onSubmit: (payload: CircRow) => Promise<void>;
}

export function CircFormDialog({ open, mode, primaryKey, initialData, onClose, onSubmit }: CircFormDialogProps) {
  const [values, setValues] = useState<CircRow>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setValues({
      IDCIRC: initialData?.IDCIRC ?? '',
      CIRC: initialData?.CIRC ?? '',
      TYPE_TOUR: Number(initialData?.TYPE_TOUR ?? 1),
    });
    setErrors({});
  }, [open, initialData]);

  const isCodeReadOnly = mode === 'edit' && !!primaryKey;

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    const code = String(values.IDCIRC ?? '').trim();
    const circ = String(values.CIRC ?? '').trim();
    const typeTour = Number(values.TYPE_TOUR);

    if (!code) nextErrors.IDCIRC = 'Abréviation requise';
    if (code.length > 3) nextErrors.IDCIRC = '3 caractères max';
    if (!circ) nextErrors.CIRC = 'Circonstances requises';
    if (![1, 2].includes(typeTour)) nextErrors.TYPE_TOUR = 'Type invalide';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit({
        IDCIRC: String(values.IDCIRC ?? '').trim().toUpperCase(),
        CIRC: String(values.CIRC ?? '').trim(),
        TYPE_TOUR: Number(values.TYPE_TOUR),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <EntityFormDialog
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Nouvelle Circonstance' : 'Modifier une Circonstance'}
      saving={saving}
      onSave={() => void handleSave()}
    >
      <TextField
        label="Abréviation"
        value={String(values.IDCIRC ?? '')}
        onChange={(e) => setValues((prev) => ({ ...prev, IDCIRC: e.target.value.slice(0, 3).toUpperCase() }))}
        size="small"
        fullWidth
        disabled={isCodeReadOnly}
        slotProps={{ htmlInput: { maxLength: 3 } }}
        helperText={errors.IDCIRC ?? '3 caractères max'}
        error={Boolean(errors.IDCIRC)}
      />
      <TextField
        label="Circonstances"
        value={String(values.CIRC ?? '')}
        onChange={(e) => setValues((prev) => ({ ...prev, CIRC: e.target.value }))}
        size="small"
        fullWidth
        multiline
        minRows={3}
        error={Boolean(errors.CIRC)}
        helperText={errors.CIRC}
      />
      <TextField
        select
        label="Type"
        value={Number(values.TYPE_TOUR ?? 1)}
        onChange={(e) => setValues((prev) => ({ ...prev, TYPE_TOUR: Number(e.target.value) }))}
        size="small"
        fullWidth
        error={Boolean(errors.TYPE_TOUR)}
        helperText={errors.TYPE_TOUR}
      >
        {CIRC_TYPE_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    </EntityFormDialog>
  );
}