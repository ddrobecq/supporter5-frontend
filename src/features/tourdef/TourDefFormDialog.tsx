import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityFormDialog } from '../../components/EntityFormDialog';
import { NumberField } from '../../components/NumberField';
import { useDirtySignature } from '../../lib/useDirtySignature';
import type { TourDefRow } from './types';

interface TourDefFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  embedded?: boolean;
  primaryKey?: string;
  initialData?: TourDefRow;
  onDirtyChange?: (dirty: boolean) => void;
  onClose: () => void;
  onSubmit: (payload: TourDefRow) => Promise<void>;
  saveCount?: number;
}

type SortDirection = '+' | '-';

interface SortFieldOption {
  field: string;
  label: string;
}

interface TourDefDraft {
  TDCLEUNIK: string | number;
  NOM: string;
  TDTYPETOUR: number | '';
  ALLER_RETOUR: boolean;
  DUREE_TPS_REG: number | '';
  FIN_TPS_REG: number | '';
  DUREE_TPS_PROLONG: number | '';
  FIN_PROLONG: number | '';
  VALEUR_VD: number | '';
  VALEUR_VE: number | '';
  VALEUR_ND: number | '';
  VALEUR_NE: number | '';
  VALEUR_DD: number | '';
  VALEUR_DE: number | '';
  TDCalculDiffBut: number | '';
  CLASS_GAD: number | '';
  BONUS_TYPE: number | '';
  BONUS_NB_BUT: number | '';
  VALEUR_BONUS_V: number | '';
  VALEUR_BONUS_N: number | '';
  VALEUR_BONUS_D: number | '';
}

const FIN_TIME_REG_OPTIONS = [
  { value: 1, label: 'Fin du match' },
  { value: 2, label: 'Prolongation' },
  { value: 3, label: 'Match rejoue' },
  { value: 4, label: 'Tirage au sort' },
];

const FIN_PROLONG_OPTIONS = [
  { value: 1, label: 'But en Or' },
  { value: 2, label: 'But en Argent' },
  { value: 3, label: 'Tirs au but' },
  { value: 4, label: 'Rejoue' },
  { value: 5, label: 'Tirage au sort' },
];

const BONUS_TYPE_OPTIONS = [
  { value: 1, label: 'Aucun' },
  { value: 2, label: 'sur nombre de buts marques (bonus si superieur)' },
  { value: 3, label: 'sur difference de buts (bonus si superieur)' },
  { value: 4, label: 'sur nombre de buts marques (bonus par but)' },
];

const PARTICIP_SORT_FIELD_OPTIONS: SortFieldOption[] = [
  { field: 'PANbPoints', label: 'Points' },
  { field: 'PANbMatch', label: 'Nombre de matchs' },
  { field: 'PANbVD', label: 'Victoires domicile' },
  { field: 'PANbVE', label: 'Victoires exterieur' },
  { field: 'PANbND', label: 'Nuls domicile' },
  { field: 'PANbNE', label: 'Nuls exterieur' },
  { field: 'PANbDD', label: 'Defaites domicile' },
  { field: 'PANbDE', label: 'Defaites exterieur' },
  { field: 'PANbBPD', label: 'Buts pour domicile' },
  { field: 'PANbBCD', label: 'Buts contre domicile' },
  { field: 'PABonus', label: 'Bonus' },
  { field: 'PANbBPE', label: 'Buts pour exterieur' },
  { field: 'PANbBCE', label: 'Buts contre exterieur' },
  { field: 'PADiff', label: 'Difference de buts' },
  { field: 'PANbBP', label: 'Buts pour' },
  { field: 'PANbV', label: 'Victoires totales' },
  { field: 'PANbTaBP', label: 'TAB pour' },
  { field: 'PANbTaBC', label: 'TAB contre' },
  { field: 'PADiffTaB', label: 'Difference TAB' },
  { field: 'PANbBC', label: 'Buts contre' },
  { field: 'PARatio', label: 'Ratio BP / BC' },
];

