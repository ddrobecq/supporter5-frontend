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
import { DateInputField } from '../../components/DateInputField';
import { NumberField } from '../../components/NumberField';
import { TimeInputField } from '../../components/TimeInputField';
import { toErrorMessage } from '../../components/useEntityPage';
import {
  addTourParticipant,
  createCompetitionTour,
  createTourQualif,
  createTourRencontre,
  deleteTourQualif,
  deleteTourRencontre,
  fetchCompetitionTourById,
  fetchTourDefById,
  fetchTourParticipants,
  fetchTourQualifs,
  fetchTourRencontres,
  removeTourParticipants,
  updateTourQualif,
  updateTourRencontre,
  updateCompetitionTour,
  type CreateQualifPayload,
  type CreateTourMatchPayload,
} from './competitionApi';
import {
  createDefaultDraft,
  createDraftFromDetail,
  mapTourTypeToDb,
  toApiDate,
  type SelectionMode,
  type TourDraft,
  type TourType,
} from './tourWizardDialogModel';
import { TourWizardStep3DefineForm } from './TourWizardStep3DefineForm';
import { TourWizardStep4Groupes } from './TourWizardStep4Groupes';
import { TourWizardStep4Classement } from './TourWizardStep4Classement';
import { TourWizardStep5Participants } from './TourWizardStep5Participants';
import { TourWizardStep6Rencontres } from './TourWizardStep6Rencontres';
import { getDistinctNonEmptyGroupNames } from './tourWizardGroups';
import type { CompetitionTourUpsertPayload, QualifRow, TourMatchRow, TourParticipantRow } from './types';

const WIZARD_STEPS = ['Description', 'Dates', 'Définition', 'Groupes', 'Classement', 'Participants', 'Rencontres'] as const;

const STEP_DESCRIPTION = 0;
const STEP_DATES = 1;
const STEP_DEFINITION = 2;
const STEP_GROUPES = 3;
const STEP_CLASSEMENT = 4;
const STEP_PARTICIPANTS = 5;
const STEP_RENCONTRES = 6;

interface TourWizardDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  competitionId: string | number;
  competitionLabel: string;
  competitionSeason?: string;
  initialTourId?: number;
  proposedOrder: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
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

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function isRencontreProtected(row: TourMatchRow): boolean {
  const hasScore = Number(row.BUTDOM ?? 0) !== 0
    || Number(row.BUTEXT ?? 0) !== 0
    || Number(row.TABDOM ?? 0) !== 0
    || Number(row.TABEXT ?? 0) !== 0;
  const status = Number(row.ETAT ?? 0);
  const hasAdvancedStatus = ![0, 1, 5].includes(status);
  return hasScore || hasAdvancedStatus;
}

function hasRencontreCoreChange(existing: TourMatchRow, draft: TourMatchRow): boolean {
  return normalizeText(existing.DOMICILE) !== normalizeText(draft.DOMICILE)
    || normalizeText(existing.EXTERIEUR) !== normalizeText(draft.EXTERIEUR)
    || normalizeText(existing.PADOMSource) !== normalizeText(draft.PADOMSource)
    || normalizeText(existing.PAEXTSource) !== normalizeText(draft.PAEXTSource)
    || normalizeText(existing.IDCIRC) !== normalizeText(draft.IDCIRC);
}

function formatParticipantForDisplay(clubId: unknown, source: unknown): string {
  const club = normalizeText(clubId);
  if (club) return club;
  const src = normalizeText(source);
  return src ? `Programme(${src})` : '(inconnu)';
}

function formatRencontreForDisplay(row: TourMatchRow): string {
  const recId = Number(row.RECLEUNIK ?? 0);
  const circ = normalizeText(row.IDCIRC) || '-';
  const dom = formatParticipantForDisplay(row.DOMICILE, row.PADOMSource);
  const ext = formatParticipantForDisplay(row.EXTERIEUR, row.PAEXTSource);
  const date = normalizeText(row.DATE) || '-';
  return `#${recId} [${circ}] ${dom} vs ${ext} (${date})`;
}

