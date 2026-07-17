import { FormControlLabel, Switch, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { EntityFormDialog } from '../../components/EntityFormDialog';
import type { DeviseRow } from './types';

interface DeviseFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  primaryKey?: string;
  initialData?: DeviseRow;
  onClose: () => void;
  onSubmit: (payload: DeviseRow) => Promise<void>;
}

export function DeviseFormDialog({
  open,
  mode,
  primaryKey,
  initialData,
  onClose,
  onSubmit,
}: DeviseFormDialogProps) {
  const [values, setValues] = useState<DeviseRow>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setValues({
      DVCLEUNIK: initialData?.DVCLEUNIK ?? '',
      NOM: initialData?.NOM ?? '',
      SYMBOLE: initialData?.SYMBOLE ?? '',
      CONVERSION: initialData?.CONVERSION ?? '',
      DVDEFAUT: initialData?.DVDEFAUT ?? 0,
    });
    setErrors({});
  }, [open, initialData]);

  const isCodeReadOnly = mode === 'edit' && !!primaryKey;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!String(values.NOM ?? '').trim()) newErrors.NOM = 'Nom requis';
    if (!String(values.SYMBOLE ?? '').trim()) newErrors.SYMBOLE = 'Symbole requis';
    if (String(values.SYMBOLE ?? '').length > 3) newErrors.SYMBOLE = '3 caractères max';
    const conv = Number(values.CONVERSION);
    if (Number.isNaN(conv) || conv <= 0) newErrors.CONVERSION = 'Taux invalide (> 0)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: DeviseRow = {
        ...values,
        CONVERSION: Number(values.CONVERSION),
        DVDEFAUT: values.DVDEFAUT ? 1 : 0,
      };
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  const title = mode === 'create' ? 'Nouvelle Devise' : 'Modifier une Devise';

  return (
    <EntityFormDialog open={open} onClose={onClose} title={title} saving={saving} onSave={handleSave}>
      <TextField
        label="Code"
        value={String(values.DVCLEUNIK ?? '')}
        onChange={(e) => setValues((prev) => ({ ...prev, DVCLEUNIK: e.target.value }))}
        size="small"
        fullWidth
        disabled={isCodeReadOnly}
        helperText={isCodeReadOnly ? 'Auto-généré' : undefined}
      />
      <TextField
        label="Nom"
        value={String(values.NOM ?? '')}
        onChange={(e) => setValues((prev) => ({ ...prev, NOM: e.target.value }))}
        size="small"
        fullWidth
        error={Boolean(errors.NOM)}
        helperText={errors.NOM}
      />
      <TextField
        label="Symbole"
        value={String(values.SYMBOLE ?? '')}
        onChange={(e) => setValues((prev) => ({ ...prev, SYMBOLE: e.target.value.slice(0, 3) }))}
        size="small"
        fullWidth
        slotProps={{ htmlInput: { maxLength: 3 } }}
        error={Boolean(errors.SYMBOLE)}
        helperText={errors.SYMBOLE ?? '3 caractères max'}
      />
      <TextField
        label="Taux de conversion en €"
        value={String(values.CONVERSION ?? '')}
        onChange={(e) => setValues((prev) => ({ ...prev, CONVERSION: e.target.value }))}
        size="small"
        fullWidth
        type="number"
        slotProps={{ htmlInput: { step: 'any', min: 0 } }}
        error={Boolean(errors.CONVERSION)}
        helperText={errors.CONVERSION}
      />
      <FormControlLabel
        control={
          <Switch
            checked={Boolean(values.DVDEFAUT)}
            onChange={(e) => setValues((prev) => ({ ...prev, DVDEFAUT: e.target.checked ? 1 : 0 }))}
          />
        }
        label="Devise par défaut"
      />
    </EntityFormDialog>
  );
}
