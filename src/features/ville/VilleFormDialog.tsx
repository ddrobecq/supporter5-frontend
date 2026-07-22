import {
  Autocomplete,
  Box,
  Button,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { EntityFormDialog } from '../../components/EntityFormDialog';
import type { VilleRow } from './types';
import type { NatioRow } from '../natio/types';

interface VilleFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  embedded?: boolean;
  fields: string[];
  primaryKey?: string;
  initialData?: VilleRow;
  natioDatas: NatioRow[];
  onDirtyChange?: (dirty: boolean) => void;
  onClose: () => void;
  onSubmit: (payload: VilleRow) => Promise<void>;
}

export function VilleFormDialog({
  open,
  mode,
  embedded = false,
  fields,
  primaryKey,
  initialData,
  natioDatas,
  onDirtyChange,
  onClose,
  onSubmit,
}: VilleFormDialogProps) {
  const [values, setValues] = useState<VilleRow>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialSignature, setInitialSignature] = useState('');

  const labelsByField: Record<string, string> = {
    VICLEUNIK: 'Code',
    VILLEID: 'Code',
    ID: 'Code',
    NOM: 'Nom',
    IDNATIO: 'Pays',
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
    () => resolvedFields.find((field) => ['VICLEUNIK', 'VILLEID', 'ID'].includes(field)),
    [resolvedFields],
  );
  const nameField = useMemo(
    () => resolvedFields.find((field) => field === 'NOM'),
    [resolvedFields],
  );
  const natioField = useMemo(
    () => resolvedFields.find((field) => field === 'IDNATIO'),
    [resolvedFields],
  );

  const customFields = useMemo(
    () => new Set([codeField, nameField, natioField].filter(Boolean) as string[]),
    [codeField, nameField, natioField],
  );

  const countryOptions = useMemo(() => {
    return natioDatas.map((natio) => ({
      id: natio.IDNATIO ?? natio.ID,
      label: `${natio.PAYS ?? natio.NOM} (${natio.IDNATIO ?? natio.ID})`,
    }));
  }, [natioDatas]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const initial: VilleRow = {};
    for (const field of resolvedFields) {
      initial[field] = (initialData?.[field] as string | number | null | undefined) ?? '';
    }
    setValues(initial);
    setInitialSignature(JSON.stringify(initial));
    setErrors({});
  }, [open, resolvedFields, initialData]);

  useEffect(() => {
    if (!open || !initialSignature) return;
    onDirtyChange?.(JSON.stringify(values) !== initialSignature);
  }, [initialSignature, onDirtyChange, open, values]);

  const handleSave = async () => {
    // Valider avant envoi
    const newErrors: Record<string, string> = {};
    
    if (!nameField) {
      newErrors.nom = 'Le champ Nom est introuvable';
    } else if (!values[nameField] || (typeof values[nameField] === 'string' && !values[nameField].trim())) {
      newErrors.nom = 'Nom est requis';
    }
    
    if (!natioField) {
      newErrors.pays = 'Le champ Pays est introuvable';
    } else if (!values[natioField]) {
      newErrors.pays = 'Pays est requis';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      // Nettoyer les valeurs vides et convertir VICLEUNIK en number si présent
      const cleanedValues: VilleRow = {};
      for (const [key, value] of Object.entries(values)) {
        if (value !== '' && value !== null) {
          if (key === 'VICLEUNIK' && typeof value === 'string' && value.trim()) {
            cleanedValues[key] = parseInt(value, 10);
          } else {
            cleanedValues[key] = value;
          }
        }
      }
      await onSubmit(cleanedValues);
      setErrors({});
      onDirtyChange?.(false);
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <>
      {codeField ? (
        <TextField
          label={labelsByField[codeField] ?? codeField}
          value={String(values[codeField] ?? '')}
          disabled
          placeholder={mode === 'create' ? '(généré automatiquement)' : ''}
          helperText={mode === 'create' ? 'Code généré automatiquement à la création' : ''}
          fullWidth
          size="small"
          sx={{
            '& .MuiInputBase-input.Mui-disabled': {
              WebkitTextFillColor: 'rgba(0, 0, 0, 0.38)',
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        />
      ) : null}

      {nameField ? (
        <TextField
          label={labelsByField[nameField] ?? nameField}
          value={(values[nameField] as string | number | undefined) ?? ''}
          onChange={(e) => {
            setValues((prev) => ({ ...prev, [nameField]: e.target.value }));
            setErrors((prev) => ({ ...prev, nom: '' }));
          }}
          error={!!errors.nom}
          helperText={errors.nom}
          fullWidth
          size="small"
          required
        />
      ) : null}

      {natioField ? (
        <Autocomplete
          options={countryOptions}
          getOptionLabel={(option) => option.label}
          value={
            countryOptions.find((opt) => opt.id === values[natioField]) || null
          }
          onChange={(_, option) => {
            setValues((prev) => ({
              ...prev,
              [natioField]: option?.id ?? '',
            }));
            setErrors((prev) => ({ ...prev, pays: '' }));
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={labelsByField[natioField] ?? natioField}
              error={!!errors.pays}
              helperText={errors.pays}
              size="small"
              required
            />
          )}
          size="small"
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
      title={mode === 'create' ? 'Nouvelle Ville' : 'Modifier une Ville'}
      saving={saving}
      onSave={() => void handleSave()}
      saveLabel="Enregistrer"
    >
      {content}
    </EntityFormDialog>
  );
}
