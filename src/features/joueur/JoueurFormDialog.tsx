import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityFormDialog } from '../../components/EntityFormDialog';
import { useEntityImage } from '../../lib/useEntityImage';
import { TerrainVilleSelector } from '../terrain/TerrainVilleSelector';
import type { NatioRow } from '../natio/types';
import { fetchVilleById } from '../ville/villeApi';
import type { PosteOption, JoueurRow } from './types';

interface JoueurFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialData?: JoueurRow;
  natioDatas: NatioRow[];
  posteOptions: PosteOption[];
  onClose: () => void;
  onSubmit: (payload: JoueurRow) => Promise<void>;
}

type VilleTarget = 'birth' | 'death';

function imageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalizeDateDigits(input: string): string {
  const digits = input.replace(/\D+/g, '').slice(0, 8);
  if (digits.length === 8) {
    const yyyy = digits.slice(0, 4);
    const mm = digits.slice(4, 6);
    const dd = digits.slice(6, 8);
    return `${dd}/${mm}/${yyyy}`;
  }
  return input;
}

function normalizeDisplayDateInput(input: string): string {
  const digits = input.replace(/\D+/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function normalizeNullableText(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const lower = text.toLowerCase();
  if (lower === 'null' || lower === 'undefined') return '';
  return text;
}

function normalizeNullableCityId(value: unknown): string {
  const text = normalizeNullableText(value);
  if (!text || text === '0') return '';
  return text;
}

function toInputDate(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return `${raw.slice(6, 10)}-${raw.slice(3, 5)}-${raw.slice(0, 2)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  return '';
}

function fromInputDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

function upper(value: string): string {
  return value.toUpperCase();
}

function capitalize(value: string): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function JoueurFormDialog({
  open,
  mode,
  initialData,
  natioDatas,
  posteOptions,
  onClose,
  onSubmit,
}: JoueurFormDialogProps) {
  const [values, setValues] = useState<JoueurRow>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [villeSelectorOpen, setVilleSelectorOpen] = useState(false);
  const [villeTarget, setVilleTarget] = useState<VilleTarget>('birth');
  const [birthVilleName, setBirthVilleName] = useState('');
  const [deathVilleName, setDeathVilleName] = useState('');
  const [newPhotoDataUrl, setNewPhotoDataUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const birthDatePickerRef = useRef<HTMLInputElement | null>(null);
  const deathDatePickerRef = useRef<HTMLInputElement | null>(null);

  const editId = mode === 'edit' ? (initialData?.IDJOUEUR as string | number | undefined) : undefined;
  const existingPhoto = useEntityImage('joueurrg', editId);

  const countryOptions = useMemo(() => {
    return natioDatas.map((natio) => ({
      id: natio.IDNATIO ?? natio.ID,
      label: `${natio.PAYS ?? natio.NOM} (${natio.IDNATIO ?? natio.ID})`,
    }));
  }, [natioDatas]);

  const posteSelectOptions = useMemo(
    () => posteOptions.map((poste) => ({ value: poste.POS_ID, label: poste.POS_NOM })),
    [posteOptions],
  );

  const birthDateDisplay = normalizeNullableText(values.NAISSANCE);
  const deathDateDisplay = normalizeNullableText(values.DECES);
  const birthVilleDisplay = birthVilleName || normalizeNullableCityId(values.IDVILLE);
  const deathVilleDisplay = deathVilleName || normalizeNullableCityId(values.VILLE_DECES);

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextValues: JoueurRow = {
      ...(initialData ?? {}),
    };

    nextValues.NAISSANCE = normalizeDateDigits(normalizeNullableText(nextValues.NAISSANCE));
    nextValues.DECES = normalizeDateDigits(normalizeNullableText(nextValues.DECES));
    nextValues.IDVILLE = normalizeNullableCityId(nextValues.IDVILLE);
    nextValues.VILLE_DECES = normalizeNullableCityId(nextValues.VILLE_DECES);

    setValues(nextValues);
    setBirthVilleName(normalizeNullableText(nextValues.VILLE_NOM));
    setDeathVilleName(normalizeNullableText(nextValues.VILLE_DECES_NOM));
    setErrors({});
    setNewPhotoDataUrl(null);
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;

    const birthId = values.IDVILLE;
    const deathId = values.VILLE_DECES;

    if (!birthVilleName && birthId !== undefined && birthId !== null && String(birthId).trim()) {
      void fetchVilleById(String(birthId))
        .then((row) => setBirthVilleName(String(row.NOM ?? '')))
        .catch(() => {});
    }

    if (!deathVilleName && deathId !== undefined && deathId !== null && String(deathId).trim()) {
      void fetchVilleById(String(deathId))
        .then((row) => setDeathVilleName(String(row.NOM ?? '')))
        .catch(() => {});
    }
  }, [birthVilleName, deathVilleName, open, values.IDVILLE, values.VILLE_DECES]);

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

  const handleVillePick = (target: VilleTarget): void => {
    setVilleTarget(target);
    setVilleSelectorOpen(true);
  };

  const handleVilleSelect = (ville: Record<string, unknown>) => {
    const villeId = ville.VICLEUNIK ?? '';
    const villeNom = String(ville.NOM ?? '');

    if (villeTarget === 'birth') {
      setValues((prev) => ({ ...prev, IDVILLE: villeId }));
      setBirthVilleName(villeNom);
    } else {
      setValues((prev) => ({ ...prev, VILLE_DECES: villeId }));
      setDeathVilleName(villeNom);
    }

    setVilleSelectorOpen(false);
  };

  const handleSave = async () => {
    const nextErrors: Record<string, string> = {};

    if (!String(values.IDJOUEUR ?? '').trim()) {
      nextErrors.IDJOUEUR = 'ID Joueur requis';
    }
    if (!String(values.NOM ?? '').trim()) {
      nextErrors.NOM = 'Nom requis';
    }
    if (!String(values.PRENOM ?? '').trim()) {
      nextErrors.PRENOM = 'Prénom requis';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      const payload: JoueurRow = { ...values };
      payload.NAISSANCE = normalizeNullableText(payload.NAISSANCE);
      payload.DECES = normalizeNullableText(payload.DECES);
      payload.IDVILLE = normalizeNullableCityId(payload.IDVILLE);
      payload.VILLE_DECES = normalizeNullableCityId(payload.VILLE_DECES);
      delete payload.VILLE_NOM;
      delete payload.VILLE_DECES_NOM;
      if (!newPhotoDataUrl) {
        delete payload.PHOTO;
      }
      if (newPhotoDataUrl) {
        payload.PHOTO = newPhotoDataUrl;
      }
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <EntityFormDialog
        open={open}
        onClose={onClose}
        title={mode === 'create' ? 'Nouveau Joueur' : 'Modifier un Joueur'}
        saving={saving}
        onSave={() => void handleSave()}
        maxWidth="md"
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
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
            {(photoLoading || existingPhoto.loading) ? <CircularProgress size={40} /> : null}

            {!photoLoading && !existingPhoto.loading && (newPhotoDataUrl ?? existingPhoto.src) ? (
              <Box
                component="img"
                src={(newPhotoDataUrl ?? existingPhoto.src) as string}
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (!photoLoading && !existingPhoto.loading ? (
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
            ) : null)}

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
                onChange={(event) => void handlePhotoUpload(event)}
              />
            </IconButton>
          </Box>

          <Stack spacing={1} sx={{ flex: 1 }}>
            <TextField
              label="ID Joueur"
              value={String(values.IDJOUEUR ?? '')}
              onChange={(event) => setValues((prev) => ({ ...prev, IDJOUEUR: event.target.value }))}
              disabled={mode === 'edit'}
              error={Boolean(errors.IDJOUEUR)}
              helperText={errors.IDJOUEUR ?? (mode === 'edit' ? 'Identifiant non modifiable' : '')}
              fullWidth
              size="small"
            />
            {errors.photo ? <Typography sx={{ color: 'error.main', fontSize: '0.75rem' }}>{errors.photo}</Typography> : null}
          </Stack>
        </Stack>

        <TextField
          label="Nom"
          value={String(values.NOM ?? '')}
          onChange={(event) => setValues((prev) => ({ ...prev, NOM: upper(event.target.value) }))}
          error={Boolean(errors.NOM)}
          helperText={errors.NOM}
          fullWidth
          size="small"
        />

        <TextField
          label="Prénom"
          value={String(values.PRENOM ?? '')}
          onChange={(event) => setValues((prev) => ({ ...prev, PRENOM: capitalize(event.target.value) }))}
          error={Boolean(errors.PRENOM)}
          helperText={errors.PRENOM}
          fullWidth
          size="small"
        />

        <TextField
          label="Alias"
          value={String(values.SURNOM ?? '')}
          onChange={(event) => setValues((prev) => ({ ...prev, SURNOM: upper(event.target.value) }))}
          fullWidth
          size="small"
        />

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'nowrap', pt: 0.5 }}>
            <TextField
              label="Né le"
              value={birthDateDisplay}
              onChange={(event) => setValues((prev) => ({ ...prev, NAISSANCE: normalizeDisplayDateInput(event.target.value) }))}
              size="small"
              sx={{ width: 122, flexShrink: 0 }}
              slotProps={{
                htmlInput: { maxLength: 10, placeholder: 'DD/MM/YYYY' },
              }}
            />
            <IconButton
              aria-label="Calendrier naissance"
              size="small"
              onClick={() => {
                birthDatePickerRef.current?.showPicker?.();
              }}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            >
              <CalendarMonthRoundedIcon fontSize="small" />
            </IconButton>
            <input
              ref={birthDatePickerRef}
              type="date"
              value={toInputDate(birthDateDisplay)}
              onChange={(event) => setValues((prev) => ({ ...prev, NAISSANCE: fromInputDate(event.target.value) }))}
              style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
              tabIndex={-1}
            />
            <TextField
              label="à"
              value={birthVilleDisplay}
              sx={{ minWidth: 180, flex: 1 }}
              size="small"
              slotProps={{ input: { readOnly: true } }}
            />
              <Tooltip title="Sélectionner une ville de naissance">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleVillePick('birth')}
                  startIcon={<LocationCityRoundedIcon fontSize="small" />}
                  sx={{
                    flexShrink: 0,
                    minWidth: 36,
                    px: 1,
                    '.MuiButton-startIcon': { mr: 0 },
                  }}
                  aria-label="Sélectionner une ville de naissance"
                >
                  <Box component="span" sx={{ display: 'none' }}>
                    Ville
                  </Box>
                </Button>
              </Tooltip>
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'nowrap', pt: 0.5 }}>
            <TextField
              label="Décédé le"
              value={deathDateDisplay}
              onChange={(event) => setValues((prev) => ({ ...prev, DECES: normalizeDisplayDateInput(event.target.value) }))}
              size="small"
              sx={{ width: 122, flexShrink: 0 }}
              slotProps={{
                htmlInput: { maxLength: 10, placeholder: 'DD/MM/YYYY' },
              }}
            />
            <IconButton
              aria-label="Calendrier décès"
              size="small"
              onClick={() => {
                deathDatePickerRef.current?.showPicker?.();
              }}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            >
              <CalendarMonthRoundedIcon fontSize="small" />
            </IconButton>
            <input
              ref={deathDatePickerRef}
              type="date"
              value={toInputDate(deathDateDisplay)}
              onChange={(event) => setValues((prev) => ({ ...prev, DECES: fromInputDate(event.target.value) }))}
              style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
              tabIndex={-1}
            />
            <TextField
              label="à"
              value={deathVilleDisplay}
              sx={{ minWidth: 180, flex: 1 }}
              size="small"
              slotProps={{ input: { readOnly: true } }}
            />
              <Tooltip title="Sélectionner une ville de décès">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleVillePick('death')}
                  startIcon={<LocationCityRoundedIcon fontSize="small" />}
                  sx={{
                    flexShrink: 0,
                    minWidth: 36,
                    px: 1,
                    '.MuiButton-startIcon': { mr: 0 },
                  }}
                  aria-label="Sélectionner une ville de décès"
                >
                  <Box component="span" sx={{ display: 'none' }}>
                    Ville
                  </Box>
                </Button>
              </Tooltip>
          </Stack>

        <Autocomplete
          options={countryOptions}
          getOptionLabel={(option) => option.label}
          value={countryOptions.find((option) => option.id === values.IDNATIO) ?? null}
          onChange={(_, option) => setValues((prev) => ({ ...prev, IDNATIO: option?.id ?? '' }))}
          renderInput={(params) => <TextField {...params} label="Nationalité" size="small" />}
          size="small"
        />

        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <TextField
            label="Taille"
            value={String(values.HAUTEUR ?? '')}
            onChange={(event) => setValues((prev) => ({
              ...prev,
              HAUTEUR: event.target.value.replace(/\D+/g, '').slice(0, 3),
            }))}
            size="small"
            sx={{ width: 110, flexShrink: 0 }}
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">cm</InputAdornment>,
              },
              htmlInput: { inputMode: 'numeric', maxLength: 3 },
            }}
          />
          <TextField
            label="Poids"
            value={String(values.POIDS ?? '')}
            onChange={(event) => setValues((prev) => ({
              ...prev,
              POIDS: event.target.value.replace(/\D+/g, '').slice(0, 3),
            }))}
            size="small"
            sx={{ width: 110, flexShrink: 0 }}
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">kg</InputAdornment>,
              },
              htmlInput: { inputMode: 'numeric', maxLength: 3 },
            }}
          />
        </Stack>

        <Autocomplete
          options={posteSelectOptions}
          getOptionLabel={(option) => option.label}
          value={posteSelectOptions.find((option) => Number(option.value) === Number(values.POSTE)) ?? null}
          onChange={(_, option) => setValues((prev) => ({ ...prev, POSTE: option?.value ?? '' }))}
          renderInput={(params) => <TextField {...params} label="Poste" size="small" />}
          size="small"
        />

        <TextField
          label="Commentaire"
          value={String(values.COMMENT ?? '')}
          onChange={(event) => setValues((prev) => ({ ...prev, COMMENT: event.target.value }))}
          size="small"
          fullWidth
          multiline
          minRows={3}
        />
      </EntityFormDialog>

      <TerrainVilleSelector
        open={villeSelectorOpen}
        onClose={() => setVilleSelectorOpen(false)}
        onSelect={handleVilleSelect}
      />
    </>
  );
}
