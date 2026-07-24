import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  InputAdornment,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
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
import { createJoueurHistory, deleteJoueurHistory, fetchJoueurHistory, fetchSaisons, updateJoueurHistory } from './joueurApi';
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

interface JoueurHistoryDialogDraft {
  saison: string;
  poste: string;
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyDialogMode, setHistoryDialogMode] = useState<'create' | 'edit'>('create');
  const [historyDialogId, setHistoryDialogId] = useState<number | null>(null);
  const [historyDialogSaving, setHistoryDialogSaving] = useState(false);
  const [historyDialogDraft, setHistoryDialogDraft] = useState<JoueurHistoryDialogDraft>({ saison: '', poste: '' });
  const [historyDeleteConfirmOpen, setHistoryDeleteConfirmOpen] = useState(false);
  const [historyDeleteSaving, setHistoryDeleteSaving] = useState(false);
  const [saisonOptions, setSaisonOptions] = useState<string[]>([]);

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

  const selectedHistoryId = Number(historySelection[0] ?? 0);
  const selectedHistoryRow = historyRows.find((historyRow) => Number(historyRow.JOCLEUNIK) === selectedHistoryId);

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

  useEffect(() => {
    if (!open) {
      setSaisonOptions([]);
      return;
    }

    void fetchSaisons()
      .then((rows) => {
        const seasons = Array.from(new Set(rows.map((row) => String(row.SAISON ?? '').trim()).filter(Boolean)));
        setSaisonOptions(seasons);
      })
      .catch(() => setSaisonOptions([]));
  }, [open]);

  const reloadHistory = async () => {
    const idJoueur = normalizeNullableText(values.IDJOUEUR);
    if (!idJoueur) {
      setHistoryRows([]);
      setHistorySelection([]);
      return;
    }

    setHistoryLoading(true);
    try {
      const rows = await fetchJoueurHistory(idJoueur);
      setHistoryRows(rows);
      setHistorySelection([]);
    } catch {
      setHistoryRows([]);
      setHistorySelection([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryCreateDialog = () => {
    const latestSeasonPoste = historyRows[0]?.POSTE;
    const currentPoste = Number(values.POSTE ?? 0);
    const resolvedDefaultPoste = Number.isInteger(Number(latestSeasonPoste)) && Number(latestSeasonPoste) > 0
      ? String(latestSeasonPoste)
      : Number.isInteger(currentPoste) && currentPoste > 0
        ? String(currentPoste)
        : posteSelectOptions[0]
          ? String(posteSelectOptions[0].value)
          : '';

    setHistoryDialogMode('create');
    setHistoryDialogId(null);
    setHistoryDialogDraft({
      saison: saisonOptions[0] ?? '',
      poste: resolvedDefaultPoste,
    });
    setHistoryDialogOpen(true);
  };

  const openHistoryEditDialog = (historyRow?: JoueurHistoryRow) => {
    const rowToEdit = historyRow ?? selectedHistoryRow;
    if (!rowToEdit) {
      setErrors((prev) => ({ ...prev, history: 'Selectionnez une saison a modifier.' }));
      return;
    }

    setHistoryDialogMode('edit');
    setHistoryDialogId(Number(rowToEdit.JOCLEUNIK));
    setHistoryDialogDraft({
      saison: String(rowToEdit.SAISON ?? ''),
      poste: String(rowToEdit.POSTE ?? ''),
    });
    setHistoryDialogOpen(true);
  };

  const openHistoryDeleteConfirm = () => {
    if (!selectedHistoryRow) {
      setErrors((prev) => ({ ...prev, history: 'Selectionnez une saison a supprimer.' }));
      return;
    }
    setHistoryDeleteConfirmOpen(true);
  };

  const handleHistoryDialogSave = async () => {
    const idJoueur = normalizeNullableText(values.IDJOUEUR);
    const saison = String(historyDialogDraft.saison ?? '').trim();
    const poste = String(historyDialogDraft.poste ?? '').trim();

    if (!idJoueur) {
      setErrors((prev) => ({ ...prev, history: 'Identifiant joueur invalide.' }));
      return;
    }
    if (!saison) {
      setErrors((prev) => ({ ...prev, history: 'La saison est requise.' }));
      return;
    }
    if (!poste) {
      setErrors((prev) => ({ ...prev, history: 'Le poste est requis.' }));
      return;
    }

    setHistoryDialogSaving(true);
    try {
      if (historyDialogMode === 'create') {
        await createJoueurHistory(idJoueur, { saison, poste });
      } else {
        if (!historyDialogId) {
          setErrors((prev) => ({ ...prev, history: 'Historique invalide.' }));
          return;
        }
        await updateJoueurHistory(idJoueur, historyDialogId, { saison, poste });
      }

      await reloadHistory();
      setHistoryDialogOpen(false);
      setErrors((prev) => ({ ...prev, history: '' }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, history: String((error as { message?: string })?.message ?? 'Erreur de sauvegarde.') }));
    } finally {
      setHistoryDialogSaving(false);
    }
  };

  const handleHistoryDeleteConfirm = async () => {
    const idJoueur = normalizeNullableText(values.IDJOUEUR);
    if (!idJoueur || !selectedHistoryRow) {
      setHistoryDeleteConfirmOpen(false);
      return;
    }

    setHistoryDeleteSaving(true);
    try {
      await deleteJoueurHistory(idJoueur, selectedHistoryRow.JOCLEUNIK);
      await reloadHistory();
      setHistoryDeleteConfirmOpen(false);
      setErrors((prev) => ({ ...prev, history: '' }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, history: String((error as { message?: string })?.message ?? 'Erreur de suppression.') }));
    } finally {
      setHistoryDeleteSaving(false);
    }
  };

  const handleHistoryRowDoubleClick = (rowId: GridRowId) => {
    const clicked = historyRows.find((historyRow) => Number(historyRow.JOCLEUNIK) === Number(rowId));
    if (!clicked) return;
    setHistorySelection([clicked.JOCLEUNIK]);
    openHistoryEditDialog(clicked);
  };

  const historyActions = (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title="Ajouter">
        {isMobile ? (
          <IconButton size="small" color="primary" aria-label="Ajouter" onClick={openHistoryCreateDialog} disabled={!normalizeNullableText(values.IDJOUEUR)}>
            <AddCircleOutlineRoundedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" variant="outlined" startIcon={<AddCircleOutlineRoundedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={openHistoryCreateDialog} disabled={!normalizeNullableText(values.IDJOUEUR)}>
            Ajouter
          </Button>
        )}
      </Tooltip>
      <Tooltip title="Modifier">
        {isMobile ? (
          <IconButton size="small" color="primary" aria-label="Modifier" onClick={() => openHistoryEditDialog()} disabled={!selectedHistoryRow}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={() => openHistoryEditDialog()} disabled={!selectedHistoryRow}>
            Modifier
          </Button>
        )}
      </Tooltip>
      <Tooltip title="Supprimer">
        {isMobile ? (
          <IconButton size="small" color="error" aria-label="Supprimer" onClick={openHistoryDeleteConfirm} disabled={!selectedHistoryRow}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" color="error" variant="outlined" startIcon={<DeleteOutlineRoundedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={openHistoryDeleteConfirm} disabled={!selectedHistoryRow}>
            Supprimer
          </Button>
        )}
      </Tooltip>
    </Stack>
  );

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
                <PersonRoundedIcon sx={{ fontSize: 64 }} />
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
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Historique dans le Club
              </Typography>
              {historyActions}
            </Stack>
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
                onRowDoubleClick={handleHistoryRowDoubleClick}
                disableRowSelectionOnClick
                pageSizeOptions={[5, 10, 25]}
                density="compact"
                label="Historique dans le Club"
              />
            </Box>
            {errors.history ? <Typography sx={{ color: 'error.main', fontSize: '0.75rem' }}>{errors.history}</Typography> : null}
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

      <Dialog open={historyDialogOpen} onClose={() => { if (!historyDialogSaving) setHistoryDialogOpen(false); }} fullWidth maxWidth="sm">
        <DialogTitle>{historyDialogMode === 'create' ? 'Ajouter une saison' : 'Modifier une saison'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.75 }}>
            <Autocomplete
              options={saisonOptions}
              getOptionLabel={(option) => option}
              value={historyDialogDraft.saison || null}
              onChange={(_, option) => setHistoryDialogDraft((prev) => ({ ...prev, saison: String(option ?? '') }))}
              renderInput={(params) => <TextField {...params} label="Saison" size="small" />}
              size="small"
            />

            <Autocomplete
              options={posteSelectOptions}
              getOptionLabel={(option) => option.label}
              value={posteSelectOptions.find((option) => String(option.value) === historyDialogDraft.poste) ?? null}
              onChange={(_, option) => setHistoryDialogDraft((prev) => ({ ...prev, poste: option ? String(option.value) : '' }))}
              renderInput={(params) => <TextField {...params} label="Poste" size="small" />}
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)} disabled={historyDialogSaving}>Annuler</Button>
          <Button variant="contained" onClick={() => void handleHistoryDialogSave()} disabled={historyDialogSaving}>OK</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={historyDeleteConfirmOpen} onClose={() => { if (!historyDeleteSaving) setHistoryDeleteConfirmOpen(false); }}>
        <DialogTitle>Supprimer une saison</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Confirmez-vous la suppression de cette saison dans l historique du club ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDeleteConfirmOpen(false)} disabled={historyDeleteSaving}>Annuler</Button>
          <Button color="error" variant="contained" onClick={() => void handleHistoryDeleteConfirm()} disabled={historyDeleteSaving}>Supprimer</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
