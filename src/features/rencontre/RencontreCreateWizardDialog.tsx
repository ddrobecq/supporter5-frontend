import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { ClubSelectField } from '../../components/ClubSelectField';
import { DateInputField } from '../../components/DateInputField';
import { INVALID_DATE_MESSAGE, todayIso, toIsoDate } from '../../components/dateUtils';
import { useInvalidDateFields } from '../../components/useInvalidDateFields';
import { TimeInputField } from '../../components/TimeInputField';
import { toErrorMessage } from '../../components/useEntityPage';
import { isAbortError } from '../../lib/httpErrors';
import { useDepsChanged } from '../../lib/useDepsChanged';
import {
  fetchCircByTourType,
  fetchCompetition,
  fetchCompetitionTourById,
  fetchCompetitionToursPublic,
  fetchCompetitionWizardData,
  fetchTourParticipants,
} from '../competition/competitionApi';
import type { CircOptionRow, CompetitionTourRow, TourParticipantRow } from '../competition/types';
import { SUPPORTED_CLUB_FALLBACK_ID, SUPPORTED_CLUB_FALLBACK_NAME, supportedClubStore } from '../system/supportedClubStore';
import { createRencontre } from './rencontreApi';

type WizardStep = 1 | 2;
type MatchKind = 'amical' | 'officiel';

interface CompetitionOption {
  id: string;
  label: string;
}

interface RencontreCreateWizardDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (rencontreId: string | number, label: string) => Promise<void> | void;
}

interface ClubValue {
  clubId: string;
  clubName: string;
}