function parseNumericInput(rawValue: string): number | '' {
  if (rawValue.trim() === '') return '';
  const parsed = Number(rawValue);
  return Number.isNaN(parsed) ? '' : parsed;
}

function toNumberOrDefault(value: number | '', fallback: number): number {
  if (value === '' || Number.isNaN(value)) return fallback;
  return Number(value);
}

function getSortFieldLabel(field: string): string {
  return PARTICIP_SORT_FIELD_OPTIONS.find((item) => item.field === field)?.label ?? field;
}

function normalizeSortBusinessLabel(label: string): string {
  return String(label ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSortTechnicalField(field: string): string {
  return String(field ?? '')
    .replace(/[^A-Za-z0-9_]/g, '')
    .trim();
}

function parseSortRules(raw: unknown): Array<{ field: string; direction: SortDirection }> {
  const lines = String(raw ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const parsed: Array<{ field: string; direction: SortDirection }> = [];
  for (const line of lines) {
    const match = line.match(/^([+-]).*\t\s*([A-Za-z0-9_]+)\s*$/);
    if (!match) continue;
    const direction: SortDirection = match[1] === '+' ? '+' : '-';
    const field = normalizeSortTechnicalField(match[2]);
    if (!field || field === 'IDCLUB') continue;
    if (!PARTICIP_SORT_FIELD_OPTIONS.some((item) => item.field === field)) continue;
    if (parsed.some((item) => item.field === field)) continue;
    parsed.push({ field, direction });
  }

  return parsed;
}

function buildSortKeyFromRules(rules: Array<{ field: string; direction: SortDirection }>): string {
  return rules
    .map((rule) => {
      const direction: SortDirection = rule.direction === '+' ? '+' : '-';
      const businessLabel = normalizeSortBusinessLabel(getSortFieldLabel(rule.field));
      const technicalField = normalizeSortTechnicalField(rule.field);
      return `${direction}${businessLabel}\t${technicalField}`;
    })
    .join('\n');
}

function createEmptyDraft(): TourDefDraft {
  return {
    TDCLEUNIK: '',
    NOM: '',
    TDTYPETOUR: '',
    ALLER_RETOUR: false,
    DUREE_TPS_REG: '',
    FIN_TPS_REG: '',
    DUREE_TPS_PROLONG: '',
    FIN_PROLONG: '',
    VALEUR_VD: 0,
    VALEUR_VE: 0,
    VALEUR_ND: 0,
    VALEUR_NE: 0,
    VALEUR_DD: 0,
    VALEUR_DE: 0,
    TDCalculDiffBut: '',
    CLASS_GAD: '',
    BONUS_TYPE: '',
    BONUS_NB_BUT: '',
    VALEUR_BONUS_V: '',
    VALEUR_BONUS_N: '',
    VALEUR_BONUS_D: '',
  };
}

function createDraftFromRow(row?: TourDefRow): TourDefDraft {
  if (!row) return createEmptyDraft();
  return {
    TDCLEUNIK: row.TDCLEUNIK ?? '',
    NOM: String(row.NOM ?? ''),
    TDTYPETOUR: Number(row.TDTYPETOUR ?? 0) || '',
    ALLER_RETOUR: Number(row.ALLER_RETOUR ?? 0) === 1,
    DUREE_TPS_REG: Number(row.DUREE_TPS_REG ?? 0) || '',
    FIN_TPS_REG: Number(row.FIN_TPS_REG ?? 0) || '',
    DUREE_TPS_PROLONG: Number(row.FIN_TPS_REG ?? 0) !== 2 ? 0 : Number(row.DUREE_TPS_PROLONG ?? 0) || '',
    FIN_PROLONG: Number(row.FIN_TPS_REG ?? 0) !== 2 ? 0 : Number(row.FIN_PROLONG ?? 0) || '',
    VALEUR_VD: row.VALEUR_VD != null ? Number(row.VALEUR_VD) : 0,
    VALEUR_VE: row.VALEUR_VE != null ? Number(row.VALEUR_VE) : 0,
    VALEUR_ND: row.VALEUR_ND != null ? Number(row.VALEUR_ND) : 0,
    VALEUR_NE: row.VALEUR_NE != null ? Number(row.VALEUR_NE) : 0,
    VALEUR_DD: row.VALEUR_DD != null ? Number(row.VALEUR_DD) : 0,
    VALEUR_DE: row.VALEUR_DE != null ? Number(row.VALEUR_DE) : 0,
    TDCalculDiffBut: Number(row.TDCalculDiffBut ?? 0) || '',
    CLASS_GAD: Number(row.CLASS_GAD ?? 0) || '',
    BONUS_TYPE: Number(row.BONUS_TYPE ?? 0) || '',
    BONUS_NB_BUT: Number(row.BONUS_NB_BUT ?? 0) || '',
    VALEUR_BONUS_V: Number(row.VALEUR_BONUS_V ?? 0) || '',
    VALEUR_BONUS_N: Number(row.VALEUR_BONUS_N ?? 0) || '',
    VALEUR_BONUS_D: Number(row.VALEUR_BONUS_D ?? 0) || '',
  };
}

function mapDraftToPayload(
  draft: TourDefDraft,
  sortRules: Array<{ field: string; direction: SortDirection }>,
): TourDefRow {
  return {
    ...(draft.TDCLEUNIK ? { TDCLEUNIK: draft.TDCLEUNIK } : {}),
    NOM: String(draft.NOM ?? '').trim(),
    TDTYPETOUR: toNumberOrDefault(draft.TDTYPETOUR, 1),
    ALLER_RETOUR: draft.ALLER_RETOUR ? 1 : 0,
    DUREE_TPS_REG: toNumberOrDefault(draft.DUREE_TPS_REG, 90),
    FIN_TPS_REG: toNumberOrDefault(draft.FIN_TPS_REG, 1),
    DUREE_TPS_PROLONG: draft.FIN_TPS_REG !== 2 ? 0 : toNumberOrDefault(draft.DUREE_TPS_PROLONG, 30),
    FIN_PROLONG: draft.FIN_TPS_REG !== 2 ? 0 : toNumberOrDefault(draft.FIN_PROLONG, 1),
    VALEUR_VD: toNumberOrDefault(draft.VALEUR_VD, 3),
    VALEUR_VE: toNumberOrDefault(draft.VALEUR_VE, 3),
    VALEUR_ND: toNumberOrDefault(draft.VALEUR_ND, 1),
    VALEUR_NE: toNumberOrDefault(draft.VALEUR_NE, 1),
    VALEUR_DD: toNumberOrDefault(draft.VALEUR_DD, 0),
    VALEUR_DE: toNumberOrDefault(draft.VALEUR_DE, 0),
    TDCalculDiffBut: toNumberOrDefault(draft.TDCalculDiffBut, 1),
    CLASS_GAD: toNumberOrDefault(draft.CLASS_GAD, 1),
    BONUS_TYPE: toNumberOrDefault(draft.BONUS_TYPE, 1),
    BONUS_NB_BUT: toNumberOrDefault(draft.BONUS_NB_BUT, 0),
    VALEUR_BONUS_V: toNumberOrDefault(draft.VALEUR_BONUS_V, 0),
    VALEUR_BONUS_N: toNumberOrDefault(draft.VALEUR_BONUS_N, 0),
    VALEUR_BONUS_D: toNumberOrDefault(draft.VALEUR_BONUS_D, 0),
    TDCLEFTRI: buildSortKeyFromRules(sortRules),
  };
}

export function TourDefFormDialog({
  open,
  mode,
  embedded = false,
  primaryKey,
  initialData,
  onDirtyChange,
  onClose,
  onSubmit,
  saveCount = 0,
}: TourDefFormDialogProps) {
  const [values, setValues] = useState<TourDefDraft>(createEmptyDraft());
  const [sortRules, setSortRules] = useState<Array<{ field: string; direction: SortDirection }>>([]);
  const [selectedAvailableSortField, setSelectedAvailableSortField] = useState<string | null>(null);
  const [selectedChosenSortField, setSelectedChosenSortField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { setInitialSignature, syncDirty, markClean } = useDirtySignature(open, onDirtyChange);

  useEffect(() => {
    if (!open) return;
    const draft = createDraftFromRow(initialData);
    const parsedSortRules = parseSortRules(initialData?.TDCLEFTRI);
    setValues(draft);
    setSortRules(parsedSortRules);
    setSelectedAvailableSortField(null);
    setSelectedChosenSortField(null);
    setErrors({});
    setInitialSignature(JSON.stringify({ values: draft, sortRules: parsedSortRules }));
  }, [open, initialData, setInitialSignature]);

  useEffect(() => {
    syncDirty(JSON.stringify({ values, sortRules }));
  }, [syncDirty, values, sortRules]);

  const availableSortFields = useMemo(() => {
    const chosen = new Set(sortRules.map((item) => item.field));
    return PARTICIP_SORT_FIELD_OPTIONS.filter((item) => !chosen.has(item.field));
  }, [sortRules]);

  const selectedChosenSortFieldIndex = useMemo(
    () => sortRules.findIndex((item) => item.field === selectedChosenSortField),
    [sortRules, selectedChosenSortField],
  );

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!String(values.NOM ?? '').trim()) nextErrors.NOM = 'Nom requis';
    if (values.TDTYPETOUR === '') nextErrors.TDTYPETOUR = 'Type de tour requis';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleAddSortFieldByName = (field: string) => {
    if (!field) return;
    if (sortRules.some((item) => item.field === field)) return;
    setSortRules((prev) => [...prev, { field, direction: '-' }]);
    setSelectedChosenSortField(field);
    setSelectedAvailableSortField(null);
  };

  const handleRemoveSortFieldByName = (field: string) => {
    if (!field) return;
    setSortRules((prev) => prev.filter((item) => item.field !== field));
    setSelectedAvailableSortField(field);
    setSelectedChosenSortField(null);
  };

  const handleToggleSortDirection = () => {
    if (!selectedChosenSortField) return;
    setSortRules((prev) => prev.map((item) => {
      if (item.field !== selectedChosenSortField) return item;
      return { ...item, direction: item.direction === '-' ? '+' : '-' };
    }));
  };

  const handleMoveSortFieldUp = () => {
    if (selectedChosenSortFieldIndex <= 0) return;
    setSortRules((prev) => {
      const next = [...prev];
      [next[selectedChosenSortFieldIndex - 1], next[selectedChosenSortFieldIndex]]
        = [next[selectedChosenSortFieldIndex], next[selectedChosenSortFieldIndex - 1]];
      return next;
    });
  };

  const handleMoveSortFieldDown = () => {
    if (selectedChosenSortFieldIndex < 0 || selectedChosenSortFieldIndex >= sortRules.length - 1) return;
    setSortRules((prev) => {
      const next = [...prev];
      [next[selectedChosenSortFieldIndex], next[selectedChosenSortFieldIndex + 1]]
        = [next[selectedChosenSortFieldIndex + 1], next[selectedChosenSortFieldIndex]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = mapDraftToPayload(values, sortRules);
      await onSubmit(payload);
      markClean();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  useEffect(() => {
    if (saveCount > 0) void handleSaveRef.current();
  }, [saveCount]);

  const content = (
    <Stack spacing={1.25}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
        <TextField
          label="Identifiant"
          value={String(values.TDCLEUNIK ?? '')}
          onChange={(event) => setValues((prev) => ({ ...prev, TDCLEUNIK: event.target.value }))}
          size="small"
          fullWidth
          disabled={mode === 'edit' && Boolean(primaryKey)}
        />
        <TextField
          label="Nom"
          value={values.NOM}
          onChange={(event) => setValues((prev) => ({ ...prev, NOM: event.target.value }))}
          size="small"
          fullWidth
          error={Boolean(errors.NOM)}
          helperText={errors.NOM}
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
        <FormControl fullWidth size="small" error={Boolean(errors.TDTYPETOUR)}>
          <InputLabel id="tourdef-type-label">Type de tour</InputLabel>
          <Select
            labelId="tourdef-type-label"
            label="Type de tour"
            value={values.TDTYPETOUR === '' ? '' : String(values.TDTYPETOUR)}
            onChange={(event) => setValues((prev) => ({ ...prev, TDTYPETOUR: parseNumericInput(event.target.value) }))}
          >
            <MenuItem value="">Aucune selection</MenuItem>
            <MenuItem value="1">Ligue</MenuItem>
            <MenuItem value="2">Eliminatoire</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch checked={values.ALLER_RETOUR} onChange={(event) => setValues((prev) => ({ ...prev, ALLER_RETOUR: event.target.checked }))} />}
          label="Format aller/retour"
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
        <NumberField
          label="Duree temps reglementaire"
          value={String(values.DUREE_TPS_REG)}
          onChange={(v) => setValues((prev) => ({ ...prev, DUREE_TPS_REG: v === '' ? '' : Number(v) }))}
          fullWidth
        />
        <FormControl fullWidth size="small">
          <InputLabel id="tourdef-fin-reg-label">Fin temps reglementaire</InputLabel>
          <Select
            labelId="tourdef-fin-reg-label"
            label="Fin temps reglementaire"
            value={values.FIN_TPS_REG === '' ? '' : String(values.FIN_TPS_REG)}
            onChange={(event) => {
              const FIN_TPS_REG = parseNumericInput(event.target.value);
              setValues((prev) => ({
                ...prev,
                FIN_TPS_REG,
                ...(FIN_TPS_REG !== 2 ? { DUREE_TPS_PROLONG: 0, FIN_PROLONG: 0 } : {}),
              }));
            }}
          >
            <MenuItem value="">Aucune selection</MenuItem>
            {FIN_TIME_REG_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={String(option.value)}>{option.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
        <NumberField
          label="Duree prolongation"
          value={String(values.DUREE_TPS_PROLONG)}
          onChange={(v) => setValues((prev) => ({ ...prev, DUREE_TPS_PROLONG: v === '' ? '' : Number(v) }))}
          fullWidth
          disabled={values.FIN_TPS_REG !== 2}
        />
        <FormControl fullWidth size="small">
          <InputLabel id="tourdef-fin-prolong-label">Fin prolongation</InputLabel>
          <Select
            labelId="tourdef-fin-prolong-label"
            label="Fin prolongation"
            value={values.FIN_PROLONG === '' ? '' : String(values.FIN_PROLONG)}
            onChange={(event) => setValues((prev) => ({ ...prev, FIN_PROLONG: parseNumericInput(event.target.value) }))}
            disabled={values.FIN_TPS_REG !== 2}
          >
            <MenuItem value="">Aucune selection</MenuItem>
            {FIN_PROLONG_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={String(option.value)}>{option.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Attribution des points</Typography>
      <Stack direction="row" spacing={1.25}>
        <Stack spacing={1.25} sx={{ flex: 1 }}>
          <NumberField label="Victoire Dom." value={String(values.VALEUR_VD)} onChange={(v) => setValues((prev) => ({ ...prev, VALEUR_VD: v === '' ? '' : Number(v) }))} fullWidth />
          <NumberField label="Victoire Ext." value={String(values.VALEUR_VE)} onChange={(v) => setValues((prev) => ({ ...prev, VALEUR_VE: v === '' ? '' : Number(v) }))} fullWidth />
        </Stack>
        <Stack spacing={1.25} sx={{ flex: 1 }}>
          <NumberField label="Nul Dom." value={String(values.VALEUR_ND)} onChange={(v) => setValues((prev) => ({ ...prev, VALEUR_ND: v === '' ? '' : Number(v) }))} fullWidth />
          <NumberField label="Nul Ext." value={String(values.VALEUR_NE)} onChange={(v) => setValues((prev) => ({ ...prev, VALEUR_NE: v === '' ? '' : Number(v) }))} fullWidth />
        </Stack>
        <Stack spacing={1.25} sx={{ flex: 1 }}>
          <NumberField label="Défaite Dom." value={String(values.VALEUR_DD)} onChange={(v) => setValues((prev) => ({ ...prev, VALEUR_DD: v === '' ? '' : Number(v) }))} fullWidth />
          <NumberField label="Défaite Ext." value={String(values.VALEUR_DE)} onChange={(v) => setValues((prev) => ({ ...prev, VALEUR_DE: v === '' ? '' : Number(v) }))} fullWidth />
        </Stack>
      </Stack>

      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Goalaverage</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
        <FormControl fullWidth size="small">
          <InputLabel id="tourdef-diff-mode-label">Mode de calcul</InputLabel>
          <Select
            labelId="tourdef-diff-mode-label"
            label="Mode de calcul"
            value={values.TDCalculDiffBut === '' ? '' : String(values.TDCalculDiffBut)}
            onChange={(event) => setValues((prev) => ({ ...prev, TDCalculDiffBut: parseNumericInput(event.target.value) }))}
          >
            <MenuItem value="">Aucune selection</MenuItem>
            <MenuItem value="1">Difference (BP - BC)</MenuItem>
            <MenuItem value="2">Ratio (BP / BC)</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel id="tourdef-class-gad-label">Scope</InputLabel>
          <Select
            labelId="tourdef-class-gad-label"
            label="Scope"
            value={values.CLASS_GAD === '' ? '' : String(values.CLASS_GAD)}
            onChange={(event) => setValues((prev) => ({ ...prev, CLASS_GAD: parseNumericInput(event.target.value) }))}
          >
            <MenuItem value="">Aucune selection</MenuItem>
            <MenuItem value="1">Direct</MenuItem>
            <MenuItem value="2">General</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Bonus</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
        <FormControl fullWidth size="small">
          <InputLabel id="tourdef-bonus-type-label">Type de bonus</InputLabel>
          <Select
            labelId="tourdef-bonus-type-label"
            label="Type de bonus"
            value={values.BONUS_TYPE === '' ? '' : String(values.BONUS_TYPE)}
            onChange={(event) => setValues((prev) => ({ ...prev, BONUS_TYPE: parseNumericInput(event.target.value) }))}
          >
            <MenuItem value="">Aucune selection</MenuItem>
            {BONUS_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={String(option.value)}>{option.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <NumberField label="Seuil bonus" value={String(values.BONUS_NB_BUT)} onChange={(v) => setValues((prev) => ({ ...prev, BONUS_NB_BUT: v === '' ? '' : Number(v) }))} fullWidth disabled={values.BONUS_TYPE === 1} />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
        <NumberField label="Bonus victoire" value={String(values.VALEUR_BONUS_V)} onChange={(v) => setValues((prev) => ({ ...prev, VALEUR_BONUS_V: v === '' ? '' : Number(v) }))} fullWidth disabled={values.BONUS_TYPE === 1} />
        <NumberField label="Bonus nul" value={String(values.VALEUR_BONUS_N)} onChange={(v) => setValues((prev) => ({ ...prev, VALEUR_BONUS_N: v === '' ? '' : Number(v) }))} fullWidth disabled={values.BONUS_TYPE === 1} />
        <NumberField label="Bonus defaite" value={String(values.VALEUR_BONUS_D)} onChange={(v) => setValues((prev) => ({ ...prev, VALEUR_BONUS_D: v === '' ? '' : Number(v) }))} fullWidth disabled={values.BONUS_TYPE === 1} />
      </Stack>

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Ordre de tri</Typography>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'stretch', flexWrap: 'nowrap' }}>
          <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, minHeight: 220, overflow: 'auto' }}>
            <Typography variant="caption" sx={{ display: 'block', px: 1.25, py: 0.75, color: 'text.secondary' }}>
              Tous les champs de PARTICIP
            </Typography>
            <List dense disablePadding sx={{ py: 0 }}>
              {availableSortFields.map((item) => (
                <ListItemButton
                  key={item.field}
                  selected={selectedAvailableSortField === item.field}
                  sx={{ minHeight: 28, py: 0.25, px: 1.25 }}
                  onClick={() => {
                    setSelectedAvailableSortField(item.field);
                    setSelectedChosenSortField(null);
                  }}
                  onDoubleClick={() => handleAddSortFieldByName(item.field)}
                >
                  <ListItemText primary={<Typography variant="body2" noWrap>{item.label}</Typography>} />
                </ListItemButton>
              ))}
            </List>
          </Paper>

          <Stack spacing={0.75} sx={{ justifyContent: 'center', minWidth: 44, flexShrink: 0 }}>
            <Button size="small" variant="outlined" sx={{ minWidth: 36, px: 0.75 }} onClick={() => selectedAvailableSortField && handleAddSortFieldByName(selectedAvailableSortField)} disabled={!selectedAvailableSortField}>+</Button>
            <Button size="small" variant="outlined" sx={{ minWidth: 36, px: 0.75 }} onClick={() => selectedChosenSortField && handleRemoveSortFieldByName(selectedChosenSortField)} disabled={!selectedChosenSortField}>-</Button>
            <Button size="small" variant="outlined" sx={{ minWidth: 36, px: 0.75 }} onClick={handleToggleSortDirection} disabled={!selectedChosenSortField}>+/-</Button>
            <Button size="small" variant="outlined" sx={{ minWidth: 36, px: 0.75 }} onClick={handleMoveSortFieldUp} disabled={selectedChosenSortFieldIndex <= 0}>↑</Button>
            <Button size="small" variant="outlined" sx={{ minWidth: 36, px: 0.75 }} onClick={handleMoveSortFieldDown} disabled={selectedChosenSortFieldIndex < 0 || selectedChosenSortFieldIndex >= sortRules.length - 1}>↓</Button>
          </Stack>

          <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, minHeight: 220, overflow: 'auto' }}>
            <Typography variant="caption" sx={{ display: 'block', px: 1.25, py: 0.75, color: 'text.secondary' }}>
              Champs choisis pour le classement
            </Typography>
            <List dense disablePadding sx={{ py: 0 }}>
              {sortRules.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 1.25, py: 1.5 }}>
                  Aucun champ choisi.
                </Typography>
              ) : (
                sortRules.map((rule) => {
                  const selected = selectedChosenSortField === rule.field;
                  return (
                    <ListItemButton
                      key={rule.field}
                      selected={selected}
                      sx={{ minHeight: 28, py: 0.25, px: 1.25 }}
                      onClick={() => {
                        setSelectedChosenSortField(rule.field);
                        setSelectedAvailableSortField(null);
                      }}
                      onDoubleClick={() => handleRemoveSortFieldByName(rule.field)}
                    >
                      <ListItemText
                        primary={<Typography variant="body2" noWrap>{`${rule.direction === '-' ? '↓' : '↑'} ${getSortFieldLabel(rule.field)}`}</Typography>}
                      />
                    </ListItemButton>
                  );
                })
              )}
            </List>
          </Paper>
        </Stack>
      </Box>
    </Stack>
  );

  if (embedded) {
    return (
      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
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

  const title = mode === 'create' ? 'Nouvelle definition de tour' : 'Modifier une definition de tour';
  return (
    <EntityFormDialog open={open} onClose={onClose} title={title} saving={saving} onSave={handleSave} saveLabel="Enregistrer">
      {content}
    </EntityFormDialog>
  );
}
