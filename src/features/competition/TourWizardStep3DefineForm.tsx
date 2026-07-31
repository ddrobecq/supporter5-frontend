import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormControl,
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
import { toErrorMessage } from '../../components/useEntityPage';
import { createTourDef, fetchTourDefsByType, fetchTourDefById, type CreateTourDefPayload } from './competitionApi';
import type { TourDefRow } from './types';

interface TourDefFormState {
  tourDefId: number;
  nom: string;
  dureeRegTime: number;
  dureeProlongTime: number;
  finTpsReg: number;
  finProlong: number;
  allerRetour: boolean;
  valeurVD: number;
  valeurVE: number;
  valeurND: number;
  valeurNE: number;
  valeurDD: number;
  valeurDE: number;
  tdCalculDiffBut: number;
  classGadScope: number;
  valeurBe: boolean;
  bonusType: number;
  bonusNbBut: number;
  valeurBonusV: number;
  valeurBonusN: number;
  valeurBonusD: number;
}

interface SortKeyRule {
  direction: '+' | '-';
  businessLabel: string;
  technicalField: string;
}

interface SortFieldOption {
  field: string;
  label: string;
}

interface TourDefCreateDraft {
  NOM: string;
  ALLER_RETOUR: boolean;
  VALEUR_VD: number | '';
  VALEUR_VE: number | '';
  VALEUR_ND: number | '';
  VALEUR_NE: number | '';
  VALEUR_DD: number | '';
  VALEUR_DE: number | '';
  BONUS_TYPE: number | '';
  BONUS_NB_BUT: number | '';
  VALEUR_BONUS_V: number | '';
  VALEUR_BONUS_N: number | '';
  VALEUR_BONUS_D: number | '';
  DUREE_TPS_REG: number | '';
  DUREE_TPS_PROLONG: number | '';
  CLASS_GAD: number | '';
  VALEUR_BE: boolean;
  FIN_PROLONG: number | '';
  FIN_TPS_REG: number | '';
  TDCLEFTRI: string;
  TDCalculDiffBut: number | '';
}

interface TourWizardStep3DefineFormProps {
  tourType: 'ligue' | 'eliminatoire';
  initialTourDefId?: number;
  onTourDefChange?: (tourDefId: number) => void;
  onError?: (message: string) => void;
}

const FIN_TIME_REG_OPTIONS = [
  { value: 1, label: 'Fin du match' },
  { value: 2, label: 'Prolongation' },
  { value: 3, label: 'Match rejoué' },
  { value: 4, label: 'Tirage au sort' },
];

const FIN_PROLONG_OPTIONS = [
  { value: 1, label: 'But en Or' },
  { value: 2, label: 'But en Argent' },
  { value: 3, label: 'Tirs au but' },
  { value: 4, label: 'Rejoué' },
  { value: 5, label: 'Tirage au sort' },
];

const BONUS_TYPE_OPTIONS = [
  { value: 1, label: 'Aucun' },
  { value: 2, label: 'sur nombre de buts marqués (bonus si supérieur)' },
  { value: 3, label: 'sur différence de buts (bonus si supérieur)' },
  { value: 4, label: 'sur nombre de buts marqués (bonus par but)' },
];

const PARTICIP_SORT_FIELD_OPTIONS: SortFieldOption[] = [
  { field: 'PANbPoints', label: 'Points' },
  { field: 'PANbMatch', label: 'Nombre de matchs' },
  { field: 'PANbVD', label: 'Victoires domicile' },
  { field: 'PANbVE', label: 'Victoires extérieur' },
  { field: 'PANbND', label: 'Nuls domicile' },
  { field: 'PANbNE', label: 'Nuls extérieur' },
  { field: 'PANbDD', label: 'Défaites domicile' },
  { field: 'PANbDE', label: 'Défaites extérieur' },
  { field: 'PANbBPD', label: 'Buts pour domicile' },
  { field: 'PANbBCD', label: 'Buts contre domicile' },
  { field: 'PABonus', label: 'Bonus' },
  { field: 'PANbBPE', label: 'Buts pour extérieur' },
  { field: 'PANbBCE', label: 'Buts contre extérieur' },
  { field: 'PADiff', label: 'Différence de buts' },
  { field: 'PANbBP', label: 'Buts pour' },
  { field: 'PANbV', label: 'Victoires totales' },
  { field: 'PANbTaBP', label: 'TAB pour' },
  { field: 'PANbTaBC', label: 'TAB contre' },
  { field: 'PADiffTaB', label: 'Différence TAB' },
  { field: 'PANbBC', label: 'Buts contre' },
  { field: 'PARatio', label: 'Ratio BP / BC' },
];

