import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Step,
  StepButton,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import type { GridRowId } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { DateInputField, fromInputDateToDisplay, toInputDateFromDisplay } from '../../components/DateInputField';
import { toErrorMessage } from '../../components/useEntityPage';
import {
  createSaisonWithWizard,
  fetchLastSaison,
  fetchSaisonCompetitionsForWizard,
  fetchSaisonRosterForWizard,
} from './saisonApi';
import { SaisonWizardStep2Joueurs } from './SaisonWizardStep2Joueurs';
import { SaisonWizardStep3Competitions } from './SaisonWizardStep3Competitions';
import type {
  SaisonCreateWizardResult,
  SaisonWizardCompetitionRow,
  SaisonWizardJoueurRow,
} from './types';

const WIZARD_STEPS = ['Dates', 'Joueurs', 'Compétitions'] as const;
const STEP_DATES = 0;
const STEP_JOUEURS = 1;
const STEP_COMPETITIONS = 2;

interface SaisonCreateWizardDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (result: SaisonCreateWizardResult) => Promise<void> | void;
  onError: (message: string) => void;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function nextSaisonName(previous: string | undefined): string {
  const match = String(previous ?? '').trim().match(/^(\d{4})-(\d{4})$/);
  if (match) {
    const start = Number(match[1]) + 1;
    return `${start}-${start + 1}`;
  }
  const now = new Date();
  const startYear = now.getMonth() + 1 >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

function dayAfterIso(iso: string | undefined): string {
  const match = String(iso ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function startYearOfSaison(saison: string): number | null {
  const match = String(saison ?? '').trim().match(/^(\d{4})-\d{4}$/);
  return match ? Number(match[1]) : null;
}

function toIso(displayDate: string): string {
  return toInputDateFromDisplay(String(displayDate ?? '').trim());
}

export function SaisonCreateWizardDialog({ open, onClose, onCreated, onError }: SaisonCreateWizardDialogProps) {
  const [step, setStep] = useState(STEP_DATES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [previousSaison, setPreviousSaison] = useState('');
  const [saisonName, setSaisonName] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  const [rosterRows, setRosterRows] = useState<SaisonWizardJoueurRow[]>([]);
  const [rosterSelection, setRosterSelection] = useState<GridRowId[]>([]);
  const [rosterTouched, setRosterTouched] = useState(false);

  const [competitionRows, setCompetitionRows] = useState<SaisonWizardCompetitionRow[]>([]);
  const [competitionSelection, setCompetitionSelection] = useState<GridRowId[]>([]);
  const [idemIds, setIdemIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) {
      setStep(STEP_DATES);
      setSaving(false);
      setErrorMessage('');
      setPreviousSaison('');
      setSaisonName('');
      setDateDebut('');
      setDateFin('');
      setRosterRows([]);
      setRosterSelection([]);
      setRosterTouched(false);
      setCompetitionRows([]);
      setCompetitionSelection([]);
      setIdemIds(new Set());
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    void fetchLastSaison(controller.signal)
      .then((last) => {
        const nextName = nextSaisonName(last?.SAISON);
        const startYear = startYearOfSaison(nextName) ?? new Date().getFullYear();
        const defaultDebut = dayAfterIso(last?.SA_FIN) || `${startYear}-07-01`;
        const defaultFin = `${startYear + 1}-06-30`;

        setPreviousSaison(String(last?.SAISON ?? '').trim());
        setSaisonName(nextName);
        setDateDebut(fromInputDateToDisplay(defaultDebut));
        setDateFin(fromInputDateToDisplay(defaultFin));

        if (!last?.SAISON) {
          return;
        }

        return Promise.all([
          fetchSaisonRosterForWizard(last.SAISON, controller.signal),
          fetchSaisonCompetitionsForWizard(last.SAISON, controller.signal),
        ]).then(([roster, competitions]) => {
          setRosterRows(roster);
          setCompetitionRows(competitions);
          setCompetitionSelection(competitions.map((row) => row.COCLEUNIK));
          setIdemIds(new Set(competitions.map((row) => row.COCLEUNIK)));
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setErrorMessage(toErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [open]);

  const isoDebut = useMemo(() => toIso(dateDebut), [dateDebut]);
  const isoFin = useMemo(() => toIso(dateFin), [dateFin]);

  // Tant que l'utilisateur n'a pas coche/decoche un joueur a la main, la selection par defaut
  // suit la date de debut saisie a l'etape precedente (regle metier: contrat au-dela de cette date).
  useEffect(() => {
    if (rosterTouched || rosterRows.length === 0 || !isoDebut) {
      return;
    }
    const defaultSelected = rosterRows
      .filter((row) => !row.CONTRAT_FIN || row.CONTRAT_FIN > isoDebut)
      .map((row) => row.JOCLEUNIK);
    setRosterSelection(defaultSelected);
  }, [rosterRows, isoDebut, rosterTouched]);

  const validateStepDates = (): boolean => {
    if (!/^\d{4}-\d{4}$/.test(saisonName.trim())) {
      setErrorMessage('Le nom de la saison doit avoir le format aaaa-aaaa.');
      return false;
    }
    if (!isoDebut) {
      setErrorMessage('La date de debut est requise.');
      return false;
    }
    if (!isoFin) {
      setErrorMessage('La date de fin est requise.');
      return false;
    }
    if (isoFin < isoDebut) {
      setErrorMessage('La date de fin doit etre posterieure ou egale a la date de debut.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const validateStepDatesSilently = (): boolean => (
    /^\d{4}-\d{4}$/.test(saisonName.trim()) && Boolean(isoDebut) && Boolean(isoFin) && isoFin >= isoDebut
  );

  const canGoNext = step === STEP_DATES ? validateStepDatesSilently() : true;

  const handleNext = () => {
    if (step === STEP_DATES && !validateStepDates()) return;
    setErrorMessage('');
    setStep((prev) => Math.min(prev + 1, STEP_COMPETITIONS));
  };

  const handleBack = () => {
    setErrorMessage('');
    setStep((prev) => Math.max(prev - 1, STEP_DATES));
  };

  const handleFinish = async () => {
    if (!validateStepDates()) {
      setStep(STEP_DATES);
      return;
    }

    const rosterById = new Map(rosterRows.map((row) => [row.JOCLEUNIK, row]));
    const selectedJoueurs = rosterSelection
      .map((id) => rosterById.get(Number(id)))
      .filter((row): row is SaisonWizardJoueurRow => Boolean(row))
      .map((row) => ({ idJoueur: row.IDJOUEUR, poste: row.POSTE }));

    const selectedCompetitionIds = new Set(competitionSelection.map((id) => Number(id)));
    const selectedCompetitions = competitionRows
      .filter((row) => selectedCompetitionIds.has(row.COCLEUNIK))
      .map((row) => ({ competitionId: row.COCLEUNIK, idem: idemIds.has(row.COCLEUNIK) }));

    setSaving(true);
    try {
      const result = await createSaisonWithWizard({
        saison: saisonName.trim(),
        saDebut: isoDebut,
        saFin: isoFin,
        joueurs: selectedJoueurs,
        competitions: selectedCompetitions,
      });
      await onCreated(result);
      onClose();
    } catch (error) {
      onError(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDialogClose = () => {
    if (!saving) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      fullWidth
      maxWidth="lg"
      slotProps={{
        paper: {
          sx: {
            height: 'min(88vh, 820px)',
            width: 'min(96vw, 1100px)',
            maxWidth: '1100px',
          },
        },
      }}
    >
      <DialogTitle>Nouvelle saison</DialogTitle>
      <DialogContent sx={{ display: 'flex', minHeight: 0, overflowY: 'hidden', overflowX: 'hidden', px: 2 }}>
        <Stack spacing={2} sx={{ pt: 0.5, flex: 1, minHeight: 0, minWidth: 0, overflowY: 'auto', overflowX: 'hidden' }}>
          {previousSaison ? (
            <Typography variant="body2" color="text.secondary">
              Saison precedente : {previousSaison}
            </Typography>
          ) : null}

          <Stepper activeStep={step} alternativeLabel>
            {WIZARD_STEPS.map((label, index) => (
              <Step key={label}>
                <StepButton
                  color="inherit"
                  onClick={() => {
                    if (loading || saving) return;
                    if (index > STEP_DATES && !validateStepDatesSilently()) return;
                    setStep(index);
                  }}
                  disabled={loading || saving}
                >
                  {label}
                </StepButton>
              </Step>
            ))}
          </Stepper>

          {loading ? (
            <Typography variant="body2" color="text.secondary">Chargement...</Typography>
          ) : null}

          {!loading && step === STEP_DATES ? (
            <Stack spacing={1.5}>
              <TextField
                label="Saison"
                value={saisonName}
                onChange={(event) => setSaisonName(event.target.value)}
                size="small"
                fullWidth
                autoFocus
                helperText="Format aaaa-aaaa"
              />
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                <DateInputField
                  label="Date de debut"
                  value={dateDebut}
                  onChange={setDateDebut}
                  fullWidth
                  required
                />
                <DateInputField
                  label="Date de fin"
                  value={dateFin}
                  onChange={setDateFin}
                  fullWidth
                  required
                />
              </Stack>
            </Stack>
          ) : null}

          {!loading && step === STEP_JOUEURS ? (
            <SaisonWizardStep2Joueurs
              rows={rosterRows}
              selection={rosterSelection}
              onSelectionChange={(next) => {
                setRosterTouched(true);
                setRosterSelection(next);
              }}
            />
          ) : null}

          {!loading && step === STEP_COMPETITIONS ? (
            <SaisonWizardStep3Competitions
              rows={competitionRows}
              selection={competitionSelection}
              onSelectionChange={setCompetitionSelection}
              idemIds={idemIds}
              onIdemChange={(competitionId, idem) => {
                setIdemIds((prev) => {
                  const next = new Set(prev);
                  if (idem) {
                    next.add(competitionId);
                  } else {
                    next.delete(competitionId);
                  }
                  return next;
                });
              }}
            />
          ) : null}

          {errorMessage ? (
            <Typography variant="body2" color="error.main">{errorMessage}</Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose} color="inherit" disabled={saving}>Annuler</Button>
        <Button onClick={handleBack} disabled={step === STEP_DATES || loading || saving}>Precedent</Button>
        {step !== STEP_COMPETITIONS ? (
          <Button onClick={handleNext} disabled={!canGoNext || loading || saving}>Suivant</Button>
        ) : (
          <Button variant="contained" onClick={() => void handleFinish()} disabled={saving || loading}>
            {saving ? 'Enregistrement...' : 'Terminer'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
