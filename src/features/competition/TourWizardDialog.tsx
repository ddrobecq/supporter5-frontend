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
  StepButton,
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
import { createCompetitionTour, fetchCompetitionTourById, fetchTourDefById, fetchTourParticipants, updateCompetitionTour } from './competitionApi';
import { TourWizardStep3DefineForm } from './TourWizardStep3DefineForm';
import { TourWizardStep4Groupes } from './TourWizardStep4Groupes';
import { TourWizardStep4Classement } from './TourWizardStep4Classement';
import { TourWizardStep5Participants } from './TourWizardStep5Participants';
import { TourWizardStep6Rencontres } from './TourWizardStep6Rencontres';
import type { CompetitionTourDetailRow, CompetitionTourUpsertPayload } from './types';

const WIZARD_STEPS = ['Description', 'Dates', 'Définition', 'Groupes', 'Classement', 'Participants', 'Rencontres'] as const;

const STEP_DESCRIPTION = 0;
const STEP_DATES = 1;
const STEP_DEFINITION = 2;
const STEP_GROUPES = 3;
const STEP_CLASSEMENT = 4;
const STEP_PARTICIPANTS = 5;
const STEP_RENCONTRES = 6;

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

function isStepSkippedForType(step: number, type: TourType): boolean {
  if (type === 'eliminatoire' && (step === STEP_GROUPES || step === STEP_CLASSEMENT)) return true;
  return false;
}

function getNextAvailableStep(step: number, type: TourType): number | null {
  for (let index = step + 1; index < WIZARD_STEPS.length; index += 1) {
    if (!isStepSkippedForType(index, type)) {
      return index;
    }
  }
  return null;
}

