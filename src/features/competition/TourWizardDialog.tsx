import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { DateInputField, fromInputDateToDisplay, toInputDateFromDisplay } from '../../components/DateInputField';
import { TimeInputField } from '../../components/TimeInputField';
import { toErrorMessage } from '../../components/useEntityPage';
import { createCompetitionTour, fetchCompetitionTourById, updateCompetitionTour } from './competitionApi';
import { TourWizardStep3DefineForm } from './TourWizardStep3DefineForm';
import { TourWizardStep5Participants } from './TourWizardStep5Participants';
import { TourWizardStep6Rencontres } from './TourWizardStep6Rencontres';
import type { CompetitionTourDetailRow, CompetitionTourUpsertPayload } from './types';

const WIZARD_STEPS_DEFAULT = ['Description', 'Dates', 'Définition', 'Etape 4', 'Rencontres'] as const;
const WIZARD_STEPS_ELIMINATOIRE = ['Description', 'Dates', 'Définition', 'Etape 4', 'Participants', 'Rencontres'] as const;

type TourType = 'ligue' | 'eliminatoire';
type SelectionMode = 'tirage' | 'programmation';

interface TourWizardDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  competitionId: string | number;
  competitionLabel: string;
  competitionSeason?: string;
  initialTourId?: number;
  proposedTourId: number;
  proposedOrder: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}

interface TourDraft {
  id: number;
  tourDefKey: number;
  nom: string;
  type: TourType;
  participants: number;
  final: boolean;
  selectionMode: SelectionMode;
  dateTirage: string;
  heureTirage: string;
  dateDebut: string;
  dateFin: string;
  heureMatches: string;
  ordre: number;
  nbEquipe: number;
  nbGroupe: number;
  nbMatch: number;
}

function toDisplayDate(value: string | null | undefined): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const datePart = text.split(' ')[0]?.trim() ?? '';
  const dashed = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dashed) {
    return fromInputDateToDisplay(datePart);
  }
  return '';
}

function toApiDate(value: string): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const dashed = toInputDateFromDisplay(text);
  return dashed || null;
}

function toDisplayTime(value: string | null | undefined): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const match = text.match(/^(\d{2}):(\d{2})/);
  if (!match) return '';
  return `${match[1]}:${match[2]}`;
}

function mapTourTypeFromDb(tourDefType: number | undefined): TourType {
  return Number(tourDefType) === 2 ? 'eliminatoire' : 'ligue';
}

function mapTourTypeToDb(type: TourType): number {
  return type === 'eliminatoire' ? 2 : 1;
}

function createDefaultDraft(proposedTourId: number, proposedOrder: number): TourDraft {
  return {
    id: proposedTourId,
    tourDefKey: 1,
    nom: '',
    type: 'ligue',
    participants: 2,
    final: false,
    selectionMode: 'programmation',
    dateTirage: '',
    heureTirage: '',
    dateDebut: '',
    dateFin: '',
    heureMatches: '',
    ordre: proposedOrder,
    nbEquipe: 0,
    nbGroupe: 0,
    nbMatch: 0,
  };
}

function createDraftFromDetail(source: CompetitionTourDetailRow, fallbackId: number): TourDraft {
  const participants = Number(source.NB_PARTICIPANTS ?? 2) || 2;
  const type = mapTourTypeFromDb(Number(source.TDTYPETOUR ?? 1));
  const isFinal = Number(source.TU_FINAL ?? 0) === 1;
  const hasTirageValues = String(source.TU_DATETIRAGE ?? '').trim().length > 0
    || String(source.TU_HEURETIRAGE ?? '').trim().length > 0;

  return {
    id: Number(source.TUCLEUNIK ?? fallbackId),
    tourDefKey: Number(source.TDCLEUNIK ?? 1) || 1,
    nom: String(source.NOM ?? ''),
    type,
    participants,
    final: isFinal,
    selectionMode: hasTirageValues ? 'tirage' : 'programmation',
    dateTirage: toDisplayDate(source.TU_DATETIRAGE as string | null | undefined),
    heureTirage: toDisplayTime(source.TU_HEURETIRAGE as string | null | undefined),
    dateDebut: toDisplayDate(source.DATE_DEBUT as string | null | undefined),
    dateFin: toDisplayDate(source.DATE_FIN as string | null | undefined),
    heureMatches: toDisplayTime(source.TUHEURE as string | null | undefined),
    ordre: Number(source.TU_ORDRE ?? 1) || 1,
    nbEquipe: Number(source.NB_EQUIPE ?? 0) || 0,
    nbGroupe: Number(source.NB_GROUPE ?? 0) || 0,
    nbMatch: Number(source.NB_MATCH ?? 0) || 0,
  };
}

