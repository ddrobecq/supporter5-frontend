import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import {
  Autocomplete,
  Box,
  Button,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { DateInputField } from '../../components/DateInputField';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { EntityFormDialog } from '../../components/EntityFormDialog';
import { EntityImageFrame } from '../../components/EntityImageFrame';
import { useEntityImage } from '../../lib/useEntityImage';
import { TerrainVilleSelector } from '../terrain/TerrainVilleSelector';
import type { NatioRow } from '../natio/types';
import { fetchVilleById } from '../ville/villeApi';
import { fetchJoueurHistory } from './joueurApi';
import type { JoueurHistoryRow, PosteOption, JoueurRow } from './types';

interface JoueurFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  embedded?: boolean;
  initialData?: JoueurRow;
  natioDatas: NatioRow[];
  posteOptions: PosteOption[];
  onClose: () => void;
  onSubmit: (payload: JoueurRow) => Promise<void>;
}

type VilleTarget = 'birth' | 'death';

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
  embedded = false,
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
  const [photoDraft, setPhotoDraft] = useState<string | null | undefined>(undefined);
  const [historyRows, setHistoryRows] = useState<JoueurHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySelection, setHistorySelection] = useState<GridRowId[]>([]);

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

  const historyColumns = useMemo<GridColDef<JoueurHistoryRow>[]>(() => [
    {
      field: 'SAISON',
      headerName: 'Saison',
      minWidth: 110,
      flex: 0.65,
    },
    {
      field: 'POSTE_NOM',
      headerName: 'Poste',
      minWidth: 130,
      flex: 1,
    },
    {
      field: 'MATCHES',
      headerName: 'Matches',
      minWidth: 90,
      width: 90,
      maxWidth: 90,
      flex: 0,
      sortable: false,
      renderHeader: () => (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', pr: 0.5 }}>
          <Box component="span">Matches</Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', columnGap: 0.75 }}>
            <Box component="span" sx={{ textAlign: 'right', fontSize: '0.7rem', color: 'text.secondary' }}>
              Tit.
            </Box>
            <Box component="span" sx={{ textAlign: 'right', fontSize: '0.7rem', color: 'text.secondary' }}>
              Remp.
            </Box>
          </Box>
        </Box>
      ),
      renderCell: (params) => (
        <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 0.75, pr: 0.5 }}>
          <Box component="span" sx={{ textAlign: 'right' }}>
            {Number(params.row.TITULAIRETOTAL ?? 0)}
          </Box>
          <Box component="span" sx={{ textAlign: 'right' }}>
            {Number(params.row.REMPTOTAL ?? 0)}
          </Box>
        </Box>
      ),
    },
    {
      field: 'BUTTOTAL',
      headerName: 'Buts',
      type: 'number',
      minWidth: 90,
      width: 90,
      maxWidth: 90,
      flex: 0,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (value) => Number(value ?? 0),
    },
    {
      field: 'PASSETOTAL',
      headerName: 'Passes',
      type: 'number',
      minWidth: 90,
      width: 90,
      maxWidth: 90,
      flex: 0,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (value) => Number(value ?? 0),
    },
    {
      field: 'JAUNETOTAL',
      headerName: 'Avert.',
      type: 'number',
      minWidth: 90,
      width: 90,
      maxWidth: 90,
      flex: 0,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (value) => Number(value ?? 0),
    },
    {
      field: 'ROUGETOTAL',
      headerName: 'Exclu.',
      type: 'number',
      minWidth: 90,
      width: 90,
      maxWidth: 90,
      flex: 0,
      align: 'right',
      headerAlign: 'right',
      valueGetter: (value) => Number(value ?? 0),
    },
  ], []);

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
    setPhotoDraft(undefined);
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

  useEffect(() => {
    if (!open || mode !== 'edit') {
      setHistoryRows([]);
      setHistorySelection([]);
      setHistoryLoading(false);
      return;
    }

    const idJoueur = normalizeNullableText(values.IDJOUEUR);
    if (!idJoueur) {
      setHistoryRows([]);
      setHistorySelection([]);
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);
    void fetchJoueurHistory(idJoueur)
      .then((rows) => {
        setHistoryRows(rows);
        setHistorySelection([]);
      })
      .catch(() => {
        setHistoryRows([]);
        setHistorySelection([]);
      })
      .finally(() => setHistoryLoading(false));
  }, [mode, open, values.IDJOUEUR]);

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
      if (photoDraft === undefined) {
        delete payload.PHOTO;
      } else {
        payload.PHOTO = photoDraft;
      }
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
          <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
          <EntityImageFrame
            width={120}
            height={150}
            loading={photoDraft === undefined && existingPhoto.loading}
            src={photoDraft === undefined ? existingPhoto.src : photoDraft}
            alt="Portrait du joueur"
            objectFit="contain"
            editable
            accept="image/jpeg,image/png,image/webp"
            onChangeImage={(nextValue) => {
              setPhotoDraft(nextValue);
              setErrors((prev) => ({ ...prev, photo: '' }));
            }}
            onActionError={(message) => setErrors((prev) => ({ ...prev, photo: message }))}
            actionLabels={{
              upload: 'Importer une photo',
              paste: 'Coller une photo depuis le presse-papiers',
              clear: 'Supprimer la photo',
            }}
            fallback={(
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
            )}
          />

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
            <DateInputField
              label="Né le"
              value={birthDateDisplay}
              onChange={(nextDate) => setValues((prev) => ({ ...prev, NAISSANCE: nextDate }))}
              sx={{ width: 152, flexShrink: 0 }}
              calendarAriaLabel="Calendrier naissance"
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
            <DateInputField
              label="Décédé le"
              value={deathDateDisplay}
              onChange={(nextDate) => setValues((prev) => ({ ...prev, DECES: nextDate }))}
              sx={{ width: 152, flexShrink: 0 }}
              calendarAriaLabel="Calendrier décès"
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
          </Stack>

          <Box
            sx={{
              width: { xs: '100%', lg: 450 },
              minWidth: { lg: 390 },
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Box
              sx={{
                height: 340,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <EntityDataGrid
                rows={historyRows}
                columns={historyColumns}
                loading={historyLoading}
                getRowId={(row) => row.JOCLEUNIK}
                selection={historySelection}
                onSelectionChange={setHistorySelection}
                disableRowSelectionOnClick
                pageSizeOptions={[5, 10, 25]}
                density="compact"
                label="Historique du Club"
                showToolbar
              />
            </Box>
          </Box>
        </Stack>
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
          title={mode === 'create' ? 'Nouveau Joueur' : 'Modifier un Joueur'}
          saving={saving}
          onSave={() => void handleSave()}
          maxWidth="lg"
        >
          {content}
        </EntityFormDialog>
      )}

      <TerrainVilleSelector
        open={villeSelectorOpen}
        onClose={() => setVilleSelectorOpen(false)}
        onSelect={handleVilleSelect}
      />
    </>
  );
}