function createDefaultFormState(): TourDefFormState {
  return {
    tourDefId: 0,
    nom: '',
    dureeRegTime: 90,
    dureeProlongTime: 30,
    finTpsReg: 1,
    finProlong: 1,
    allerRetour: false,
    valeurVD: 3,
    valeurVE: 3,
    valeurND: 1,
    valeurNE: 1,
    valeurDD: 0,
    valeurDE: 0,
    tdCalculDiffBut: 1,
    classGadScope: 1,
    valeurBe: false,
    bonusType: 1,
    bonusNbBut: 0,
    valeurBonusV: 0,
    valeurBonusN: 0,
    valeurBonusD: 0,
  };
}

function createFormStateFromTourDef(tourDef: TourDefRow): TourDefFormState {
  const finTpsReg = Number(tourDef.FIN_TPS_REG);
  const finProlong = Number(tourDef.FIN_PROLONG);

  return {
    tourDefId: tourDef.TDCLEUNIK,
    nom: String(tourDef.NOM ?? ''),
    dureeRegTime: Number(tourDef.DUREE_TPS_REG ?? 90) || 90,
    dureeProlongTime: Number(tourDef.DUREE_TPS_PROLONG ?? 30) || 30,
    finTpsReg: Number.isInteger(finTpsReg) && finTpsReg >= 1 && finTpsReg <= 4 ? finTpsReg : 1,
    finProlong: Number.isInteger(finProlong) && finProlong >= 1 && finProlong <= 5 ? finProlong : 1,
    allerRetour: Number(tourDef.ALLER_RETOUR ?? 0) === 1,
    valeurVD: Number(tourDef.VALEUR_VD ?? 3) || 3,
    valeurVE: Number(tourDef.VALEUR_VE ?? 3) || 3,
    valeurND: Number(tourDef.VALEUR_ND ?? 1) || 1,
    valeurNE: Number(tourDef.VALEUR_NE ?? 1) || 1,
    valeurDD: Number(tourDef.VALEUR_DD ?? 0) || 0,
    valeurDE: Number(tourDef.VALEUR_DE ?? 0) || 0,
    tdCalculDiffBut: Number(tourDef.TDCalculDiffBut ?? 1) || 1,
    classGadScope: Number(tourDef.CLASS_GAD ?? 1) === 2 ? 2 : 1,
    valeurBe: Number(tourDef.VALEUR_BE ?? 0) === 1,
    bonusType: Number(tourDef.BONUS_TYPE ?? 1) || 1,
    bonusNbBut: Number(tourDef.BONUS_NB_BUT ?? 0) || 0,
    valeurBonusV: Number(tourDef.VALEUR_BONUS_V ?? 0) || 0,
    valeurBonusN: Number(tourDef.VALEUR_BONUS_N ?? 0) || 0,
    valeurBonusD: Number(tourDef.VALEUR_BONUS_D ?? 0) || 0,
  };
}