function buildRencontreBlockingIssues(
  existingRencontres: TourMatchRow[],
  draftRencontres: TourMatchRow[],
): string[] {
  const issues: string[] = [];
  const existingById = new Map(
    existingRencontres.map((row) => [Number(row.RECLEUNIK), row] as const),
  );
  const draftIds = new Set(
    draftRencontres
      .map((row) => Number(row.RECLEUNIK))
      .filter((id) => Number.isInteger(id) && id > 0),
  );

  for (const existing of existingRencontres) {
    const id = Number(existing.RECLEUNIK ?? 0);
    if (!Number.isInteger(id) || id <= 0) {
      continue;
    }
    if (!draftIds.has(id) && isRencontreProtected(existing)) {
      issues.push(`Suppression interdite: ${formatRencontreForDisplay(existing)}`);
    }
  }

  for (const draft of draftRencontres) {
    const id = Number(draft.RECLEUNIK ?? 0);
    if (!Number.isInteger(id) || id <= 0 || !existingById.has(id)) {
      continue;
    }
    const existing = existingById.get(id)!;
    if (isRencontreProtected(existing) && hasRencontreCoreChange(existing, draft)) {
      issues.push(`Modification structurelle interdite: ${formatRencontreForDisplay(existing)}`);
    }
  }

  return issues;
}

