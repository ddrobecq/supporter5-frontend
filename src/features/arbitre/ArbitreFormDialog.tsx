import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  IconButton,
  CircularProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEntityImage } from '../../lib/useEntityImage';
import type { ArbitreRow } from './types';
import type { NatioRow } from '../natio/types';

interface ArbitreFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  fields: string[];
  primaryKey?: string;
  initialData?: ArbitreRow;
  natioDatas: NatioRow[];
  onClose: () => void;
  onSubmit: (payload: ArbitreRow) => Promise<void>;
}

function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function capitalizeFirstLetter(value: string): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ArbitreFormDialog({
  open,
  mode,
  fields,
  primaryKey,
  initialData,
  natioDatas,
  onClose,
  onSubmit,
}: ArbitreFormDialogProps) {
  const [values, setValues] = useState<ArbitreRow>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newPhotoDataUrl, setNewPhotoDataUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // ID de l'arbitre en cours d'édition — utilisé pour charger la photo existante de façon asynchrone
  const editId = mode === 'edit' ? (initialData?.IDARBITRE as string | number | undefined) : undefined;
  const existingPhoto = useEntityImage('arbitre', editId);

  const labelsByField: Record<string, string> = {
    IDARBITRE: 'Code',
    NOM: 'Nom',
    PRENOM: 'Prénom',
    IDNATIO: 'Nationalité',
    ARB_PHOTO: 'Photo',
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
    () => resolvedFields.find((field) => field === 'IDARBITRE'),
    [resolvedFields],
  );
  const nomField = useMemo(
    () => resolvedFields.find((field) => field === 'NOM'),
    [resolvedFields],
  );
  const prenomField = useMemo(
    () => resolvedFields.find((field) => field === 'PRENOM'),
    [resolvedFields],
  );
  const natioField = useMemo(
    () => resolvedFields.find((field) => field === 'IDNATIO'),
    [resolvedFields],
  );
  const photoField = useMemo(
    () => resolvedFields.find((field) => field === 'ARB_PHOTO'),
    [resolvedFields],
  );

  const customFields = useMemo(
    () => new Set([codeField, nomField, prenomField, natioField, photoField].filter(Boolean) as string[]),
    [codeField, nomField, prenomField, natioField, photoField],
  );

  const countryOptions = useMemo(() => {
    return natioDatas.map((natio) => ({
      id: natio.IDNATIO ?? natio.ID,
      label: `${natio.PAYS ?? natio.NOM} (${natio.IDNATIO ?? natio.ID})`,
    }));
  }, [natioDatas]);

  useEffect(() => {
    if (!open) {
      setNewPhotoDataUrl(null);
      return;
    }
    const initial: ArbitreRow = {};
    for (const field of resolvedFields) {
      // Ne pas stocker ARB_PHOTO dans l'état du formulaire : chargé séparément via le hook
      if (field === 'ARB_PHOTO') continue;
      initial[field] = (initialData?.[field] as string | number | null | undefined) ?? '';
    }
    setValues(initial);
    setNewPhotoDataUrl(null);
  }, [open, resolvedFields, initialData]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, photo: 'Seulement les images (JPEG/PNG)' }));
      return;
    }

    setPhotoLoading(true);
    try {
      const dataUrl = await imageToDataUrl(file);
      setNewPhotoDataUrl(dataUrl);
      setErrors((prev) => ({ ...prev, photo: '' }));
    } catch {
      setErrors((prev) => ({ ...prev, photo: "Erreur lors du chargement de l'image" }));
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleSave = async () => {
    // Valider avant envoi
    const newErrors: Record<string, string> = {};

    if (!nomField) {
      newErrors.nom = 'Le champ Nom est introuvable';
    } else if (!values[nomField] || (typeof values[nomField] === 'string' && !values[nomField].trim())) {
      newErrors.nom = 'Nom est requis';
    }

    if (!prenomField) {
      newErrors.prenom = 'Le champ Prénom est introuvable';
    } else if (!values[prenomField] || (typeof values[prenomField] === 'string' && !values[prenomField].trim())) {
      newErrors.prenom = 'Prénom est requis';
    }

    if (!natioField) {
      newErrors.pays = 'Le champ Nationalité est introuvable';
    } else if (!values[natioField]) {
      newErrors.pays = 'Nationalité est requis';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      // Nettoyer les valeurs vides
      const cleanedValues: ArbitreRow = {};
      for (const [key, value] of Object.entries(values)) {
        if (value !== '' && value !== null) {
          cleanedValues[key] = value;
        }
      }
      // N'inclure ARB_PHOTO dans le payload que si l'utilisateur a uploadé une nouvelle photo
      if (photoField && newPhotoDataUrl) {
        cleanedValues[photoField] = newPhotoDataUrl;
      }
      await onSubmit(cleanedValues);
      setErrors({});
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Nouvel Arbitre' : 'Modifier un Arbitre'}</DialogTitle>
      <DialogContent sx={{ p: 0, overflowX: 'hidden' }}>
        <Box sx={{ px: 3, pt: 1.5, pb: 1.5 }}>
          <Stack spacing={2} sx={{ width: '100%' }}>
            {/* Photo + Code en grille */}
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
              {/* Photo portrait */}
              {photoField ? (
                <Box
                  sx={{
                    width: 120,
                    height: 150,
                    flexShrink: 0,
                    border: '2px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    backgroundColor: '#f5f5f5',
                    position: 'relative',
                  }}
                >
                  {/* Spinner : upload local en cours ou chargement depuis API */}
                  {(photoLoading || existingPhoto.loading) && <CircularProgress size={40} />}

                  {/* Photo affichée : nouvelle upload prioritaire, sinon photo existante depuis API */}
                  {!photoLoading && !existingPhoto.loading && (newPhotoDataUrl ?? existingPhoto.src) ? (
                    <Box
                      component="img"
                      src={(newPhotoDataUrl ?? existingPhoto.src) as string}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    !photoLoading && !existingPhoto.loading && (
                      <Box
                        sx={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: 0.5,
                          color: 'text.disabled',
                        }}
                      >
                        <AccountCircleOutlinedIcon sx={{ fontSize: 64 }} />
                        <Box sx={{ fontSize: '0.7rem' }}>Portrait</Box>
                      </Box>
                    )
                  )}

                  <IconButton
                    component="label"
                    size="small"
                    aria-label="Importer une photo"
                    disabled={photoLoading}
                    sx={{
                      position: 'absolute',
                      right: 2,
                      bottom: 2,
                      width: 22,
                      height: 22,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'grey.100' },
                    }}
                  >
                    <CloudUploadIcon sx={{ fontSize: 14 }} />
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      hidden
                      onChange={(e) => void handlePhotoUpload(e)}
                    />
                  </IconButton>
                </Box>
              ) : null}

              {/* Code */}
              <Stack spacing={1} sx={{ flex: 1 }}>
                {codeField ? (
                  <TextField
                    label={labelsByField[codeField] ?? codeField}
                    value={String(values[codeField] ?? '')}
                    disabled
                    placeholder="Généré automatiquement"
                    helperText="Code généré automatiquement à la création"
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

                {photoField && errors.photo ? (
                  <Box sx={{ color: 'error.main', fontSize: '0.75rem' }}>{errors.photo}</Box>
                ) : null}
              </Stack>
            </Stack>

            {/* Nom et Prénom */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {nomField ? (
                <TextField
                  label={labelsByField[nomField] ?? nomField}
                  value={(values[nomField] as string | number | undefined) ?? ''}
                  onChange={(e) => {
                    setValues((prev) => ({ ...prev, [nomField]: e.target.value.toUpperCase() }));
                    setErrors((prev) => ({ ...prev, nom: '' }));
                  }}
                  error={!!errors.nom}
                  helperText={errors.nom}
                  fullWidth
                  size="small"
                  required
                />
              ) : null}

              {prenomField ? (
                <TextField
                  label={labelsByField[prenomField] ?? prenomField}
                  value={(values[prenomField] as string | number | undefined) ?? ''}
                  onChange={(e) => {
                    setValues((prev) => ({
                      ...prev,
                      [prenomField]: capitalizeFirstLetter(e.target.value),
                    }));
                    setErrors((prev) => ({ ...prev, prenom: '' }));
                  }}
                  error={!!errors.prenom}
                  helperText={errors.prenom}
                  fullWidth
                  size="small"
                  required
                />
              ) : null}
            </Stack>

            {/* Nationalité */}
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
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} color="inherit">Annuler</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Enregistrement...' : 'OK'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
