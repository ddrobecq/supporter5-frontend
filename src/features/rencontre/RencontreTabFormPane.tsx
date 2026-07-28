import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { DateInputField, fromInputDateToDisplay, toInputDateFromDisplay } from '../../components/DateInputField';
import { TimeInputField } from '../../components/TimeInputField';
import { toErrorMessage } from '../../components/useEntityPage';
import { useTabMetaEvents } from '../../lib/useTabMetaEvents';
import { useEntityImage } from '../../lib/useEntityImage';
import {
  fetchCircByTourType,
  fetchCompetition,
  fetchCompetitionTourById,
  fetchCompetitionTours,
  fetchCompetitionWizardData,
} from '../competition/competitionApi';
import type { CircOptionRow, CompetitionTourRow } from '../competition/types';
import { fetchRencontreDetailById, updateRencontreDetail } from './rencontreApi';
import type { RencontreDetailRow } from './types';

interface RencontreTabFormPaneProps {
  tabPath: string;
  rencontreId: string;
  active: boolean;
}

interface RencontreDraft {
  butDom: string;
  butExt: string;
  tabDom: string;
  tabExt: string;
  etat: number;
  date: string;
  heure: string;
  saison: string;
  competitionId: string;
  tourId: string;
  circId: string;
  comment: string;
  readmin: number;
}

interface CompetitionOption {
  id: string;
  label: string;
}

const STATUS_OPTIONS = [
  { value: 1, label: 'En attente' },
  { value: 2, label: 'En cours' },
  { value: 3, label: 'Terminee' },
  { value: 5, label: 'Programmee' },
  { value: 4, label: 'Non jouee' },
] as const;

function toNonNegativeIntegerString(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';
  return String(Math.max(0, Math.trunc(numeric)));
}

function toTwoDigitsNonNegative(value: unknown): string {
  return toNonNegativeIntegerString(value).slice(0, 2);
}

function normalizeColorCode(raw: unknown, fallback: string): string {
  const value = String(raw ?? '').trim();
  if (!value) return fallback;

  const numeric = Number(value);
  if (Number.isFinite(numeric) && Number.isInteger(numeric)) {
    const colorInt = Number(numeric);
    if (colorInt === -1) {
      return fallback;
    }
    if (colorInt >= 0 && colorInt <= 255) {
      const channel = colorInt.toString(16).padStart(2, '0');
      return `#${channel}${channel}${channel}`;
    }
    if (colorInt >= 0 && colorInt <= 0xFFFFFF) {
      // WinDev/OLE integer format: red is low byte, then green, then blue.
      const red = colorInt & 0xFF;
      const green = (colorInt >> 8) & 0xFF;
      const blue = (colorInt >> 16) & 0xFF;
      return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
    }
  }

  const hexCandidate = value.startsWith('#') ? value : `#${value}`;
  if (/^#[0-9a-fA-F]{3}$/.test(hexCandidate) || /^#[0-9a-fA-F]{6}$/.test(hexCandidate)) {
    return hexCandidate;
  }

  if (typeof CSS !== 'undefined' && CSS.supports('color', value)) {
    return value;
  }

  return fallback;
}

function toDisplayDate(value: string | null | undefined): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const datePart = text.split(' ')[0]?.trim() ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return '';
  return fromInputDateToDisplay(datePart);
}

function toApiDate(value: string): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const dashed = toInputDateFromDisplay(text);
  return dashed || null;
}

function toDisplayHeure(value: string | null | undefined): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const hhmm = text.match(/^([01]\d|2[0-3]):([0-5]\d)/);
  if (!hhmm) return '';
  return `${hhmm[1]}:${hhmm[2]}`;
}

function buildCompetitionLabel(row: Record<string, unknown>): string {
  const nom = String(row.NOM ?? '').trim();
  const saison = String(row.SAISON ?? '').trim();
  return [nom, saison].filter(Boolean).join(' ');
}