function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function nowDisplayTime(): string {
  const now = new Date();
  return `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}

function deriveSeasonFromIsoDate(isoDate: string): string {
  const match = String(isoDate ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return m >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month >= 7) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

function pickNearestSeason(availableSeasons: string[], preferredSeason: string): string {
  const normalized = preferredSeason.trim();
  if (!availableSeasons.length) {
    return normalized;
  }
  if (availableSeasons.includes(normalized)) {
    return normalized;
  }

  const preferredStart = Number((normalized.match(/^(\d{4})-/) ?? [])[1] ?? NaN);
  if (!Number.isFinite(preferredStart)) {
    return availableSeasons[0];
  }

  let best = availableSeasons[0];
  let bestDelta = Number.POSITIVE_INFINITY;

  for (const season of availableSeasons) {
    const start = Number((season.match(/^(\d{4})-/) ?? [])[1] ?? NaN);
    if (!Number.isFinite(start)) {
      continue;
    }
    const delta = Math.abs(start - preferredStart);
    if (delta < bestDelta) {
      best = season;
      bestDelta = delta;
    }
  }

  return best;
}

function buildCompetitionLabel(row: Record<string, unknown>): string {
  const nom = String(row.NOM ?? '').trim();
  const saison = String(row.SAISON ?? '').trim();
  return [nom, saison].filter(Boolean).join(' ');
}

function parseGroupNames(participants: TourParticipantRow[]): string[] {
  const set = new Set<string>();
  participants.forEach((row) => {
    const group = String(row.GROUPE ?? '').trim();
    if (group) {
      set.add(group);
    }
  });
  return [...set].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}

export function RencontreCreateWizardDialog({ open, onClose, onCreated }: RencontreCreateWizardDialogProps) {
  const supportedClubId = supportedClubStore((s) => s.clubId);
  const supportedClubName = supportedClubStore((s) => s.clubName);
  const loadSupportedClub = supportedClubStore((s) => s.load);

  const [step, setStep] = useState<WizardStep>(1);
  const [saving, setSaving] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { dateValidityHandler, isDateInvalid } = useInvalidDateFields();

  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');
  const [season, setSeason] = useState('');
  const [seasonTouched, setSeasonTouched] = useState(false);
  const [domicile, setDomicile] = useState<ClubValue>({ clubId: '', clubName: '' });
  const [exterieur, setExterieur] = useState<ClubValue>({ clubId: '', clubName: '' });

  const [matchKind, setMatchKind] = useState<MatchKind>('amical');
  const [competitionId, setCompetitionId] = useState('');
  const [tourId, setTourId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [circId, setCircId] = useState('');

  const [seasonOptions, setSeasonOptions] = useState<string[]>([]);
  const [competitionOptions, setCompetitionOptions] = useState<CompetitionOption[]>([]);
  const [tourOptions, setTourOptions] = useState<CompetitionTourRow[]>([]);
  const [groupOptions, setGroupOptions] = useState<string[]>([]);
  const [circOptions, setCircOptions] = useState<CircOptionRow[]>([]);
  const [tourParticipants, setTourParticipants] = useState<TourParticipantRow[]>([]);

  // State resets, defaults and loading flags run while rendering, on the dependencies of the load effects below.
  const openDepsChanged = useDepsChanged([loadSupportedClub, open]);
  if (openDepsChanged) {
    if (!open) {
      setStep(1);
      setSaving(false);
      setOptionsLoading(false);
      setErrorMessage('');
      setDate('');
      setHeure('');
      setSeason('');
      setSeasonTouched(false);
      setDomicile({ clubId: '', clubName: '' });
      setExterieur({ clubId: '', clubName: '' });
      setMatchKind('amical');
      setCompetitionId('');
      setTourId('');
      setGroupName('');
      setCircId('');
      setSeasonOptions([]);
      setCompetitionOptions([]);
      setTourOptions([]);
      setGroupOptions([]);
      setCircOptions([]);
      setTourParticipants([]);
    } else {
      setDate(todayIso());
      setHeure(nowDisplayTime());
      setOptionsLoading(true);
    }
  }

  useEffect(() => {
    if (!open) return;

    const defaultSeason = deriveSeasonFromIsoDate(toIsoDate(todayIso()));
    // Each load below is aborted when its selection changes (or the dialog closes), so a slow
    // response for a previous selection can never overwrite the options of the current one.
    const controller = new AbortController();

    void Promise.all([
      fetchCompetitionWizardData(controller.signal),
      loadSupportedClub(),
    ])
      .then(([wizardData]) => {
        if (controller.signal.aborted) return;
        const nextSeasons = (wizardData.saisons ?? [])
          .map((item) => String(item.SAISON ?? '').trim())
          .filter(Boolean);
        setSeasonOptions(nextSeasons);
        setSeason(pickNearestSeason(nextSeasons, defaultSeason));
      })
      .catch((error) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setErrorMessage(toErrorMessage(error));
        setSeason(defaultSeason);
      })
      .finally(() => {
        setOptionsLoading(false);
      });
    return () => controller.abort();
  }, [loadSupportedClub, open]);

  const handleDomicileChange = (nextValue: ClubValue) => {
    setDomicile(nextValue);
    setExterieur({
      clubId: supportedClubId || SUPPORTED_CLUB_FALLBACK_ID,
      clubName: supportedClubName || SUPPORTED_CLUB_FALLBACK_NAME,
    });
    setErrorMessage('');
  };

  const handleExterieurChange = (nextValue: ClubValue) => {
    setExterieur(nextValue);
    setDomicile({
      clubId: supportedClubId || SUPPORTED_CLUB_FALLBACK_ID,
      clubName: supportedClubName || SUPPORTED_CLUB_FALLBACK_NAME,
    });
    setErrorMessage('');
  };

  const seasonDefaultDepsChanged = useDepsChanged([date, open, seasonOptions, seasonTouched]);
  if (seasonDefaultDepsChanged && open && !seasonTouched) {
    const preferredSeason = deriveSeasonFromIsoDate(toIsoDate(date));
    setSeason((prev) => {
      const next = pickNearestSeason(seasonOptions, preferredSeason);
      return prev === next ? prev : next;
    });
  }

  const seasonDepsChanged = useDepsChanged([matchKind, open, season]);
  if (seasonDepsChanged) {
    if (!open || matchKind !== 'officiel' || !season) {
      setCompetitionOptions([]);
      setCompetitionId('');
      setTourOptions([]);
      setTourId('');
      setGroupOptions([]);
      setGroupName('');
      setCircOptions([]);
      setCircId('');
      setTourParticipants([]);
    } else {
      setOptionsLoading(true);
      setCompetitionId('');
      setTourId('');
      setGroupOptions([]);
      setGroupName('');
      setCircOptions([]);
      setCircId('');
      setTourParticipants([]);
    }
  }

  const competitionDepsChanged = useDepsChanged([competitionId, matchKind, open]);
  if (competitionDepsChanged) {
    if (!open || matchKind !== 'officiel' || !competitionId) {
      setTourOptions([]);
      setTourId('');
      setGroupOptions([]);
      setGroupName('');
      setCircOptions([]);
      setCircId('');
      setTourParticipants([]);
    } else {
      setOptionsLoading(true);
      setTourId('');
      setGroupOptions([]);
      setGroupName('');
      setCircOptions([]);
      setCircId('');
      setTourParticipants([]);
    }
  }

  const tourDepsChanged = useDepsChanged([matchKind, open, tourId]);
  if (tourDepsChanged) {
    if (!open || matchKind !== 'officiel' || !tourId) {
      setGroupOptions([]);
      setGroupName('');
      setCircOptions([]);
      setCircId('');
      setTourParticipants([]);
    } else {
      setOptionsLoading(true);
      setGroupName('');
      setCircId('');
    }
  }

  useEffect(() => {
    if (!open || matchKind !== 'officiel' || !season) return;

    const controller = new AbortController();
    void fetchCompetition('', season, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        const rows = (result.data ?? []).map((row) => ({
          id: String(row.COCLEUNIK ?? '').trim(),
          label: buildCompetitionLabel(row as unknown as Record<string, unknown>) || String(row.COCLEUNIK ?? '').trim(),
        })).filter((row) => row.id);
        setCompetitionOptions(rows);
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        setErrorMessage(toErrorMessage(error));
        setCompetitionOptions([]);
      })
      .finally(() => {
        setOptionsLoading(false);
      });
    return () => controller.abort();
  }, [matchKind, open, season]);

  useEffect(() => {
    if (!open || matchKind !== 'officiel' || !competitionId) return;

    const controller = new AbortController();
    void fetchCompetitionToursPublic(competitionId, controller.signal)
      .then((rows) => {
        if (controller.signal.aborted) return;
        setTourOptions(rows ?? []);
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        setErrorMessage(toErrorMessage(error));
        setTourOptions([]);
      })
      .finally(() => {
        setOptionsLoading(false);
      });
    return () => controller.abort();
  }, [competitionId, matchKind, open]);

  useEffect(() => {
    if (!open || matchKind !== 'officiel' || !tourId) return;

    const controller = new AbortController();
    void Promise.all([
      fetchCompetitionTourById(tourId, controller.signal),
      fetchTourParticipants(tourId, controller.signal),
    ])
      .then(async ([tourDetail, participants]) => {
        const tourType = Number(tourDetail.TDTYPETOUR ?? 1) || 1;
        const nextCirc = await fetchCircByTourType(tourType, controller.signal);
        if (controller.signal.aborted) return;

        setTourParticipants(participants ?? []);
        setGroupOptions(parseGroupNames(participants ?? []));
        setCircOptions(nextCirc ?? []);
      })
      .catch((error) => {
        if (isAbortError(error)) return;
        setErrorMessage(toErrorMessage(error));
        setTourParticipants([]);
        setGroupOptions([]);
        setCircOptions([]);
      })
      .finally(() => {
        setOptionsLoading(false);
      });
    return () => controller.abort();
  }, [matchKind, open, tourId]);

  const dateInvalid = isDateInvalid('date');
  const canGoNext = useMemo(() => {
    if (dateInvalid) return false;
    const isoDate = toIsoDate(date);
    if (!isoDate) return false;
    if (!season.trim()) return false;
    if (!domicile.clubId.trim() || !exterieur.clubId.trim()) return false;
    if (domicile.clubId.trim() === exterieur.clubId.trim()) return false;
    return true;
  }, [date, dateInvalid, season, domicile, exterieur]);

  const canCreate = useMemo(() => {
    if (saving) return false;
    if (!canGoNext) return false;
    if (matchKind === 'amical') return true;
    if (!competitionId || !tourId) return false;
    if (groupOptions.length > 0 && !groupName) return false;
    return true;
  }, [canGoNext, competitionId, groupName, groupOptions.length, matchKind, saving, tourId]);

  const selectedTourLabel = useMemo(() => {
    const row = tourOptions.find((item) => String(item.TUCLEUNIK) === tourId);
    if (!row) return '';
    return String(row.TOUR ?? '').trim() || `Tour ${tourId}`;
  }, [tourId, tourOptions]);

  const validateStepOne = (): boolean => {
    if (dateInvalid) {
      setErrorMessage(INVALID_DATE_MESSAGE);
      return false;
    }
    const isoDate = toIsoDate(date);
    if (!isoDate) {
      setErrorMessage('La date est requise.');
      return false;
    }
    if (!season.trim()) {
      setErrorMessage('La saison est requise.');
      return false;
    }
    if (!domicile.clubId.trim()) {
      setErrorMessage("L'équipe domicile est requise.");
      return false;
    }
    if (!exterieur.clubId.trim()) {
      setErrorMessage("L'équipe extérieure est requise.");
      return false;
    }
    if (domicile.clubId.trim() === exterieur.clubId.trim()) {
      setErrorMessage('Les équipes domicile et extérieure doivent être différentes.');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const validateOfficialContext = (): boolean => {
    if (matchKind !== 'officiel') {
      return true;
    }

    if (!competitionId) {
      setErrorMessage('La compétition est requise pour un match officiel.');
      return false;
    }
    if (!tourId) {
      setErrorMessage('Le tour est requis pour un match officiel.');
      return false;
    }
    if (groupOptions.length > 0 && !groupName) {
      setErrorMessage('Le groupe est requis pour ce tour.');
      return false;
    }

    if (groupName) {
      const wantedGroup = groupName.trim();
      const homeInGroup = tourParticipants.some(
        (row) => String(row.IDCLUB ?? '').trim() === domicile.clubId.trim() && String(row.GROUPE ?? '').trim() === wantedGroup,
      );
      const awayInGroup = tourParticipants.some(
        (row) => String(row.IDCLUB ?? '').trim() === exterieur.clubId.trim() && String(row.GROUPE ?? '').trim() === wantedGroup,
      );
      if (!homeInGroup || !awayInGroup) {
        setErrorMessage('Les deux équipes doivent appartenir au groupe sélectionné.');
        return false;
      }
    }

    setErrorMessage('');
    return true;
  };

  const handlePrimary = () => {
    if (step === 1) {
      if (!validateStepOne()) return;
      setStep(2);
      return;
    }

    void handleCreate();
  };

  const handleCreate = async () => {
    if (!validateStepOne()) return;
    if (!validateOfficialContext()) return;

    setSaving(true);
    try {
      const created = await createRencontre({
        DATE: toIsoDate(date),
        HEURE: String(heure ?? '').trim() || null,
        DOMICILE: domicile.clubId.trim(),
        EXTERIEUR: exterieur.clubId.trim(),
        BUTDOM: 0,
        BUTEXT: 0,
        TABDOM: 0,
        TABEXT: 0,
        ETAT: 1,
        TUCLEUNIK: matchKind === 'officiel' ? Number(tourId) || 0 : 0,
        SAISON: season.trim(),
        READMIN: 0,
        COMMENT: '',
        IDCIRC: matchKind === 'officiel' ? (circId || null) : null,
        PADOMSource: '',
        PAEXTSource: '',
      });

      const createdId = created?.RECLEUNIK;
      if (createdId === undefined || createdId === null || !String(createdId).trim()) {
        setErrorMessage('Création réussie mais identifiant de rencontre introuvable.');
        return;
      }

      const coreLabel = `${domicile.clubName || domicile.clubId} - ${exterieur.clubName || exterieur.clubId}`;
      const label = matchKind === 'officiel' && selectedTourLabel
        ? `${coreLabel} (${selectedTourLabel})`
        : coreLabel;

      await onCreated(createdId, label);
      onClose();
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDialogClose = () => {
    if (!saving) {
      onClose();
    }
  };

  const seasonSelectDisabled = optionsLoading || saving || seasonOptions.length === 0;
  const effectiveSeasonOptions = seasonOptions.length > 0
    ? seasonOptions
    : (season ? [season] : []);

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="md">
      <DialogTitle>Nouvelle rencontre</DialogTitle>
      <DialogContent sx={{ p: 0, overflowX: 'hidden' }}>
        <Box sx={{ px: 3, pt: 1.5, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {step === 1 ? (
            <Stack spacing={1.5}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.25 }}>
                <DateInputField
                  label="Date"
                  value={date}
                  onChange={setDate}
                  onValidityChange={dateValidityHandler('date')}
                  required
                  autoFocus
                />
                <TimeInputField
                  label="Heure"
                  value={heure}
                  onChange={setHeure}
                />
                <FormControl size="small" required>
                  <InputLabel id="rencontre-create-saison-label">Saison</InputLabel>
                  <Select
                    labelId="rencontre-create-saison-label"
                    label="Saison"
                    value={effectiveSeasonOptions.includes(season) ? season : ''}
                    disabled={seasonSelectDisabled}
                    onChange={(event) => {
                      setSeasonTouched(true);
                      setSeason(String(event.target.value ?? ''));
                    }}
                  >
                    {effectiveSeasonOptions.map((value) => (
                      <MenuItem key={value} value={value}>{value}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <ClubSelectField
                label="Équipe domicile"
                clubId={domicile.clubId}
                clubName={domicile.clubName}
                onChange={handleDomicileChange}
                required
                disabled={saving}
              />

              <ClubSelectField
                label="Équipe extérieure"
                clubId={exterieur.clubId}
                clubName={exterieur.clubName}
                onChange={handleExterieurChange}
                required
                disabled={saving}
              />
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <FormControl size="small" sx={{ width: { xs: '100%', sm: 260 } }}>
                <InputLabel id="rencontre-create-kind-label">Type de match</InputLabel>
                <Select
                  labelId="rencontre-create-kind-label"
                  label="Type de match"
                  value={matchKind}
                  onChange={(event) => {
                    const nextKind = String(event.target.value ?? 'amical') as MatchKind;
                    setMatchKind(nextKind);
                    setErrorMessage('');
                  }}
                >
                  <MenuItem value="amical">Amicale</MenuItem>
                  <MenuItem value="officiel">Officiel</MenuItem>
                </Select>
              </FormControl>

              {matchKind === 'officiel' ? (
                <>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.25 }}>
                    <FormControl size="small" required>
                      <InputLabel id="rencontre-create-competition-label">Compétition</InputLabel>
                      <Select
                        labelId="rencontre-create-competition-label"
                        label="Compétition"
                        value={competitionId}
                        disabled={saving || optionsLoading}
                        onChange={(event) => setCompetitionId(String(event.target.value ?? ''))}
                      >
                        <MenuItem value="">(Choisir)</MenuItem>
                        {competitionOptions.map((option) => (
                          <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl size="small" required disabled={!competitionId || saving || optionsLoading}>
                      <InputLabel id="rencontre-create-tour-label">Tour</InputLabel>
                      <Select
                        labelId="rencontre-create-tour-label"
                        label="Tour"
                        value={tourId}
                        onChange={(event) => setTourId(String(event.target.value ?? ''))}
                      >
                        <MenuItem value="">(Choisir)</MenuItem>
                        {tourOptions.map((tour) => (
                          <MenuItem key={tour.TUCLEUNIK} value={String(tour.TUCLEUNIK)}>
                            {String(tour.TOUR ?? '').trim() || `Tour ${tour.TUCLEUNIK}`}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.25 }}>
                    <FormControl size="small" required={groupOptions.length > 0} disabled={!tourId || saving || optionsLoading || groupOptions.length === 0}>
                      <InputLabel id="rencontre-create-groupe-label">Groupe</InputLabel>
                      <Select
                        labelId="rencontre-create-groupe-label"
                        label="Groupe"
                        value={groupName}
                        onChange={(event) => setGroupName(String(event.target.value ?? ''))}
                      >
                        <MenuItem value="">(Choisir)</MenuItem>
                        {groupOptions.map((group) => (
                          <MenuItem key={group} value={group}>{group}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl size="small" disabled={!tourId || saving || optionsLoading}>
                      <InputLabel id="rencontre-create-circ-label">Circonstance</InputLabel>
                      <Select
                        labelId="rencontre-create-circ-label"
                        label="Circonstance"
                        value={circId}
                        onChange={(event) => setCircId(String(event.target.value ?? ''))}
                      >
                        <MenuItem value="">(Choisir)</MenuItem>
                        {circOptions.map((circ) => (
                          <MenuItem key={circ.IDCIRC} value={circ.IDCIRC}>{circ.CIRC}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </>
              ) : null}
            </Stack>
          )}

          {errorMessage ? (
            <Typography variant="body2" color="error.main">{errorMessage}</Typography>
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, justifyContent: 'flex-end' }}>
        <Button onClick={handleDialogClose} color="inherit" disabled={saving}>Annuler</Button>
        {step === 2 ? (
          <Button
            onClick={() => {
              setErrorMessage('');
              setStep(1);
            }}
            color="inherit"
            disabled={saving}
          >
            Précédent
          </Button>
        ) : null}
        <Button
          onClick={handlePrimary}
          variant="contained"
          disabled={step === 1 ? !canGoNext || saving : !canCreate}
        >
          {saving ? 'Enregistrement...' : step === 1 ? 'Suivant' : 'OK'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}