function getPreviousAvailableStep(step: number, type: TourType): number | null {
  for (let index = step - 1; index >= 0; index -= 1) {
    if (!isStepSkippedForType(index, type)) {
      return index;
    }
  }
  return null;
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

function extractDistinctGroupNames(rows: Array<{ GROUPE?: unknown }>): string[] {
  const values = rows
    .map((row) => String(row.GROUPE ?? '').trim())
    .filter((value) => value.length > 0);

  return Array.from(new Set(values))
    .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base', numeric: true }));
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
  const [isAllerRetour, setIsAllerRetour] = useState(false);
  const [groupNames, setGroupNames] = useState<string[]>([]);
  const [existingGroupNames, setExistingGroupNames] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;

    setStepIndex(0);
    setErrors({});
    setFinalTouched(false);
    setGroupNames([]);
    setExistingGroupNames([]);

    if (mode === 'create') {
      const nextDraft = createDefaultDraft(proposedTourId, proposedOrder);
      setDraft(nextDraft);
      setInitialTourType(nextDraft.type);
      setIsAllerRetour(false);
      return;
    }

    if (!initialTourId) {
      onError('Tour invalide.');
      return;
    }

    setLoading(true);
    void Promise.all([
      fetchCompetitionTourById(initialTourId),
      fetchTourParticipants(initialTourId),
    ])
      .then(([detail, participants]) => {
        const nextDraft = createDraftFromDetail(detail, proposedTourId);
        setDraft(nextDraft);
        setInitialTourType(nextDraft.type);
        const loadedGroupNames = extractDistinctGroupNames(participants);
        setGroupNames(loadedGroupNames);
        setExistingGroupNames(loadedGroupNames);
      })
      .catch((error) => {
        onError(toErrorMessage(error));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, mode, initialTourId, proposedTourId, proposedOrder]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const tourDefId = Number(draft.tourDefKey ?? 0);
    if (!Number.isInteger(tourDefId) || tourDefId <= 0) {
      setIsAllerRetour(false);
      return;
    }

    let cancelled = false;

    void fetchTourDefById(tourDefId)
      .then((tourDef) => {
        if (!cancelled) {
          setIsAllerRetour(Number(tourDef?.ALLER_RETOUR ?? 0) === 1);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setIsAllerRetour(false);
          onError(toErrorMessage(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, draft.tourDefKey, onError]);

  useEffect(() => {
    if (finalTouched) return;
    const shouldBeFinal = draft.type === 'eliminatoire' && Number(draft.participants) === 2;
    setDraft((prev) => ({ ...prev, final: shouldBeFinal }));
  }, [draft.participants, draft.type, finalTouched]);

  const title = mode === 'create' ? 'Ajouter un tour' : 'Modifier un tour';
  const activeTourId = mode === 'edit' && Number(initialTourId) > 0
    ? Number(initialTourId)
    : draft.id;

  useEffect(() => {
    if (!isStepSkippedForType(stepIndex, draft.type)) {
      return;
    }
    const nextStep = getNextAvailableStep(stepIndex, draft.type);
    if (nextStep !== null) {
      setStepIndex(nextStep);
      return;
    }
    const previousStep = getPreviousAvailableStep(stepIndex, draft.type);
    if (previousStep !== null) {
      setStepIndex(previousStep);
    }
  }, [draft.type, stepIndex]);

  const previousStep = getPreviousAvailableStep(stepIndex, draft.type);
  const nextStep = getNextAvailableStep(stepIndex, draft.type);
  const canGoBack = previousStep !== null && !saving;
  const canGoNext = nextStep !== null && !saving;
  const isLastStep = nextStep === null;

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
    if (stepIndex === STEP_DESCRIPTION && !validateStepOne()) return;
    if (stepIndex === STEP_DATES && !validateStepTwo()) return;
    if (nextStep !== null) {
      setStepIndex(nextStep);
    }
  };

  const handleBack = () => {
    if (previousStep !== null) {
      setStepIndex(previousStep);
    }
  };

  const handleStepClick = (targetStep: number) => {
    if (loading || saving) return;
    if (isStepSkippedForType(targetStep, draft.type)) return;
    setStepIndex(targetStep);
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
      maxWidth="lg"
      slotProps={{
        paper: {
          sx: {
            height: 'min(92vh, 940px)',
            width: 'min(96vw, 1200px)',
            maxWidth: '1200px',
          },
        },
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', minHeight: 0, overflowY: 'hidden', overflowX: 'hidden', px: 2 }}>
        <Stack spacing={2} sx={{ pt: 0.5, flex: 1, minHeight: 0, minWidth: 0, overflowY: 'auto', overflowX: 'hidden' }}>
          <Typography variant="body2" color="text.secondary">
            Competition: {competitionLabel}
          </Typography>

          <Stepper activeStep={stepIndex} alternativeLabel>
            {WIZARD_STEPS.map((stepLabel, index) => {
              const isSkipped = isStepSkippedForType(index, draft.type);
              return (
              <Step key={stepLabel} disabled={isSkipped}>
                <StepButton
                  color="inherit"
                  onClick={() => handleStepClick(index)}
                  disabled={isSkipped || loading || saving}
                >
                  {stepLabel}
                </StepButton>
              </Step>
              );
            })}
          </Stepper>

          {loading ? (
            <Typography variant="body2" color="text.secondary">Chargement du tour...</Typography>
          ) : null}

          {!loading && stepIndex === STEP_DESCRIPTION ? (
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

          {!loading && stepIndex === STEP_DATES ? (
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

          {!loading && stepIndex === STEP_DEFINITION ? (
            <TourWizardStep3DefineForm
              tourType={draft.type}
              initialTourDefId={draft.tourDefKey}
              onTourDefChange={(tourDefId) => {
                setDraft((prev) => ({ ...prev, tourDefKey: tourDefId }));
              }}
              onError={onError}
            />
          ) : null}

          {!loading && draft.type === 'ligue' && stepIndex === STEP_GROUPES ? (
            <TourWizardStep4Groupes
              tourType={draft.type}
              tourDefId={draft.tourDefKey}
              initialGroupNames={existingGroupNames}
              nbParticipants={draft.participants}
              nbEquipe={draft.nbEquipe}
              nbGroupe={draft.nbGroupe}
              nbMatch={draft.nbMatch}
              onNbEquipeChange={(value) => {
                setDraft((prev) => ({ ...prev, nbEquipe: value }));
              }}
              onNbGroupeChange={(value) => {
                setDraft((prev) => ({ ...prev, nbGroupe: value }));
              }}
              onNbMatchChange={(value) => {
                setDraft((prev) => ({ ...prev, nbMatch: value }));
              }}
              onGroupNamesChange={setGroupNames}
              onError={onError}
            />
          ) : null}

          {!loading && draft.type === 'ligue' && stepIndex === STEP_CLASSEMENT ? (
            <TourWizardStep4Classement
              tourId={activeTourId}
              onError={onError}
            />
          ) : null}

          {!loading && stepIndex === STEP_PARTICIPANTS ? (
            <TourWizardStep5Participants
              tourId={activeTourId}
              competitionId={Number(competitionId) || 0}
              currentTourOrder={Number(draft.ordre) || 0}
              competitionSeason={String(competitionSeason ?? '').trim()}
              nbGroupe={draft.nbGroupe}
              groupNames={groupNames}
              onError={onError}
            />
          ) : null}

          {!loading && stepIndex === STEP_RENCONTRES ? (
            <TourWizardStep6Rencontres
              tourId={activeTourId}
              competitionId={Number(competitionId) || 0}
              tourType={draft.type}
              isAllerRetour={isAllerRetour}
              competitionSeason={String(competitionSeason ?? '').trim()}
              tourStartDate={toApiDate(draft.dateDebut) ?? ''}
              tourEndDate={toApiDate(draft.dateFin) ?? ''}
              tourDefaultHeure={String(draft.heureMatches ?? '').trim()}
              nbMatch={draft.nbMatch}
              nbGroupe={draft.nbGroupe}
              groupNames={groupNames}
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