function buildDraftFromDetail(detail: RencontreDetailRow): RencontreDraft {
  const readmin = Number(detail.READMIN ?? 0) || 0;
  return {
    butDom: toNonNegativeIntegerString(detail.BUTDOM),
    butExt: toNonNegativeIntegerString(detail.BUTEXT),
    tabDom: toNonNegativeIntegerString(detail.TABDOM),
    tabExt: toNonNegativeIntegerString(detail.TABEXT),
    etat: Number(detail.ETAT ?? 1) || 1,
    date: toDisplayDate(detail.DATE),
    heure: toDisplayHeure(detail.HEURE),
    saison: String(detail.SAISON ?? '').trim(),
    competitionId: String(detail.COCLEUNIK ?? '').trim(),
    tourId: String(detail.TUCLEUNIK ?? '').trim(),
    circId: String(detail.IDCIRC ?? '').trim(),
    comment: String(detail.COMMENT ?? ''),
    readmin: readmin >= 1 && readmin <= 4 ? readmin : 1,
  };
}

function getDraftSignature(draft: RencontreDraft, adminDecisionEnabled: boolean): string {
  return JSON.stringify({
    butDom: toNonNegativeIntegerString(draft.butDom),
    butExt: toNonNegativeIntegerString(draft.butExt),
    tabDom: toNonNegativeIntegerString(draft.tabDom),
    tabExt: toNonNegativeIntegerString(draft.tabExt),
    etat: Number(draft.etat) || 1,
    date: toApiDate(draft.date),
    heure: String(draft.heure ?? '').trim() || null,
    saison: String(draft.saison ?? '').trim(),
    competitionId: String(draft.competitionId ?? '').trim(),
    tourId: String(draft.tourId ?? '').trim(),
    circId: String(draft.circId ?? '').trim(),
    comment: String(draft.comment ?? ''),
    readmin: adminDecisionEnabled ? Number(draft.readmin) || 1 : 0,
  });
}

function ClubInlineLine({
  clubId,
  clubName,
  clubShortName,
  clubFond,
  clubTexte,
  butValue,
  tabValue,
  onButChange,
  onTabChange,
  onOpenClub,
}: {
  clubId: string;
  clubName: string;
  clubShortName: string;
  clubFond: unknown;
  clubTexte: unknown;
  butValue: string;
  tabValue: string;
  onButChange: (value: string) => void;
  onTabChange: (value: string) => void;
  onOpenClub: () => void;
}) {
  const { src } = useEntityImage('club', clubId);
  const tooltipLabel = `Ouvrir la fiche de ${clubShortName || clubName}`;
  const fondColor = normalizeColorCode(clubFond, '#f2f4f7');
  const textColor = normalizeColorCode(clubTexte, '#111827');

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, width: '100%', flexWrap: 'nowrap' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            minWidth: 36,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#fafafa',
          }}
        >
          {src ? (
            <Box component="img" src={src} alt={clubName} sx={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
          ) : (
            <ShieldOutlinedIcon sx={{ color: 'text.disabled' }} />
          )}
        </Box>

        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            flex: 1,
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: textColor,
            bgcolor: fondColor,
            borderRadius: 1,
            px: 1,
            py: 0.25,
          }}
        >
          {clubName}
        </Typography>

        <Tooltip title={tooltipLabel}>
          <IconButton size="small" onClick={onOpenClub} aria-label={tooltipLabel}>
            <ShieldRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'nowrap' }}>
        <TextField
          label="But"
          size="small"
          type="text"
          value={butValue}
          onChange={(event) => onButChange(toTwoDigitsNonNegative(event.target.value))}
          slotProps={{
            htmlInput: {
              inputMode: 'numeric',
              pattern: '[0-9]*',
              maxLength: 2,
              style: { textAlign: 'center' },
            },
          }}
          sx={{ width: 68 }}
        />
        <TextField
          label="Tab"
          size="small"
          type="text"
          value={tabValue}
          onChange={(event) => onTabChange(toTwoDigitsNonNegative(event.target.value))}
          slotProps={{
            htmlInput: {
              inputMode: 'numeric',
              pattern: '[0-9]*',
              maxLength: 2,
              style: { textAlign: 'center' },
            },
          }}
          sx={{ width: 68 }}
        />
      </Stack>
    </Stack>
  );
}