function parseSortKeyRules(raw: string | null | undefined): SortKeyRule[] {
  const lines = String(raw ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const rules: SortKeyRule[] = [];

  for (const line of lines) {
    const match = line.match(/^([+-])\s*(.*?)\s*\t\s*(\S+)\s*$/);
    if (!match) continue;
    rules.push({
      direction: match[1] as '+' | '-',
      businessLabel: match[2].trim(),
      technicalField: match[3].trim(),
    });
  }

  return rules;
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

function buildSortKeyFromRules(rules: Array<{ field: string; direction: '+' | '-' }>): string {
  return rules
    .map((rule) => {
      const direction: '+' | '-' = rule.direction === '+' ? '+' : '-';
      const businessLabel = normalizeSortBusinessLabel(getSortFieldLabel(rule.field));
      const technicalField = normalizeSortTechnicalField(rule.field);
      // Compat format kept intentionally: +/-Nom metier<TAB>Nom technique
      return `${direction}${businessLabel}\t${technicalField}`;
    })
    .join('\n');
}

function createDefaultSortKey(): string {
  return [
    '-Points\tPANbPoints',
    '-Différence de Buts\tPADiff',
    '-Buts Pour\tPANbBP',
    '-Victoires\tPANbV',
    '+Matches\tPANbMatch',
  ].join('\n');
}

function createTourDefCreateDraft(): TourDefCreateDraft {
  return {
    NOM: '',
    ALLER_RETOUR: false,
    VALEUR_VD: '',
    VALEUR_VE: '',
    VALEUR_ND: '',
    VALEUR_NE: '',
    VALEUR_DD: '',
    VALEUR_DE: '',
    BONUS_TYPE: '',
    BONUS_NB_BUT: '',
    VALEUR_BONUS_V: '',
    VALEUR_BONUS_N: '',
    VALEUR_BONUS_D: '',
    DUREE_TPS_REG: '',
    DUREE_TPS_PROLONG: '',
    CLASS_GAD: '',
    VALEUR_BE: false,
    FIN_PROLONG: '',
    FIN_TPS_REG: '',
    TDCLEFTRI: '',
    TDCalculDiffBut: '',
  };
}

function toNumberOrDefault(value: number | '', defaultValue: number): number {
  if (value === '' || Number.isNaN(value)) {
    return defaultValue;
  }
  return Number(value);
}

function parseNumericInput(rawValue: string): number | '' {
  if (rawValue.trim() === '') {
    return '';
  }
  const parsed = Number(rawValue);
  return Number.isNaN(parsed) ? '' : parsed;
}

function mapCreateDraftToPayload(draft: TourDefCreateDraft, typeId: number): CreateTourDefPayload {
  return {
    NOM: String(draft.NOM ?? '').trim(),
    ALLER_RETOUR: draft.ALLER_RETOUR ? 1 : 0,
    VALEUR_VD: toNumberOrDefault(draft.VALEUR_VD, 3),
    VALEUR_VE: toNumberOrDefault(draft.VALEUR_VE, 3),
    VALEUR_ND: toNumberOrDefault(draft.VALEUR_ND, 1),
    VALEUR_NE: toNumberOrDefault(draft.VALEUR_NE, 1),
    VALEUR_DD: toNumberOrDefault(draft.VALEUR_DD, 0),
    VALEUR_DE: toNumberOrDefault(draft.VALEUR_DE, 0),
    BONUS_TYPE: toNumberOrDefault(draft.BONUS_TYPE, 1),
    BONUS_NB_BUT: toNumberOrDefault(draft.BONUS_NB_BUT, 0),
    VALEUR_BONUS_V: toNumberOrDefault(draft.VALEUR_BONUS_V, 0),
    VALEUR_BONUS_N: toNumberOrDefault(draft.VALEUR_BONUS_N, 0),
    VALEUR_BONUS_D: toNumberOrDefault(draft.VALEUR_BONUS_D, 0),
    DUREE_TPS_REG: toNumberOrDefault(draft.DUREE_TPS_REG, 90),
    DUREE_TPS_PROLONG: toNumberOrDefault(draft.DUREE_TPS_PROLONG, 30),
    CLASS_GAD: toNumberOrDefault(draft.CLASS_GAD, 1),
    TDTYPETOUR: typeId,
    VALEUR_BE: draft.VALEUR_BE ? 1 : 0,
    FIN_PROLONG: toNumberOrDefault(draft.FIN_PROLONG, 1),
    FIN_TPS_REG: toNumberOrDefault(draft.FIN_TPS_REG, 1),
    TDCLEFTRI: String(draft.TDCLEFTRI ?? '').trim() || createDefaultSortKey(),
    TDCalculDiffBut: toNumberOrDefault(draft.TDCalculDiffBut, 1),
  };
}

export function TourWizardStep3DefineForm({
  tourType,
  initialTourDefId,
  onTourDefChange,
  onError,
}: TourWizardStep3DefineFormProps) {
  const [tourDefs, setTourDefs] = useState<TourDefRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTourDefId, setSelectedTourDefId] = useState<number | null>(null);
  const [form, setForm] = useState<TourDefFormState>(createDefaultFormState());
  const [selectedSortRules, setSelectedSortRules] = useState<SortKeyRule[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createDraft, setCreateDraft] = useState<TourDefCreateDraft>(createTourDefCreateDraft());
  const [createSortRules, setCreateSortRules] = useState<Array<{ field: string; direction: '+' | '-' }>>([]);
  const [selectedAvailableSortField, setSelectedAvailableSortField] = useState<string | null>(null);
  const [selectedChosenSortField, setSelectedChosenSortField] = useState<string | null>(null);
  
  const onErrorRef = useRef(onError);
  const onTourDefChangeRef = useRef(onTourDefChange);

  useEffect(() => {
    onErrorRef.current = onError;
    onTourDefChangeRef.current = onTourDefChange;
  }, [onError, onTourDefChange]);

  const typeId = tourType === 'eliminatoire' ? 2 : 1;

  useEffect(() => {
    setCreateDraft(createTourDefCreateDraft());
    setCreateSortRules([]);
    setSelectedAvailableSortField(null);
    setSelectedChosenSortField(null);
    setCreateError(null);
  }, [typeId]);

  // Fetch tour definitions when type changes
  useEffect(() => {
    setLoading(true);
    void fetchTourDefsByType(typeId)
      .then((defs) => {
        setTourDefs(defs);
        
        // Determine which TOURDEF to select:
        // 1. If initialTourDefId is provided and exists in defs, use it
        // 2. Otherwise, use the first def in the list
        if (defs.length > 0) {
          if (initialTourDefId && defs.some(def => def.TDCLEUNIK === initialTourDefId)) {
            setSelectedTourDefId(initialTourDefId);
          } else {
            setSelectedTourDefId(defs[0].TDCLEUNIK);
          }
        }
      })
      .catch((error) => {
        onErrorRef.current?.(toErrorMessage(error));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [typeId, initialTourDefId]);

  // Load tour def form data when selectedTourDefId changes or when tourDefs are loaded
  useEffect(() => {
    if (!selectedTourDefId || tourDefs.length === 0) {
      setSelectedSortRules([]);
      return;
    }

    setLoading(true);
    void fetchTourDefById(selectedTourDefId)
      .then((tourDef) => {
        const nextForm = createFormStateFromTourDef(tourDef);
        setForm(nextForm);
        setSelectedSortRules(parseSortKeyRules(tourDef.TDCLEFTRI));
        onTourDefChangeRef.current?.(tourDef.TDCLEUNIK);
      })
      .catch((error) => {
        onErrorRef.current?.(toErrorMessage(error));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedTourDefId, tourDefs.length]);

  const selectedConfigSummary = useMemo(() => {
    const finTpsRegLabel = FIN_TIME_REG_OPTIONS.find((opt) => opt.value === form.finTpsReg)?.label ?? 'Fin du match';
    const finProlongLabel = FIN_PROLONG_OPTIONS.find((opt) => opt.value === form.finProlong)?.label ?? 'But en Or';
    const bonusLabel = BONUS_TYPE_OPTIONS.find((opt) => opt.value === form.bonusType)?.label ?? 'Aucun';
    const modeCalculLabel = form.tdCalculDiffBut === 2
      ? 'Ratio : Buts Pour / Buts Contre'
      : 'Différence : Buts Pour - Buts Contre';
    const scopeLabel = form.classGadScope === 2 ? 'Général' : 'Direct';

    const lines: string[] = [
      `Durée: ${form.dureeRegTime} min de temps réglementaire${form.finTpsReg === 2 ? `, puis ${form.dureeProlongTime} min de prolongation` : ''}.`,
      `Issue du match: ${finTpsRegLabel}${form.finTpsReg === 2 ? `, avec fin de prolongation par ${finProlongLabel}` : ''}.`,
      `Points: V domicile ${form.valeurVD}, V extérieur ${form.valeurVE}, N domicile ${form.valeurND}, N extérieur ${form.valeurNE}, D domicile ${form.valeurDD}, D extérieur ${form.valeurDE}.`,
      `Goalaverage: calcul ${modeCalculLabel.toLowerCase()}, scope ${scopeLabel}${form.valeurBe ? ', avec prise en compte des buts à l\'extérieur' : ''}.`,
      form.allerRetour ? 'Format aller/retour activé.' : 'Format aller simple.',
    ];

    if (form.bonusType === 1) {
      lines.push('Bonus: aucun bonus.');
    } else {
      lines.push(
        `Bonus: ${bonusLabel}, seuil ${form.bonusNbBut}, valeurs V/N/D ${form.valeurBonusV}/${form.valeurBonusN}/${form.valeurBonusD}.`,
      );
    }

    return lines;
  }, [form]);

  const availableSortFields = useMemo(() => {
    const chosen = new Set(createSortRules.map((item) => item.field));
    return PARTICIP_SORT_FIELD_OPTIONS.filter((item) => !chosen.has(item.field));
  }, [createSortRules]);

  const selectedChosenSortFieldIndex = useMemo(
    () => createSortRules.findIndex((item) => item.field === selectedChosenSortField),
    [createSortRules, selectedChosenSortField],
  );

  const handleAddSortFieldByName = (field: string) => {
    if (!field) return;
    if (createSortRules.some((item) => item.field === field)) return;

    setCreateSortRules((prev) => [...prev, { field, direction: '-' }]);
    setSelectedChosenSortField(field);
    setSelectedAvailableSortField(null);
  };

  const handleRemoveSortFieldByName = (field: string) => {
    if (!field) return;

    setCreateSortRules((prev) => prev.filter((item) => item.field !== field));
    setSelectedAvailableSortField(field);
    setSelectedChosenSortField(null);
  };

  const handleAddSortField = () => {
    if (!selectedAvailableSortField) return;
    handleAddSortFieldByName(selectedAvailableSortField);
  };

  const handleRemoveSortField = () => {
    if (!selectedChosenSortField) return;
    handleRemoveSortFieldByName(selectedChosenSortField);
  };

  const handleToggleSortDirection = () => {
    if (!selectedChosenSortField) return;

    setCreateSortRules((prev) =>
      prev.map((item) => {
        if (item.field !== selectedChosenSortField) return item;
        return { ...item, direction: item.direction === '-' ? '+' : '-' };
      }),
    );
  };

  const handleMoveSortFieldUp = () => {
    if (selectedChosenSortFieldIndex <= 0) return;

    setCreateSortRules((prev) => {
      const next = [...prev];
      const current = selectedChosenSortFieldIndex;
      [next[current - 1], next[current]] = [next[current], next[current - 1]];
      return next;
    });
  };

  const handleMoveSortFieldDown = () => {
    if (selectedChosenSortFieldIndex < 0 || selectedChosenSortFieldIndex >= createSortRules.length - 1) return;

    setCreateSortRules((prev) => {
      const next = [...prev];
      const current = selectedChosenSortFieldIndex;
      [next[current], next[current + 1]] = [next[current + 1], next[current]];
      return next;
    });
  };

  const handleCreateTourDef = async () => {
    const nom = String(createDraft.NOM ?? '').trim();
    if (!nom) {
      setCreateError('Le nom est requis.');
      return;
    }

    setCreateSaving(true);
    setCreateError(null);
    try {
      const sortKey = buildSortKeyFromRules(createSortRules);
      const payload = mapCreateDraftToPayload({ ...createDraft, TDCLEFTRI: sortKey }, typeId);
      const created = await createTourDef(payload);

      const defs = await fetchTourDefsByType(typeId);
      setTourDefs(defs);

      const createdId = Number(created?.TDCLEUNIK ?? 0);
      if (Number.isInteger(createdId) && createdId > 0) {
        setSelectedTourDefId(createdId);
      } else if (defs.length > 0) {
        setSelectedTourDefId(defs[defs.length - 1].TDCLEUNIK);
      }

      setCreateOpen(false);
      setCreateDraft(createTourDefCreateDraft());
    } catch (error) {
      setCreateError(toErrorMessage(error));
    } finally {
      setCreateSaving(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      {/* Liste déroulante des TourDefs */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Sélectionner une définition de tour
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'stretch' }}>
          <FormControl fullWidth size="small" disabled={loading || tourDefs.length === 0}>
            <InputLabel id="tourdef-select-label">Définition</InputLabel>
            <Select
              labelId="tourdef-select-label"
              label="Définition"
              value={selectedTourDefId ? String(selectedTourDefId) : ''}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isInteger(next) && next > 0) {
                  setSelectedTourDefId(next);
                }
              }}
            >
              {tourDefs.map((tourDef) => (
                <MenuItem key={tourDef.TDCLEUNIK} value={String(tourDef.TDCLEUNIK)}>
                  {tourDef.NOM}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            onClick={() => {
              setCreateError(null);
              setCreateDraft(createTourDefCreateDraft());
              setCreateSortRules([]);
              setSelectedAvailableSortField(null);
              setSelectedChosenSortField(null);
              setCreateOpen(true);
            }}
          >
            Créer
          </Button>
        </Stack>
      </Box>

      {/* Résumé de configuration */}
      <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Résumé de la configuration
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {form.nom ? `${form.nom} (ID ${form.tourDefId})` : `TourDef #${form.tourDefId}`}
        </Typography>
        <Stack spacing={0.75}>
          {selectedConfigSummary.map((line) => (
            <Typography key={line} variant="body2" color="text.secondary">
              {line}
            </Typography>
          ))}
        </Stack>
      </Box>

      <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Ordre de classement
        </Typography>

        {selectedSortRules.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucune règle de tri disponible pour cette définition.
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {selectedSortRules.map((rule, index) => (
              <Typography key={`${rule.direction}-${rule.technicalField}-${index}`} variant="body2" color="text.secondary">
                {`${index + 1}. ${rule.businessLabel} ${rule.direction === '-' ? '↓' : '↑'}`}
              </Typography>
            ))}
          </Stack>
        )}
      </Box>

      <Dialog open={createOpen} onClose={() => { if (!createSaving) setCreateOpen(false); }} fullWidth maxWidth="md">
        <DialogTitle>Créer une définition de tour</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ mt: 1 }}>
            {createError ? (
              <Typography variant="body2" color="error">{createError}</Typography>
            ) : null}

            <TextField
              label="Nom"
              size="small"
              value={createDraft.NOM}
              onChange={(event) => setCreateDraft((prev) => ({ ...prev, NOM: event.target.value }))}
              fullWidth
              required
            />

            <TextField label="Type de tour" size="small" value={typeId === 2 ? 'Eliminatoire' : 'Ligue'} fullWidth disabled />

            <FormControlLabel
              control={(
                <Switch
                  checked={createDraft.ALLER_RETOUR}
                  onChange={(event) => setCreateDraft((prev) => ({ ...prev, ALLER_RETOUR: event.target.checked }))}
                />
              )}
              label="Format aller/retour"
            />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
              <TextField
                label="Durée temps réglementaire"
                size="small"
                type="number"
                value={createDraft.DUREE_TPS_REG}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, DUREE_TPS_REG: Number(event.target.value) || 0 }))}
                fullWidth
              />
              <FormControl fullWidth size="small">
                <InputLabel id="create-fin-reg-label">Fin temps réglementaire</InputLabel>
                <Select
                  labelId="create-fin-reg-label"
                  label="Fin temps réglementaire"
                    value={createDraft.FIN_TPS_REG === '' ? '' : String(createDraft.FIN_TPS_REG)}
                    onChange={(event) => setCreateDraft((prev) => ({ ...prev, FIN_TPS_REG: parseNumericInput(event.target.value) }))}
                >
                    <MenuItem value="">Aucune sélection</MenuItem>
                  {FIN_TIME_REG_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={String(option.value)}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
              <TextField
                label="Durée prolongation"
                size="small"
                type="number"
                value={createDraft.DUREE_TPS_PROLONG}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, DUREE_TPS_PROLONG: Number(event.target.value) || 0 }))}
                fullWidth
              />
              <FormControl fullWidth size="small">
                <InputLabel id="create-fin-prolong-label">Fin prolongation</InputLabel>
                <Select
                  labelId="create-fin-prolong-label"
                  label="Fin prolongation"
                    value={createDraft.FIN_PROLONG === '' ? '' : String(createDraft.FIN_PROLONG)}
                    onChange={(event) => setCreateDraft((prev) => ({ ...prev, FIN_PROLONG: parseNumericInput(event.target.value) }))}
                >
                    <MenuItem value="">Aucune sélection</MenuItem>
                  {FIN_PROLONG_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={String(option.value)}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Attribution des points</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
              <TextField label="Victoire domicile" size="small" type="number" value={createDraft.VALEUR_VD} onChange={(event) => setCreateDraft((prev) => ({ ...prev, VALEUR_VD: parseNumericInput(event.target.value) }))} fullWidth />
              <TextField label="Victoire extérieur" size="small" type="number" value={createDraft.VALEUR_VE} onChange={(event) => setCreateDraft((prev) => ({ ...prev, VALEUR_VE: parseNumericInput(event.target.value) }))} fullWidth />
              <TextField label="Nul domicile" size="small" type="number" value={createDraft.VALEUR_ND} onChange={(event) => setCreateDraft((prev) => ({ ...prev, VALEUR_ND: parseNumericInput(event.target.value) }))} fullWidth />
              <TextField label="Nul extérieur" size="small" type="number" value={createDraft.VALEUR_NE} onChange={(event) => setCreateDraft((prev) => ({ ...prev, VALEUR_NE: parseNumericInput(event.target.value) }))} fullWidth />
              <TextField label="Défaite domicile" size="small" type="number" value={createDraft.VALEUR_DD} onChange={(event) => setCreateDraft((prev) => ({ ...prev, VALEUR_DD: parseNumericInput(event.target.value) }))} fullWidth />
              <TextField label="Défaite extérieur" size="small" type="number" value={createDraft.VALEUR_DE} onChange={(event) => setCreateDraft((prev) => ({ ...prev, VALEUR_DE: parseNumericInput(event.target.value) }))} fullWidth />
            </Stack>

            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Goalaverage</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
              <FormControl fullWidth size="small">
                <InputLabel id="create-diff-mode-label">Mode de calcul</InputLabel>
                <Select
                  labelId="create-diff-mode-label"
                  label="Mode de calcul"
                    value={createDraft.TDCalculDiffBut === '' ? '' : String(createDraft.TDCalculDiffBut)}
                    onChange={(event) => setCreateDraft((prev) => ({ ...prev, TDCalculDiffBut: parseNumericInput(event.target.value) }))}
                >
                    <MenuItem value="">Aucune sélection</MenuItem>
                  <MenuItem value="1">Différence (BP - BC)</MenuItem>
                  <MenuItem value="2">Ratio (BP / BC)</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel id="create-class-gad-label">Scope</InputLabel>
                <Select
                  labelId="create-class-gad-label"
                  label="Scope"
                    value={createDraft.CLASS_GAD === '' ? '' : String(createDraft.CLASS_GAD)}
                    onChange={(event) => setCreateDraft((prev) => ({ ...prev, CLASS_GAD: parseNumericInput(event.target.value) }))}
                >
                    <MenuItem value="">Aucune sélection</MenuItem>
                  <MenuItem value="1">Direct</MenuItem>
                  <MenuItem value="2">Général</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <FormControlLabel
              control={(
                <Switch
                  checked={createDraft.VALEUR_BE}
                  onChange={(event) => setCreateDraft((prev) => ({ ...prev, VALEUR_BE: event.target.checked }))}
                />
              )}
              label="Prise en compte des buts à l'extérieur"
            />

            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Bonus</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
              <FormControl fullWidth size="small">
                <InputLabel id="create-bonus-type-label">Type de bonus</InputLabel>
                <Select
                  labelId="create-bonus-type-label"
                  label="Type de bonus"
                    value={createDraft.BONUS_TYPE === '' ? '' : String(createDraft.BONUS_TYPE)}
                    onChange={(event) => setCreateDraft((prev) => ({ ...prev, BONUS_TYPE: parseNumericInput(event.target.value) }))}
                >
                    <MenuItem value="">Aucune sélection</MenuItem>
                  {BONUS_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={String(option.value)}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
                <TextField label="Seuil bonus" size="small" type="number" value={createDraft.BONUS_NB_BUT} onChange={(event) => setCreateDraft((prev) => ({ ...prev, BONUS_NB_BUT: parseNumericInput(event.target.value) }))} fullWidth />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                <TextField label="Bonus victoire" size="small" type="number" value={createDraft.VALEUR_BONUS_V} onChange={(event) => setCreateDraft((prev) => ({ ...prev, VALEUR_BONUS_V: parseNumericInput(event.target.value) }))} fullWidth />
                <TextField label="Bonus nul" size="small" type="number" value={createDraft.VALEUR_BONUS_N} onChange={(event) => setCreateDraft((prev) => ({ ...prev, VALEUR_BONUS_N: parseNumericInput(event.target.value) }))} fullWidth />
                <TextField label="Bonus défaite" size="small" type="number" value={createDraft.VALEUR_BONUS_D} onChange={(event) => setCreateDraft((prev) => ({ ...prev, VALEUR_BONUS_D: parseNumericInput(event.target.value) }))} fullWidth />
            </Stack>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Ordre de tri
              </Typography>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'stretch', flexWrap: 'nowrap' }}>
                <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, minHeight: 220, overflow: 'auto' }}>
                  <Typography variant="caption" sx={{ display: 'block', px: 1.25, py: 0.75, color: 'text.secondary' }}>
                    Liste des options de classement disponibles
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
                        onDoubleClick={() => {
                          handleAddSortFieldByName(item.field);
                        }}
                      >
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Paper>

                <Stack spacing={0.75} sx={{ justifyContent: 'center', minWidth: 44, flexShrink: 0 }}>
                  <Button size="small" variant="outlined" sx={{ minWidth: 36, px: 0.75 }} onClick={handleAddSortField} disabled={!selectedAvailableSortField}>
                    +
                  </Button>
                  <Button size="small" variant="outlined" sx={{ minWidth: 36, px: 0.75 }} onClick={handleRemoveSortField} disabled={!selectedChosenSortField}>
                    -
                  </Button>
                  <Button size="small" variant="outlined" sx={{ minWidth: 36, px: 0.75 }} onClick={handleToggleSortDirection} disabled={!selectedChosenSortField}>
                    +/-
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ minWidth: 36, px: 0.75 }}
                    onClick={handleMoveSortFieldUp}
                    disabled={selectedChosenSortFieldIndex <= 0}
                  >
                    ↑
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ minWidth: 36, px: 0.75 }}
                    onClick={handleMoveSortFieldDown}
                    disabled={selectedChosenSortFieldIndex < 0 || selectedChosenSortFieldIndex >= createSortRules.length - 1}
                  >
                    ↓
                  </Button>
                </Stack>

                <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, minHeight: 220, overflow: 'auto' }}>
                  <Typography variant="caption" sx={{ display: 'block', px: 1.25, py: 0.75, color: 'text.secondary' }}>
                    Champs choisis pour le classement
                  </Typography>
                  <List dense disablePadding sx={{ py: 0 }}>
                    {createSortRules.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ px: 1.25, py: 1.5 }}>
                        Aucun champ choisi.
                      </Typography>
                    ) : (
                      createSortRules.map((rule) => {
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
                            onDoubleClick={() => {
                              handleRemoveSortFieldByName(rule.field);
                            }}
                          >
                            <ListItemText
                              primary={`${rule.direction === '-' ? '↓' : '↑'} ${getSortFieldLabel(rule.field)}`}
                              primaryTypographyProps={{ variant: 'body2', noWrap: true }}
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
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="inherit" onClick={() => setCreateOpen(false)} disabled={createSaving}>Annuler</Button>
          <Button variant="contained" onClick={() => void handleCreateTourDef()} disabled={createSaving}>
            {createSaving ? 'Création...' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