export function TourWizardDialog({
  open,
  mode,
  competitionId,
  competitionLabel,
  competitionSeason,
  initialTourId,
  proposedTourId,
  proposedOrder,
  onClose,
  onSaved,
  onError,
}: TourWizardDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<TourDraft>(createDefaultDraft(proposedTourId, proposedOrder));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [finalTouched, setFinalTouched] = useState(false);
  const [initialTourType, setInitialTourType] = useState<TourType>('ligue');

  useEffect(() => {
    if (!open) return;

    setStepIndex(0);
    setErrors({});
    setFinalTouched(false);

    if (mode === 'create') {
      const nextDraft = createDefaultDraft(proposedTourId, proposedOrder);
      setDraft(nextDraft);
      setInitialTourType(nextDraft.type);
      return;
    }

    if (!initialTourId) {
      onError('Tour invalide.');
      return;
    }

    setLoading(true);
    void fetchCompetitionTourById(initialTourId)
      .then((detail) => {
        const nextDraft = createDraftFromDetail(detail, proposedTourId);
        setDraft(nextDraft);
        setInitialTourType(nextDraft.type);
      })
      .catch((error) => {
        onError(toErrorMessage(error));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, mode, initialTourId, proposedTourId, proposedOrder, onError]);

  useEffect(() => {
    if (finalTouched) return;
    const shouldBeFinal = draft.type === 'eliminatoire' && Number(draft.participants) === 2;
    setDraft((prev) => ({ ...prev, final: shouldBeFinal }));
  }, [draft.participants, draft.type, finalTouched]);

  const title = mode === 'create' ? 'Ajouter un tour' : 'Modifier un tour';

  const wizardSteps = draft.type === 'eliminatoire'
    ? WIZARD_STEPS_ELIMINATOIRE
    : WIZARD_STEPS_DEFAULT;

  useEffect(() => {
    setStepIndex((prev) => Math.min(prev, wizardSteps.length - 1));
  }, [wizardSteps.length]);

  const canGoBack = stepIndex > 0 && !saving;
  const canGoNext = stepIndex < wizardSteps.length - 1 && !saving;
  const isLastStep = stepIndex === wizardSteps.length - 1;

  const isDateRangeInvalid = useMemo(() => {
    const start = toApiDate(draft.dateDebut);
    const end = toApiDate(draft.dateFin);
    if (!start || !end) return false;
    return end < start;
  }, [draft.dateDebut, draft.dateFin]);

  const validateStepOne = (): boolean => {
    const nextErrors: Record<string, string> = {};
    const nom = String(draft.nom ?? '').trim();
    const participants = Number(draft.participants);

    if (!nom) {
      nextErrors.nom = 'Intitule requis.';
    }
    if (!Number.isInteger(participants) || participants <= 0) {
      nextErrors.participants = 'Nombre de participants invalide.';
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validateStepTwo = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (isDateRangeInvalid) {
      nextErrors.dateFin = 'La date de fin doit etre superieure ou egale a la date de debut.';
    }

    setErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (stepIndex === 0 && !validateStepOne()) return;
    if (stepIndex === 1 && !validateStepTwo()) return;
    setStepIndex((prev) => Math.min(prev + 1, wizardSteps.length - 1));
  };

  const handleBack = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const buildPayload = (): CompetitionTourUpsertPayload => {
    const typeId = mapTourTypeToDb(draft.type);
    const mustSwitchTourDef = mode === 'create' || draft.type !== initialTourType;
    return {
      TUCLEUNIK: draft.id,
      TDCLEUNIK: mustSwitchTourDef ? typeId : draft.tourDefKey,
      COCLEUNIK: Number(competitionId),
      NOM: String(draft.nom ?? '').trim(),
      NB_PARTICIPANTS: Number(draft.participants) || 0,
      TU_FINAL: draft.final ? 1 : 0,
      TU_SELECTION: 0,
      TU_DATETIRAGE: draft.selectionMode === 'tirage' ? toApiDate(draft.dateTirage) : null,
      TU_HEURETIRAGE: draft.selectionMode === 'tirage' ? String(draft.heureTirage ?? '').trim() || null : null,
      DATE_DEBUT: toApiDate(draft.dateDebut),
      DATE_FIN: toApiDate(draft.dateFin),
      TUHEURE: String(draft.heureMatches ?? '').trim() || null,
      TU_ORDRE: Number(draft.ordre) || 1,
      NB_EQUIPE: Number(draft.nbEquipe) || 0,
      NB_GROUPE: Number(draft.nbGroupe) || 0,
      NB_MATCH: Number(draft.nbMatch) || 0,
    };
  };

  const handleSave = async () => {
    if (!validateStepOne()) {
      setStepIndex(0);
      return;
    }
    if (!validateStepTwo()) {
      setStepIndex(1);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (mode === 'create') {
        await createCompetitionTour(payload);
      } else {
        if (!initialTourId) {
          onError('Tour invalide.');
          return;
        }
        await updateCompetitionTour(initialTourId, payload);
      }
      await onSaved();
      onClose();
    } catch (error) {
      onError(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (saving) return;
        onClose();
      }}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            height: 'min(92vh, 940px)',
          },
        },
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <Stack spacing={2} sx={{ pt: 0.5, flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Typography variant="body2" color="text.secondary">
            Competition: {competitionLabel}
          </Typography>

          <Stepper activeStep={stepIndex} alternativeLabel>
            {wizardSteps.map((stepLabel) => (
              <Step key={stepLabel}>
                <StepLabel>{stepLabel}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {loading ? (
            <Typography variant="body2" color="text.secondary">Chargement du tour...</Typography>
          ) : null}

          {!loading && stepIndex === 0 ? (
            <Stack spacing={1.5}>
              <TextField
                label="Identifiant"
                value={String(draft.id)}
                size="small"
                fullWidth
                disabled
              />

              <TextField
                label="Intitule"
                value={draft.nom}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraft((prev) => ({ ...prev, nom: value }));
                  setErrors((prev) => ({ ...prev, nom: '' }));
                }}
                size="small"
                fullWidth
                error={Boolean(errors.nom)}
                helperText={errors.nom}
              />

              <Stack spacing={0.75}>
                <FormLabel>Type de tour</FormLabel>
                <RadioGroup
                  row
                  value={draft.type}
                  onChange={(event) => {
                    const next = event.target.value === 'eliminatoire' ? 'eliminatoire' : 'ligue';
                    setDraft((prev) => ({ ...prev, type: next }));
                  }}
                >
                  <FormControlLabel value="ligue" control={<Radio />} label="Ligue" />
                  <FormControlLabel value="eliminatoire" control={<Radio />} label="Eliminatoire" />
                </RadioGroup>
              </Stack>

              <TextField
                label="Nombre de participants"
                value={String(draft.participants)}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setDraft((prev) => ({ ...prev, participants: Number.isFinite(next) ? next : 0 }));
                  setErrors((prev) => ({ ...prev, participants: '' }));
                }}
                size="small"
                fullWidth
                type="number"
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
                error={Boolean(errors.participants)}
                helperText={errors.participants}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={draft.final}
                    onChange={(event) => {
                      setFinalTouched(true);
                      setDraft((prev) => ({ ...prev, final: event.target.checked }));
                    }}
                  />
                }
                label="Finale de la competition"
              />
            </Stack>
          ) : null}

          {!loading && stepIndex === 1 ? (
            <Stack spacing={2}>
              <Box sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Stack spacing={1.25}>
                  <FormLabel>Selection des matches</FormLabel>
                  <ToggleButtonGroup
                    color="primary"
                    exclusive
                    value={draft.selectionMode}
                    onChange={(_event, value: SelectionMode | null) => {
                      if (!value) return;
                      setDraft((prev) => ({ ...prev, selectionMode: value }));
                    }}
                    size="small"
                  >
                    <ToggleButton value="tirage">Par tirage au sort</ToggleButton>
                    <ToggleButton value="programmation">Par programmation</ToggleButton>
                  </ToggleButtonGroup>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                    <DateInputField
                      label="Date du tirage au sort"
                      value={draft.dateTirage}
                      onChange={(nextDate) => {
                        setDraft((prev) => ({ ...prev, dateTirage: nextDate }));
                        setErrors((prev) => ({ ...prev, dateTirage: '' }));
                      }}
                      fullWidth
                      disabled={draft.selectionMode !== 'tirage'}
                      error={Boolean(errors.dateTirage)}
                      helperText={errors.dateTirage}
                    />

                    <TimeInputField
                      label="Heure du tirage au sort"
                      value={draft.heureTirage}
                      onChange={(nextHeure) => {
                        setDraft((prev) => ({ ...prev, heureTirage: nextHeure }));
                        setErrors((prev) => ({ ...prev, heureTirage: '' }));
                      }}
                      fullWidth
                      disabled={draft.selectionMode !== 'tirage'}
                      error={Boolean(errors.heureTirage)}
                      helperText={errors.heureTirage}
                    />
                  </Stack>
                </Stack>
              </Box>

              <Box sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Stack spacing={1.25}>
                  <FormLabel>Dates des matches</FormLabel>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                    <DateInputField
                      label="Debut"
                      value={draft.dateDebut}
                      onChange={(nextDate) => {
                        setDraft((prev) => ({ ...prev, dateDebut: nextDate }));
                        setErrors((prev) => ({ ...prev, dateFin: '' }));
                      }}
                      fullWidth
                    />

                    <DateInputField
                      label="Fin"
                      value={draft.dateFin}
                      onChange={(nextDate) => {
                        setDraft((prev) => ({ ...prev, dateFin: nextDate }));
                        setErrors((prev) => ({ ...prev, dateFin: '' }));
                      }}
                      fullWidth
                      error={Boolean(errors.dateFin)}
                      helperText={errors.dateFin}
                    />
                  </Stack>

                  <TimeInputField
                    label="Heure des matches"
                    value={draft.heureMatches}
                    onChange={(nextHeure) => setDraft((prev) => ({ ...prev, heureMatches: nextHeure }))}
                    fullWidth
                  />
                </Stack>
              </Box>
            </Stack>
          ) : null}

          {!loading && stepIndex === 2 ? (
            <TourWizardStep3DefineForm
              tourType={draft.type}
              initialTourDefId={draft.tourDefKey}
              onTourDefChange={(tourDefId) => {
                setDraft((prev) => ({ ...prev, tourDefKey: tourDefId }));
              }}
              onError={onError}
            />
          ) : null}

          {!loading && stepIndex === 3 ? (
            <Box sx={{ p: 1.5, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Cette etape sera implementee dans la suite.
              </Typography>
            </Box>
          ) : null}

          {!loading && draft.type === 'eliminatoire' && stepIndex === 4 ? (
            <TourWizardStep5Participants
              tourId={draft.id}
              onError={onError}
            />
          ) : null}

          {!loading && (
            (draft.type === 'eliminatoire' && stepIndex === 5)
            || (draft.type !== 'eliminatoire' && stepIndex === 4)
          ) ? (
            <TourWizardStep6Rencontres
              tourId={draft.id}
              tourType={draft.type}
              competitionSeason={String(competitionSeason ?? '').trim()}
              tourStartDate={toApiDate(draft.dateDebut) ?? ''}
              tourDefaultHeure={String(draft.heureMatches ?? '').trim()}
              onError={onError}
            />
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={saving}>Annuler</Button>
        <Button onClick={handleBack} disabled={!canGoBack || loading}>Precedent</Button>
        {!isLastStep ? (
          <Button onClick={handleNext} disabled={!canGoNext || loading}>Suivant</Button>
        ) : (
          <Button variant="contained" onClick={() => void handleSave()} disabled={saving || loading}>
            {saving ? 'Enregistrement...' : 'Terminer'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