export function RencontreTabFormPane({ tabPath, rencontreId, active }: RencontreTabFormPaneProps) {
  const navigate = useNavigate();
  const { setDirty, setLabel } = useTabMetaEvents(tabPath);
  const initialSignatureRef = useRef<string>('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<RencontreDetailRow | null>(null);
  const [draft, setDraft] = useState<RencontreDraft | null>(null);
  const [adminDecisionEnabled, setAdminDecisionEnabled] = useState(false);
  const [seasonOptions, setSeasonOptions] = useState<string[]>([]);
  const [competitionOptions, setCompetitionOptions] = useState<CompetitionOption[]>([]);
  const [tourOptions, setTourOptions] = useState<CompetitionTourRow[]>([]);
  const [circOptions, setCircOptions] = useState<CircOptionRow[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const loadCompetitionsForSeason = useCallback(async (season: string): Promise<CompetitionOption[]> => {
    const data = await fetchCompetition('', season);
    return (data.data ?? []).map((row) => ({
      id: String(row.COCLEUNIK ?? '').trim(),
      label: buildCompetitionLabel(row as unknown as Record<string, unknown>) || String(row.COCLEUNIK ?? '').trim(),
    }));
  }, []);

  const loadToursForCompetition = useCallback(async (competitionId: string): Promise<CompetitionTourRow[]> => {
    if (!competitionId) return [];
    return fetchCompetitionTours(competitionId);
  }, []);

  const loadCircsForTour = useCallback(async (tourId: string): Promise<CircOptionRow[]> => {
    if (!tourId) return [];
    const tourDetail = await fetchCompetitionTourById(tourId);
    const tourType = Number(tourDetail.TDTYPETOUR ?? 1) || 1;
    return fetchCircByTourType(tourType);
  }, []);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    try {
      const loadedDetail = await fetchRencontreDetailById(rencontreId);
      const nextDraft = buildDraftFromDetail(loadedDetail);
      const readmin = Number(loadedDetail.READMIN ?? 0) || 0;
      const initialAdminEnabled = readmin > 0;

      const [wizardData, competitions, tours, circs] = await Promise.all([
        fetchCompetitionWizardData(),
        loadCompetitionsForSeason(nextDraft.saison),
        loadToursForCompetition(nextDraft.competitionId),
        loadCircsForTour(nextDraft.tourId),
      ]);

      setDetail(loadedDetail);
      setDraft(nextDraft);
      setAdminDecisionEnabled(initialAdminEnabled);
      setSeasonOptions((wizardData.saisons ?? []).map((item) => String(item.SAISON ?? '').trim()).filter(Boolean));
      setCompetitionOptions(competitions);
      setTourOptions(tours);
      setCircOptions(circs);

      const signature = getDraftSignature(nextDraft, initialAdminEnabled);
      initialSignatureRef.current = signature;
      setDirty(false);
      const domLabel = String(loadedDetail.DOMICILE_ABREGE ?? '').trim() || String(loadedDetail.DOMICILE_NOM_EFFECTIF ?? '').trim();
      const extLabel = String(loadedDetail.EXTERIEUR_ABREGE ?? '').trim() || String(loadedDetail.EXTERIEUR_NOM_EFFECTIF ?? '').trim();
      setLabel(`${domLabel} - ${extLabel}`);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [loadCircsForTour, loadCompetitionsForSeason, loadToursForCompetition, rencontreId, setDirty, setLabel]);

  useEffect(() => {
    void reloadAll();
    return () => setDirty(false);
  }, [reloadAll, setDirty]);

  const isDirty = useMemo(() => {
    if (!draft) return false;
    return getDraftSignature(draft, adminDecisionEnabled) !== initialSignatureRef.current;
  }, [draft, adminDecisionEnabled]);

  useEffect(() => {
    setDirty(isDirty);
  }, [isDirty, setDirty]);

  const handleSeasonChange = async (nextSeason: string) => {
    if (!draft) return;
    setDraft((prev) => (prev ? {
      ...prev,
      saison: nextSeason,
      competitionId: '',
      tourId: '',
      circId: '',
    } : prev));
    setOptionsLoading(true);
    try {
      const competitions = await loadCompetitionsForSeason(nextSeason);
      setCompetitionOptions(competitions);
      setTourOptions([]);
      setCircOptions([]);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setOptionsLoading(false);
    }
  };

  const handleCompetitionChange = async (competitionId: string) => {
    if (!draft) return;
    setDraft((prev) => (prev ? { ...prev, competitionId, tourId: '', circId: '' } : prev));
    setOptionsLoading(true);
    try {
      const tours = await loadToursForCompetition(competitionId);
      setTourOptions(tours);
      setCircOptions([]);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setOptionsLoading(false);
    }
  };

  const handleTourChange = async (tourId: string) => {
    if (!draft) return;
    setDraft((prev) => (prev ? { ...prev, tourId, circId: '' } : prev));
    setOptionsLoading(true);
    try {
      const circs = await loadCircsForTour(tourId);
      setCircOptions(circs);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setOptionsLoading(false);
    }
  };

  const resetDraft = () => {
    if (!detail) return;
    const nextDraft = buildDraftFromDetail(detail);
    const readmin = Number(detail.READMIN ?? 0) || 0;
    const nextAdminEnabled = readmin > 0;
    setDraft(nextDraft);
    setAdminDecisionEnabled(nextAdminEnabled);
    initialSignatureRef.current = getDraftSignature(nextDraft, nextAdminEnabled);
    setDirty(false);
  };

  const handleSave = async () => {
    if (!detail || !draft) return;

    setSaving(true);
    try {
      const nextDate = toApiDate(draft.date);
      const readminValue = adminDecisionEnabled
        ? Math.max(1, Math.min(4, Number(draft.readmin) || 1))
        : 0;

      await updateRencontreDetail(detail.RECLEUNIK, {
        BUTDOM: Number(toNonNegativeIntegerString(draft.butDom)),
        BUTEXT: Number(toNonNegativeIntegerString(draft.butExt)),
        TABDOM: Number(toNonNegativeIntegerString(draft.tabDom)),
        TABEXT: Number(toNonNegativeIntegerString(draft.tabExt)),
        ETAT: Number(draft.etat) || 1,
        DATE: nextDate ?? undefined,
        HEURE: String(draft.heure ?? '').trim() || null,
        SAISON: String(draft.saison ?? '').trim(),
        TUCLEUNIK: Number(draft.tourId) || detail.TUCLEUNIK,
        IDCIRC: String(draft.circId ?? '').trim() || null,
        READMIN: readminValue,
        COMMENT: String(draft.comment ?? ''),
      });

      await reloadAll();
      setSnackbar({ severity: 'success', message: 'Rencontre enregistree.' });
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  if (!active) {
    return <Box sx={{ display: 'none' }} />;
  }

  if (loading || !detail || !draft) {
    return (
      <Box sx={{ py: 1 }}>
        <Typography variant="body2" color="text.secondary">Chargement de la rencontre...</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      <ClubInlineLine
        clubId={detail.DOMICILE}
        clubName={detail.DOMICILE_NOM_EFFECTIF}
        clubShortName={String(detail.DOMICILE_ABREGE ?? '').trim()}
        clubFond={detail.DOMICILE_FOND}
        clubTexte={detail.DOMICILE_TEXTE}
        butValue={draft.butDom}
        tabValue={draft.tabDom}
        onButChange={(value) => setDraft((prev) => (prev ? { ...prev, butDom: value } : prev))}
        onTabChange={(value) => setDraft((prev) => (prev ? { ...prev, tabDom: value } : prev))}
        onOpenClub={() => {
          navigate(`/admin/clubs/${encodeURIComponent(String(detail.DOMICILE))}`);
        }}
      />

      <ClubInlineLine
        clubId={detail.EXTERIEUR}
        clubName={detail.EXTERIEUR_NOM_EFFECTIF}
        clubShortName={String(detail.EXTERIEUR_ABREGE ?? '').trim()}
        clubFond={detail.EXTERIEUR_FOND}
        clubTexte={detail.EXTERIEUR_TEXTE}
        butValue={draft.butExt}
        tabValue={draft.tabExt}
        onButChange={(value) => setDraft((prev) => (prev ? { ...prev, butExt: value } : prev))}
        onTabChange={(value) => setDraft((prev) => (prev ? { ...prev, tabExt: value } : prev))}
        onOpenClub={() => {
          navigate(`/admin/clubs/${encodeURIComponent(String(detail.EXTERIEUR))}`);
        }}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, rowGap: 2, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
        <FormControl size="small" sx={{ width: 180, flex: '0 0 auto' }}>
          <InputLabel id="rencontre-status-label">Statut</InputLabel>
          <Select
            labelId="rencontre-status-label"
            label="Statut"
            value={draft.etat}
            onChange={(event) => setDraft((prev) => (prev ? { ...prev, etat: Number(event.target.value) } : prev))}
          >
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <DateInputField
          label="Date"
          value={draft.date}
          onChange={(nextValue) => setDraft((prev) => (prev ? { ...prev, date: nextValue } : prev))}
          sx={{ width: 170, flex: '0 0 auto' }}
        />

        <TimeInputField
          label="Heure"
          value={draft.heure}
          onChange={(nextValue) => setDraft((prev) => (prev ? { ...prev, heure: nextValue } : prev))}
          sx={{ width: 130, flex: '0 0 auto' }}
        />

        <FormControl size="small" sx={{ width: 170, flex: '0 0 auto' }}>
          <InputLabel id="rencontre-saison-label">Saison</InputLabel>
          <Select
            labelId="rencontre-saison-label"
            label="Saison"
            value={draft.saison}
            onChange={(event) => {
              void handleSeasonChange(String(event.target.value ?? ''));
            }}
          >
            {seasonOptions.map((season) => (
              <MenuItem key={season} value={season}>{season}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, rowGap: 2, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
        <FormControl size="small" sx={{ width: 300, flex: '0 0 auto' }}>
          <InputLabel id="rencontre-competition-label">Competition</InputLabel>
          <Select
            labelId="rencontre-competition-label"
            label="Competition"
            value={draft.competitionId}
            onChange={(event) => {
              void handleCompetitionChange(String(event.target.value ?? ''));
            }}
          >
            <MenuItem value="">(Aucune)</MenuItem>
            {competitionOptions.map((competition) => (
              <MenuItem key={competition.id} value={competition.id}>{competition.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ width: 260, flex: '0 0 auto' }}>
          <InputLabel id="rencontre-tour-label">Tour</InputLabel>
          <Select
            labelId="rencontre-tour-label"
            label="Tour"
            value={draft.tourId}
            onChange={(event) => {
              void handleTourChange(String(event.target.value ?? ''));
            }}
          >
            <MenuItem value="">(Aucun)</MenuItem>
            {tourOptions.map((tour) => (
              <MenuItem key={tour.TUCLEUNIK} value={String(tour.TUCLEUNIK)}>{String(tour.TOUR ?? '').trim() || `Tour ${tour.TUCLEUNIK}`}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ width: 260, flex: '0 0 auto' }}>
          <InputLabel id="rencontre-circ-label">Circonstance</InputLabel>
          <Select
            labelId="rencontre-circ-label"
            label="Circonstance"
            value={draft.circId}
            onChange={(event) => setDraft((prev) => (prev ? { ...prev, circId: String(event.target.value ?? '') } : prev))}
          >
            <MenuItem value="">(Aucune)</MenuItem>
            {circOptions.map((circ) => (
              <MenuItem key={circ.IDCIRC} value={circ.IDCIRC}>{circ.CIRC}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} sx={{ alignItems: { xs: 'stretch', md: 'center' } }}>
        <FormControlLabel
          control={(
            <Switch
              checked={adminDecisionEnabled}
              onChange={(_event, checked) => setAdminDecisionEnabled(checked)}
            />
          )}
          label="Decision administrative"
        />

        {adminDecisionEnabled ? (
          <FormControl size="small" sx={{ width: { xs: '100%', md: 420 } }}>
            <InputLabel id="rencontre-readmin-label">Decision</InputLabel>
            <Select
              labelId="rencontre-readmin-label"
              label="Decision"
              value={draft.readmin}
              onChange={(event) => setDraft((prev) => (prev ? { ...prev, readmin: Number(event.target.value) } : prev))}
            >
              <MenuItem value={1}>{`Victoire de ${detail.DOMICILE_NOM_EFFECTIF}`}</MenuItem>
              <MenuItem value={2}>{`Victoire de ${detail.EXTERIEUR_NOM_EFFECTIF}`}</MenuItem>
              <MenuItem value={3}>Nul pour les 2 equipes</MenuItem>
              <MenuItem value={4}>Defaites pour les 2 equipes</MenuItem>
            </Select>
          </FormControl>
        ) : null}
      </Stack>

      <TextField
        label="Commentaire"
        value={draft.comment}
        onChange={(event) => setDraft((prev) => (prev ? { ...prev, comment: event.target.value } : prev))}
        fullWidth
        multiline
        minRows={3}
        maxRows={7}
      />

      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={resetDraft}
          disabled={!isDirty || saving || optionsLoading}
        >
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={!isDirty || saving || optionsLoading}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </Stack>

      <AppFeedbackSnackbar value={snackbar} onClose={() => setSnackbar(null)} />
    </Stack>
  );
}