export function TourWizardDialog({
  open,
  mode,
  competitionId,
  competitionLabel,
  competitionSeason,
  initialTourId,
  proposedOrder,
  onClose,
  onSaved,
  onError,
}: TourWizardDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<TourDraft>(createDefaultDraft(proposedOrder));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [finalTouched, setFinalTouched] = useState(false);
  const [initialTourType, setInitialTourType] = useState<TourType>('ligue');
  const [isAllerRetour, setIsAllerRetour] = useState(false);
  const [groupNames, setGroupNames] = useState<string[]>([]);
  const [existingGroupNames, setExistingGroupNames] = useState<string[]>([]);
  const [qualifDraftRows, setQualifDraftRows] = useState<QualifRow[]>([]);
  const [participantDraftRows, setParticipantDraftRows] = useState<TourParticipantRow[]>([]);
  const [rencontreDraftRows, setRencontreDraftRows] = useState<TourMatchRow[]>([]);

  useEffect(() => {
    if (!open) return;

    setStepIndex(0);
    setErrors({});
    setFinalTouched(false);
    setGroupNames([]);
    setExistingGroupNames([]);

    if (mode === 'create') {
      const nextDraft = createDefaultDraft(proposedOrder);
      setDraft(nextDraft);
      setInitialTourType(nextDraft.type);
      setIsAllerRetour(false);
      setQualifDraftRows([]);
      setParticipantDraftRows([]);
      setRencontreDraftRows([]);
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
      fetchTourQualifs(initialTourId),
      fetchTourRencontres(initialTourId),
    ])
      .then(([detail, participants, qualifs, rencontres]) => {
        const nextDraft = createDraftFromDetail(detail);
        setDraft(nextDraft);
        setInitialTourType(nextDraft.type);
        const loadedGroupNames = getDistinctNonEmptyGroupNames(participants)
          .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base', numeric: true }));
        setGroupNames(loadedGroupNames);
        setExistingGroupNames(loadedGroupNames);
        setParticipantDraftRows(participants);
        setQualifDraftRows(qualifs);
        setRencontreDraftRows(rencontres);
      })
      .catch((error) => {
        onError(toErrorMessage(error));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, mode, initialTourId, proposedOrder]);

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
    : 0;

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
    const payload: CompetitionTourUpsertPayload = {
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

    if (mode === 'edit') {
      payload.TUCLEUNIK = Number(draft.id) || Number(initialTourId) || undefined;
    }

    return payload;
  };

  const persistTourDependants = async (tourId: number) => {
    const [existingQualifs, existingParticipants, existingRencontres] = await Promise.all([
      fetchTourQualifs(tourId),
      fetchTourParticipants(tourId),
      fetchTourRencontres(tourId),
    ]);

    // Preflight global before any mutation to avoid partial saves.
    const rencontreBlockingIssues = buildRencontreBlockingIssues(existingRencontres, rencontreDraftRows);
    if (rencontreBlockingIssues.length > 0) {
      const details = rencontreBlockingIssues.join(' | ');
      throw new Error(`Enregistrement bloque: certaines rencontres protegees seraient supprimees ou modifiees. ${details}`);
    }

    const existingQualifById = new Map(
      existingQualifs.map((row) => [Number(row.CLASS_ID), row] as const),
    );
    const draftQualifRows = [...qualifDraftRows]
      .sort((a, b) => Number(a.CLASS_MinRang ?? 0) - Number(b.CLASS_MinRang ?? 0))
      .map((row) => ({
        ...row,
        CLASS_Libelle: normalizeText(row.CLASS_Libelle),
        CLASS_Abrege: normalizeText(row.CLASS_Abrege),
      }));
    const draftQualifIds = new Set(
      draftQualifRows
        .map((row) => Number(row.CLASS_ID))
        .filter((id) => Number.isInteger(id) && id > 0),
    );

    for (const row of draftQualifRows) {
      const payload: CreateQualifPayload = {
        CLASS_MinRang: Number(row.CLASS_MinRang) || 0,
        CLASS_MaxRang: Number(row.CLASS_MaxRang) || 0,
        CLASS_Couleur: Number(row.CLASS_Couleur) || 0,
        CLASS_Libelle: normalizeText(row.CLASS_Libelle),
        CLASS_Type: Number(row.CLASS_Type) || 2,
        TUCLEUNIK: tourId,
        CLASS_Abrege: normalizeText(row.CLASS_Abrege),
      };

      const id = Number(row.CLASS_ID);
      if (Number.isInteger(id) && id > 0 && existingQualifById.has(id)) {
        const existing = existingQualifById.get(id)!;
        const hasChange = Number(existing.CLASS_MinRang) !== payload.CLASS_MinRang
          || Number(existing.CLASS_MaxRang) !== payload.CLASS_MaxRang
          || Number(existing.CLASS_Couleur) !== payload.CLASS_Couleur
          || normalizeText(existing.CLASS_Libelle) !== payload.CLASS_Libelle
          || Number(existing.CLASS_Type) !== payload.CLASS_Type
          || normalizeText(existing.CLASS_Abrege) !== payload.CLASS_Abrege;
        if (hasChange) {
          await updateTourQualif(id, payload);
        }
      } else {
        await createTourQualif(payload);
      }
    }

    const qualifIdsToDelete = existingQualifs
      .map((row) => Number(row.CLASS_ID))
      .filter((id) => Number.isInteger(id) && id > 0 && !draftQualifIds.has(id));

    if (qualifIdsToDelete.length > 0) {
      await Promise.all(qualifIdsToDelete.map((id) => deleteTourQualif(id)));
    }

    const existingParticipantById = new Map(
      existingParticipants.map((row) => [Number(row.PACLEUNIK), row] as const),
    );
    const draftParticipantIds = new Set(
      participantDraftRows
        .map((row) => Number(row.PACLEUNIK))
        .filter((id) => Number.isInteger(id) && id > 0),
    );

    const participantIdsToRemove = existingParticipants
      .map((row) => Number(row.PACLEUNIK))
      .filter((id) => Number.isInteger(id) && id > 0 && !draftParticipantIds.has(id));

    if (participantIdsToRemove.length > 0) {
      await removeTourParticipants(tourId, [], participantIdsToRemove);
    }

    for (const row of participantDraftRows) {
      const participantId = Number(row.PACLEUNIK);
      const clubId = normalizeText(row.IDCLUB);
      const groupe = normalizeText(row.GROUPE);
      const paSource = normalizeText(row.PASource);

      if (Number.isInteger(participantId) && participantId > 0 && existingParticipantById.has(participantId)) {
        const existing = existingParticipantById.get(participantId)!;
        const hasChange = normalizeText(existing.IDCLUB) !== clubId
          || normalizeText(existing.GROUPE) !== groupe
          || normalizeText(existing.PASource) !== paSource;
        if (hasChange) {
          await removeTourParticipants(tourId, [], [participantId]);
          await addTourParticipant(tourId, clubId, groupe, paSource);
        }
        continue;
      }

      await addTourParticipant(tourId, clubId, groupe, paSource);
    }

    const existingRencontreById = new Map(
      existingRencontres.map((row) => [Number(row.RECLEUNIK), row] as const),
    );
    const draftRencontreIds = new Set(
      rencontreDraftRows
        .map((row) => Number(row.RECLEUNIK))
        .filter((id) => Number.isInteger(id) && id > 0),
    );

    const rencontreIdsToDelete = existingRencontres
      .map((row) => Number(row.RECLEUNIK))
      .filter((id) => Number.isInteger(id) && id > 0 && !draftRencontreIds.has(id));

    if (rencontreIdsToDelete.length > 0) {
      await Promise.all(rencontreIdsToDelete.map((id) => deleteTourRencontre(id)));
    }

    for (const row of rencontreDraftRows) {
      const rencontreId = Number(row.RECLEUNIK);
      const mappedDate = normalizeText(row.DATE);
      const mappedHeure = normalizeText(row.HEURE) || null;
      const mappedDomicile = normalizeText(row.DOMICILE);
      const mappedExterieur = normalizeText(row.EXTERIEUR);
      const mappedDomSource = normalizeText(row.PADOMSource);
      const mappedExtSource = normalizeText(row.PAEXTSource);
      const mappedCirc = normalizeText(row.IDCIRC);

      if (Number.isInteger(rencontreId) && rencontreId > 0 && existingRencontreById.has(rencontreId)) {
        const existing = existingRencontreById.get(rencontreId)!;

        const updatePayload: Partial<TourMatchRow> = {};
        if (normalizeText(existing.DATE) !== mappedDate) {
          updatePayload.DATE = mappedDate;
        }

        const existingHeure = normalizeText(existing.HEURE) || null;
        if (existingHeure !== mappedHeure) {
          updatePayload.HEURE = mappedHeure;
        }

        if (!isRencontreProtected(existing)) {
          if (normalizeText(existing.DOMICILE) !== mappedDomicile) {
            updatePayload.DOMICILE = mappedDomicile;
          }
          if (normalizeText(existing.EXTERIEUR) !== mappedExterieur) {
            updatePayload.EXTERIEUR = mappedExterieur;
          }
          if (normalizeText(existing.PADOMSource) !== mappedDomSource) {
            updatePayload.PADOMSource = mappedDomSource;
          }
          if (normalizeText(existing.PAEXTSource) !== mappedExtSource) {
            updatePayload.PAEXTSource = mappedExtSource;
          }
          if (normalizeText(existing.IDCIRC) !== mappedCirc) {
            updatePayload.IDCIRC = mappedCirc;
          }
          const existingEtat = Number(existing.ETAT ?? 0);
          const nextEtat = Number(row.ETAT ?? existingEtat);
          if (existingEtat !== nextEtat) {
            updatePayload.ETAT = nextEtat;
          }
        }

        if (Object.keys(updatePayload).length > 0) {
          await updateTourRencontre(rencontreId, updatePayload);
        }
        continue;
      }

      const payload: CreateTourMatchPayload = {
        DATE: mappedDate,
        HEURE: mappedHeure,
        DOMICILE: mappedDomicile,
        EXTERIEUR: mappedExterieur,
        BUTDOM: Number(row.BUTDOM ?? 0) || 0,
        BUTEXT: Number(row.BUTEXT ?? 0) || 0,
        TABDOM: Number(row.TABDOM ?? 0) || 0,
        TABEXT: Number(row.TABEXT ?? 0) || 0,
        ETAT: Number(row.ETAT ?? 5) || 5,
        TUCLEUNIK: tourId,
        SAISON: normalizeText(row.SAISON) || normalizeText(competitionSeason),
        READMIN: Number(row['READMIN'] ?? 0) || 0,
        COMMENT: normalizeText(row.COMMENT),
        VID_ID: Number.isInteger(Number(row.VID_ID)) ? Number(row.VID_ID) : null,
        IDCIRC: mappedCirc,
        PADOMSource: mappedDomSource,
        PAEXTSource: mappedExtSource,
      };

      await createTourRencontre(payload);
    }
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
      let targetTourId = Number(initialTourId ?? 0);

      if (mode === 'create') {
        const created = await createCompetitionTour(payload);
        targetTourId = Number(created?.TUCLEUNIK ?? 0);
        if (!Number.isInteger(targetTourId) || targetTourId <= 0) {
          throw new Error('Impossible de recuperer l identifiant du tour cree.');
        }
      } else {
        if (!initialTourId) {
          onError('Tour invalide.');
          return;
        }
        targetTourId = Number(initialTourId);
        await updateCompetitionTour(initialTourId, payload);
      }

      await persistTourDependants(targetTourId);
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
                value={mode === 'create' ? 'Attribue a l enregistrement' : String(draft.id)}
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

              <NumberField
                label="Nombre de participants"
                value={String(draft.participants)}
                onChange={(v) => {
                  setDraft((prev) => ({ ...prev, participants: v === '' ? 0 : Number(v) }));
                  setErrors((prev) => ({ ...prev, participants: '' }));
                }}
                fullWidth
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
              rows={qualifDraftRows}
              onRowsChange={setQualifDraftRows}
              onError={onError}
            />
          ) : null}

          {!loading && stepIndex === STEP_PARTICIPANTS ? (
            <TourWizardStep5Participants
              competitionId={Number(competitionId) || 0}
              currentTourOrder={Number(draft.ordre) || 0}
              competitionSeason={String(competitionSeason ?? '').trim()}
              nbGroupe={draft.nbGroupe}
              groupNames={groupNames}
              rows={participantDraftRows}
              onRowsChange={setParticipantDraftRows}
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
              participants={participantDraftRows}
              rencontres={rencontreDraftRows}
              onRencontresChange={setRencontreDraftRows}
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
