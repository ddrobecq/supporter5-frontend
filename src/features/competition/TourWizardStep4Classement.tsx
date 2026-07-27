import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import {
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { type GridColDef, type GridRowId } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { EntityFormDialog } from '../../components/EntityFormDialog';
import { toErrorMessage } from '../../components/useEntityPage';
import {
  createTourQualif,
  deleteTourQualif,
  fetchTourQualifs,
  updateTourQualif,
  type CreateQualifPayload,
} from './competitionApi';
import type { QualifRow } from './types';

interface TourWizardStep4ClassementProps {
  tourId: number;
  onError?: (message: string) => void;
}

type DialogMode = 'create' | 'edit';

interface QualifDraft {
  CLASS_MinRang: string;
  CLASS_MaxRang: string;
  colorCss: string;
  CLASS_Libelle: string;
  CLASS_Type: string;
  CLASS_Abrege: string;
}

const TYPE_OPTIONS = [
  { value: 1, label: 'Titre' },
  { value: 2, label: 'Qualification' },
  { value: 3, label: 'Promotion' },
  { value: 4, label: 'Relégation' },
  { value: 5, label: 'Elimination' },
] as const;

const TYPE_LABEL_BY_VALUE = new Map<number, string>(TYPE_OPTIONS.map((option) => [option.value, option.label]));

function toCssColor(raw: unknown, fallback = '#6a6a6a'): string {
  const value = String(raw ?? '').trim();
  const numeric = Number(value);
  if (Number.isFinite(numeric) && Number.isInteger(numeric) && numeric >= 0 && numeric <= 0xFFFFFF) {
    const r = numeric & 0xff;
    const g = (numeric >> 8) & 0xff;
    const b = (numeric >> 16) & 0xff;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  const hex = value.startsWith('#') ? value : `#${value}`;
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return hex;
  }

  return fallback;
}

function toDbColor(cssColor: string): number {
  const safe = /^#[0-9a-fA-F]{6}$/.test(cssColor) ? cssColor : '#6a6a6a';
  const r = Number.parseInt(safe.slice(1, 3), 16);
  const g = Number.parseInt(safe.slice(3, 5), 16);
  const b = Number.parseInt(safe.slice(5, 7), 16);
  return r + (g << 8) + (b << 16);
}

function createDraft(row?: QualifRow): QualifDraft {
  return {
    CLASS_MinRang: String(row?.CLASS_MinRang ?? ''),
    CLASS_MaxRang: String(row?.CLASS_MaxRang ?? ''),
    colorCss: toCssColor(row?.CLASS_Couleur),
    CLASS_Libelle: String(row?.CLASS_Libelle ?? ''),
    CLASS_Type: String(row?.CLASS_Type ?? 2),
    CLASS_Abrege: String(row?.CLASS_Abrege ?? ''),
  };
}

export function TourWizardStep4Classement({ tourId, onError }: TourWizardStep4ClassementProps) {
  const [rows, setRows] = useState<QualifRow[]>([]);
  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('create');
  const [draft, setDraft] = useState<QualifDraft>(createDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedId = Number(selection[0] ?? 0);
  const selectedRow = rows.find((row) => Number(row.CLASS_ID) === selectedId);

  const columns = useMemo<GridColDef<QualifRow>[]>(
    () => [
      { field: 'CLASS_MinRang', headerName: 'De', width: 56, minWidth: 56, maxWidth: 56 },
      { field: 'CLASS_MaxRang', headerName: 'A', width: 56, minWidth: 56, maxWidth: 56 },
      {
        field: 'CLASS_Couleur',
        headerName: 'Couleur',
        width: 110,
        minWidth: 110,
        maxWidth: 110,
        sortable: false,
        renderCell: (params) => (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
            <Box
              sx={{
                width: '100%',
                height: 14,
                borderRadius: 0.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: toCssColor(params.value),
              }}
            />
          </Box>
        ),
      },
      {
        field: 'CLASS_Libelle',
        headerName: 'Libellé',
        flex: 1,
        minWidth: 180,
        renderCell: (params) => {
          const explicit = String(params.value ?? '').trim();
          if (explicit) {
            return explicit;
          }
          return TYPE_LABEL_BY_VALUE.get(Number(params.row.CLASS_Type)) ?? '';
        },
      },
      { field: 'CLASS_Abrege', headerName: 'Abrégé', width: 70, minWidth: 70, maxWidth: 70 },
      {
        field: 'CLASS_Type',
        headerName: 'Type',
        width: 130,
        minWidth: 130,
        valueFormatter: (value) => TYPE_LABEL_BY_VALUE.get(Number(value)) ?? String(value ?? ''),
      },
    ],
    [],
  );

  const loadRows = async () => {
    if (!Number.isInteger(tourId) || tourId <= 0) {
      setRows([]);
      setSelection([]);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchTourQualifs(tourId);
      setRows(data);
      setSelection((prev) => {
        const id = Number(prev[0] ?? 0);
        if (id > 0 && data.some((row) => Number(row.CLASS_ID) === id)) {
          return prev;
        }
        return [];
      });
    } catch (error) {
      onError?.(toErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, [tourId]);

  const openCreateDialog = () => {
    const lastMax = rows.reduce((max, row) => Math.max(max, Number(row.CLASS_MaxRang) || 0), 0);
    setDialogMode('create');
    setDraft({
      CLASS_MinRang: String(lastMax + 1),
      CLASS_MaxRang: String(lastMax + 1),
      colorCss: '#2e7d32',
      CLASS_Libelle: '',
      CLASS_Type: '2',
      CLASS_Abrege: '',
    });
    setErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = () => {
    if (!selectedRow) {
      onError?.('Sélectionnez une ligne à modifier.');
      return;
    }
    setDialogMode('edit');
    setDraft(createDraft(selectedRow));
    setErrors({});
    setDialogOpen(true);
  };

  const validateDraft = (): boolean => {
    const nextErrors: Record<string, string> = {};

    const min = Number(draft.CLASS_MinRang);
    const max = Number(draft.CLASS_MaxRang);
    const type = Number(draft.CLASS_Type);
    const abrege = String(draft.CLASS_Abrege ?? '').trim();

    if (!Number.isInteger(min)) nextErrors.CLASS_MinRang = 'Valeur entière requise';
    if (!Number.isInteger(max)) nextErrors.CLASS_MaxRang = 'Valeur entière requise';
    if (Number.isInteger(min) && Number.isInteger(max) && max < min) {
      nextErrors.CLASS_MaxRang = 'Doit être supérieur ou égal au rang de départ';
    }
    if (![1, 2, 3, 4, 5].includes(type)) nextErrors.CLASS_Type = 'Type invalide';
    if (!abrege) nextErrors.CLASS_Abrege = 'Abrégé requis';
    if (abrege.length > 1) nextErrors.CLASS_Abrege = '1 caractère max';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = (): CreateQualifPayload => ({
    CLASS_MinRang: Number(draft.CLASS_MinRang),
    CLASS_MaxRang: Number(draft.CLASS_MaxRang),
    CLASS_Couleur: toDbColor(draft.colorCss),
    CLASS_Libelle: String(draft.CLASS_Libelle ?? '').trim(),
    CLASS_Type: Number(draft.CLASS_Type),
    TUCLEUNIK: tourId,
    CLASS_Abrege: String(draft.CLASS_Abrege ?? '').trim(),
  });

  const handleSaveDialog = async () => {
    if (!validateDraft()) return;

    setSaving(true);
    try {
      const payload = buildPayload();
      if (dialogMode === 'create') {
        await createTourQualif(payload);
      } else {
        if (!selectedRow) {
          onError?.('Sélectionnez une ligne à modifier.');
          return;
        }
        await updateTourQualif(selectedRow.CLASS_ID, payload);
      }

      setDialogOpen(false);
      await loadRows();
    } catch (error) {
      onError?.(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRow) {
      onError?.('Sélectionnez une ligne à supprimer.');
      return;
    }

    setSaving(true);
    try {
      await deleteTourQualif(selectedRow.CLASS_ID);
      setSelection([]);
      await loadRows();
    } catch (error) {
      onError?.(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={0.75} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2">Classement</Typography>
        <Stack direction="row" spacing={0.75}>
          <Tooltip title="Ajouter">
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddCircleOutlineRoundedIcon />}
              sx={{ minWidth: 0, px: 1.1 }}
              onClick={openCreateDialog}
              disabled={saving || loading}
            >
              Ajouter
            </Button>
          </Tooltip>
          <Tooltip title="Modifier">
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditRoundedIcon />}
              sx={{ minWidth: 0, px: 1.1 }}
              onClick={openEditDialog}
              disabled={saving || loading}
            >
              Modifier
            </Button>
          </Tooltip>
          <Tooltip title="Supprimer">
            <Button
              size="small"
              color="error"
              variant="outlined"
              startIcon={<DeleteOutlineRoundedIcon />}
              sx={{ minWidth: 0, px: 1.1 }}
              onClick={() => void handleDelete()}
              disabled={saving || loading}
            >
              Supprimer
            </Button>
          </Tooltip>
        </Stack>
      </Stack>

      <Box sx={{ height: 286, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <EntityDataGrid<QualifRow>
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.CLASS_ID}
          selection={selection}
          onSelectionChange={setSelection}
        />
      </Box>

      <EntityFormDialog
        open={dialogOpen}
        onClose={() => {
          if (saving) return;
          setDialogOpen(false);
        }}
        title={dialogMode === 'create' ? 'Ajouter un classement' : 'Modifier le classement'}
        saving={saving}
        onSave={() => void handleSaveDialog()}
        saveLabel="Enregistrer"
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <TextField
            label="Rang de"
            value={draft.CLASS_MinRang}
            onChange={(event) => {
              setDraft((prev) => ({ ...prev, CLASS_MinRang: event.target.value }));
              setErrors((prev) => ({ ...prev, CLASS_MinRang: '' }));
            }}
            type="number"
            size="small"
            fullWidth
            error={Boolean(errors.CLASS_MinRang)}
            helperText={errors.CLASS_MinRang}
          />
          <TextField
            label="à"
            value={draft.CLASS_MaxRang}
            onChange={(event) => {
              setDraft((prev) => ({ ...prev, CLASS_MaxRang: event.target.value }));
              setErrors((prev) => ({ ...prev, CLASS_MaxRang: '' }));
            }}
            type="number"
            size="small"
            fullWidth
            error={Boolean(errors.CLASS_MaxRang)}
            helperText={errors.CLASS_MaxRang}
          />
        </Stack>

        <TextField
          label="Couleur"
          type="color"
          value={draft.colorCss}
          onChange={(event) => setDraft((prev) => ({ ...prev, colorCss: event.target.value }))}
          size="small"
          fullWidth
        />

        <TextField
          label="Libellé"
          value={draft.CLASS_Libelle}
          onChange={(event) => setDraft((prev) => ({ ...prev, CLASS_Libelle: event.target.value }))}
          size="small"
          fullWidth
        />

        <TextField
          select
          label="Type"
          value={draft.CLASS_Type}
          onChange={(event) => {
            setDraft((prev) => ({ ...prev, CLASS_Type: event.target.value }));
            setErrors((prev) => ({ ...prev, CLASS_Type: '' }));
          }}
          size="small"
          fullWidth
          error={Boolean(errors.CLASS_Type)}
          helperText={errors.CLASS_Type}
        >
          {TYPE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={String(option.value)}>{option.label}</MenuItem>
          ))}
        </TextField>

        <TextField
          label="Abrégé"
          value={draft.CLASS_Abrege}
          onChange={(event) => {
            setDraft((prev) => ({ ...prev, CLASS_Abrege: event.target.value.slice(0, 1).toUpperCase() }));
            setErrors((prev) => ({ ...prev, CLASS_Abrege: '' }));
          }}
          size="small"
          fullWidth
          slotProps={{ htmlInput: { maxLength: 1 } }}
          error={Boolean(errors.CLASS_Abrege)}
          helperText={errors.CLASS_Abrege}
        />
      </EntityFormDialog>
    </Stack>
  );
}
