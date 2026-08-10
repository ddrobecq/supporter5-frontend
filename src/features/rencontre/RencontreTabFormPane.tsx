import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import HealingRoundedIcon from '@mui/icons-material/HealingRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ReportRoundedIcon from '@mui/icons-material/ReportRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import SquareRoundedIcon from '@mui/icons-material/SquareRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  InputAdornment,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { DateInputField, formatDateShort, fromInputDateToDisplay, toInputDateFromDisplay } from '../../components/DateInputField';
import { TimeInputField } from '../../components/TimeInputField';
import { NumberField } from '../../components/NumberField';
import { useTabFormPaneBridge } from '../../lib/useTabFormPaneBridge';
import { toErrorMessage } from '../../components/useEntityPage';
import { useEntityImage } from '../../lib/useEntityImage';
import {
  fetchCircByTourType,
  fetchCompetition,
  fetchCompetitionTourById,
  fetchCompetitionToursPublic,
  fetchCompetitionWizardData,
} from '../competition/competitionApi';
import type { CircOptionRow, CompetitionTourRow } from '../competition/types';
import { fetchRencontreDetailById, fetchRencontreHighlightsById, fetchRencontreTourMatches, updateRencontreDetail, deleteRencontreEvent, upsertRencontreMatchMeta } from './rencontreApi';
import type { RencontreDetailRow, RencontreHighlightEventRow, RencontreHighlightsRow, TourMatchWithNamesRow } from './types';
import { RencontreCompositionTab, type CompositionTabActions } from './RencontreCompositionTab';
import { EventFormDialog, type EventFormDialogActions } from './EventFormDialog';
import { ArbitrePage } from '../arbitre/ArbitrePage';
import { ArbitreIdentityDisplay } from '../../components/ArbitreIdentityDisplay';
import { TerrainPickerDialog } from '../terrain/TerrainPickerDialog';

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
  arbitreId: string;
  arbitreLabel: string;
  terrainId: string;
  terrainLabel: string;
  nbSpect: string;
  houseClosed: boolean;
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

type RencontreTabKey = 'info' | 'highlights' | 'composition' | 'resume' | 'programme';

function formatEventMinute(eventRow: RencontreHighlightEventRow): string {
  const minute = Number(eventRow.MINUTE ?? 0);
  if (!Number.isFinite(minute) || minute <= 0) {
    return '';
  }
  return `${Math.trunc(minute)}'`;
}

function getEventVisual(typeEvent: number): { icon: ReactElement; color: string; backgroundColor: string } {
  if (typeEvent === 1) {
    return {
      icon: <SportsSoccerRoundedIcon fontSize="inherit" />,
      color: '#0f766e',
      backgroundColor: '#ccfbf1',
    };
  }
  if (typeEvent === 2) {
    return {
      icon: <AutorenewRoundedIcon fontSize="inherit" />,
      color: '#1d4ed8',
      backgroundColor: '#dbeafe',
    };
  }
  if (typeEvent === 3) {
    return {
      icon: <SquareRoundedIcon fontSize="inherit" />,
      color: '#eab308',
      backgroundColor: '#fefce8',
    };
  }
  if (typeEvent === 4) {
    return {
      icon: <ReportRoundedIcon fontSize="inherit" />,
      color: '#ea580c',
      backgroundColor: '#ffedd5',
    };
  }
  if (typeEvent === 5) {
    return {
      icon: <SquareRoundedIcon fontSize="inherit" />,
      color: '#dc2626',
      backgroundColor: '#fee2e2',
    };
  }
  if (typeEvent === 6) {
    return {
      icon: <FlagRoundedIcon fontSize="inherit" />,
      color: '#7c3aed',
      backgroundColor: '#ede9fe',
    };
  }
  if (typeEvent === 7) {
    return {
      icon: <TaskAltRoundedIcon fontSize="inherit" />,
      color: '#16a34a',
      backgroundColor: '#dcfce7',
    };
  }
  if (typeEvent === 8) {
    return {
      icon: <CancelRoundedIcon fontSize="inherit" />,
      color: '#b91c1c',
      backgroundColor: '#fee2e2',
    };
  }
  if (typeEvent === 9) {
    return {
      icon: <HealingRoundedIcon fontSize="inherit" />,
      color: '#be185d',
      backgroundColor: '#fce7f3',
    };
  }
  return {
    icon: <FlagRoundedIcon fontSize="inherit" />,
    color: '#4b5563',
    backgroundColor: '#f3f4f6',
  };
}

function buildEventCardSx(align: 'left' | 'right'): SxProps<Theme> {
  return {
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
    px: 0.75,
    py: 0.5,
    maxWidth: '100%',
    minHeight: 32,
    textAlign: align,
  };
}

function toNonNegativeIntegerString(value: unknown): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';
  return String(Math.max(0, Math.trunc(numeric)));
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
  const arbitreNom = String(detail.ARBITRE_NOM ?? '').trim();
  const arbitrePrenom = String(detail.ARBITRE_PRENOM ?? '').trim();
  const arbitreLabel = [arbitreNom, arbitrePrenom].filter(Boolean).join(' ').trim();
  const houseClosed = Number(detail.NBSPECT ?? 0) === -1;
  return {
    butDom: toNonNegativeIntegerString(detail.BUTDOM),
    butExt: toNonNegativeIntegerString(detail.BUTEXT),
    tabDom: toNonNegativeIntegerString(detail.TABDOM),
    tabExt: toNonNegativeIntegerString(detail.TABEXT),
    etat: Number(detail.ETAT ?? 1) || 1,
    date: toDisplayDate(detail.DATE),
    heure: toDisplayHeure(detail.HEURE),
    saison: String(detail.SAISON ?? '').trim(),
    competitionId: Number(detail.COCLEUNIK) > 0 ? String(detail.COCLEUNIK).trim() : '',
    tourId: Number(detail.TUCLEUNIK) > 0 ? String(detail.TUCLEUNIK).trim() : '',
    circId: String(detail.IDCIRC ?? '').trim(),
    comment: String(detail.COMMENT ?? ''),
    readmin: readmin >= 1 && readmin <= 4 ? readmin : 1,
    arbitreId: String(detail.IDARBITRE ?? '').trim(),
    arbitreLabel,
    terrainId: String(detail.TECLEUNIK ?? '').trim(),
    terrainLabel: String(detail.TERRAIN_DISPLAY ?? detail.TERRAIN_NOM ?? '').trim(),
    nbSpect: houseClosed ? '0' : toNonNegativeIntegerString(detail.NBSPECT),
    houseClosed,
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
    arbitreId: String(draft.arbitreId ?? '').trim(),
    terrainId: String(draft.terrainId ?? '').trim(),
    nbSpect: Number(toNonNegativeIntegerString(draft.nbSpect)),
    houseClosed: Boolean(draft.houseClosed),
  });
}

function programmeRowStatusClass(etat: number): string {
  switch (Number(etat)) {
    case 2: return 'status-en-cours';
    case 3: return 'status-terminee';
    case 4: return 'status-non-jouee';
    case 5: return 'status-programmee';
    default: return 'status-en-attente';
  }
}

function ProgrammeClubCell({ clubId, clubName, alignRight = false }: { clubId: string; clubName: string; alignRight?: boolean }) {
  const { src } = useEntityImage('club', clubId);
  const logo = (
    <Box sx={{ width: 22, height: 22, minWidth: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {src
        ? <Box component="img" src={src} alt={clubName} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        : <ShieldOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />}
    </Box>
  );
  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: alignRight ? 'flex-end' : 'flex-start' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        {alignRight
          ? (<><Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', fontSize: '1.15rem' }}>{clubName}</Box>{logo}</>)
          : (<>{logo}<Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '1.15rem' }}>{clubName}</Box></>)}
      </Stack>
    </Box>
  );
}

function ClubInlineLine({
  clubId,
  clubName,
  clubShortName,
  clubFond,
  clubTexte,
  align,
  onOpenClub,
}: {
  clubId: string;
  clubName: string;
  clubShortName: string;
  clubFond: unknown;
  clubTexte: unknown;
  align: 'left' | 'right';
  onOpenClub: () => void;
}) {
  const { src } = useEntityImage('club', clubId);
  const tooltipLabel = `Ouvrir la fiche de ${clubShortName || clubName}`;
  const fondColor = normalizeColorCode(clubFond, '#f2f4f7');
  const textColor = normalizeColorCode(clubTexte, '#111827');

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, width: '100%', justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          minWidth: 0,
          width: '100%',
          flexDirection: align === 'right' ? 'row-reverse' : 'row',
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        }}
      >
        <Tooltip title={tooltipLabel}>
          <IconButton
            size="small"
            onClick={onOpenClub}
            aria-label={tooltipLabel}
            sx={{ p: 0, borderRadius: 1 }}
          >
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
          </IconButton>
        </Tooltip>

        <Typography
          variant="body1"
          sx={{
            fontSize: '1.25rem',
            fontWeight: 600,
            flex: 1,
            width: '100%',
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: textColor,
            bgcolor: fondColor,
            borderRadius: 1,
            px: 1,
            py: 0.25,
            textAlign: align === 'right' ? 'right' : 'left',
          }}
        >
          {clubName}
        </Typography>
      </Stack>
    </Stack>
  );
}

export function RencontreTabFormPane({ tabPath, rencontreId, active }: RencontreTabFormPaneProps) {
  const navigate = useNavigate();
  const handleSaveRef = useRef<(() => Promise<void>) | null>(null);
  const { setDirty, setLabel, notifySaveDone } = useTabFormPaneBridge({
    tabPath,
    onSaveRequest: () => handleSaveRef.current?.(),
  });
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
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RencontreTabKey>('info');
  const [isCompositionDirty, setIsCompositionDirty] = useState(false);
  const [isCompositionSaving, setIsCompositionSaving] = useState(false);
  const compositionActionsRef = useRef<CompositionTabActions | null>(null);
  const [isEventDialogDirty, setIsEventDialogDirty] = useState(false);
  const [isEventDialogSaving, setIsEventDialogSaving] = useState(false);
  const eventDialogActionsRef = useRef<EventFormDialogActions | null>(null);
  const [highlights, setHighlights] = useState<RencontreHighlightsRow | null>(null);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventDialogMode, setEventDialogMode] = useState<'create' | 'edit'>('create');
  const [arbitrePickerOpen, setArbitrePickerOpen] = useState(false);
  const [terrainPickerOpen, setTerrainPickerOpen] = useState(false);
  const [tourMatches, setTourMatches] = useState<TourMatchWithNamesRow[]>([]);
  const [tourMatchesLoading, setTourMatchesLoading] = useState(false);

  const loadCompetitionsForSeason = useCallback(async (season: string): Promise<CompetitionOption[]> => {
    const data = await fetchCompetition('', season);
    return (data.data ?? []).map((row) => ({
      id: String(row.COCLEUNIK ?? '').trim(),
      label: buildCompetitionLabel(row as unknown as Record<string, unknown>) || String(row.COCLEUNIK ?? '').trim(),
    }));
  }, []);

  const loadToursForCompetition = useCallback(async (competitionId: string): Promise<CompetitionTourRow[]> => {
    if (!competitionId) return [];
    return fetchCompetitionToursPublic(competitionId);
  }, []);

  const loadCircsForTour = useCallback(async (tourId: string): Promise<CircOptionRow[]> => {
    if (!tourId) return [];
    const tourDetail = await fetchCompetitionTourById(tourId);
    const tourType = Number(tourDetail.TDTYPETOUR ?? 1) || 1;
    return fetchCircByTourType(tourType);
  }, []);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setInitialLoadError(null);
    try {
      const loadedDetail = await fetchRencontreDetailById(rencontreId);
      const nextDraft = buildDraftFromDetail(loadedDetail);
      const readmin = Number(loadedDetail.READMIN ?? 0) || 0;
      const initialAdminEnabled = readmin > 0;

      // Populate the core form first so the page never stays blocked on secondary option calls.
      setDetail(loadedDetail);
      setDraft(nextDraft);
      setAdminDecisionEnabled(initialAdminEnabled);

      const signature = getDraftSignature(nextDraft, initialAdminEnabled);
      initialSignatureRef.current = signature;
      setDirty(false);
      const domLabel = String(loadedDetail.DOMICILE_ABREGE ?? '').trim() || String(loadedDetail.DOMICILE_NOM_EFFECTIF ?? '').trim();
      const extLabel = String(loadedDetail.EXTERIEUR_ABREGE ?? '').trim() || String(loadedDetail.EXTERIEUR_NOM_EFFECTIF ?? '').trim();
      setLabel(`${domLabel} - ${extLabel}`);

      setOptionsLoading(true);
      try {
        const [wizardData, competitions, tours, circs] = await Promise.all([
          fetchCompetitionWizardData(),
          loadCompetitionsForSeason(nextDraft.saison),
          loadToursForCompetition(nextDraft.competitionId),
          loadCircsForTour(nextDraft.tourId),
        ]);

        setSeasonOptions((wizardData.saisons ?? []).map((item) => String(item.SAISON ?? '').trim()).filter(Boolean));
        setCompetitionOptions(competitions);
        setTourOptions(tours);
        setCircOptions(circs);
      } catch (error) {
        setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      } finally {
        setOptionsLoading(false);
      }
    } catch (error) {
      const message = toErrorMessage(error);
      setInitialLoadError(message);
      setSnackbar({ severity: 'error', message });
    } finally {
      setLoading(false);
    }
  }, [loadCircsForTour, loadCompetitionsForSeason, loadToursForCompetition, rencontreId, setDirty, setLabel]);

  useEffect(() => {
    void reloadAll();
    return () => setDirty(false);
  }, [reloadAll, setDirty]);

  useEffect(() => {
    if (!detail || !active) {
      return;
    }

    const isSupportedClubMatch = Number(detail.IS_SUPPORTED_CLUB_MATCH ?? 0) === 1;
    if (!isSupportedClubMatch) {
      setHighlights(null);
      setActiveTab('info');
      return;
    }

    setHighlightsLoading(true);
    void fetchRencontreHighlightsById(detail.RECLEUNIK)
      .then((data) => setHighlights(data))
      .catch((error) => setSnackbar({ severity: 'error', message: toErrorMessage(error) }))
      .finally(() => setHighlightsLoading(false));

    setTourMatchesLoading(true);
    void fetchRencontreTourMatches(detail.RECLEUNIK)
      .then((data) => setTourMatches(data))
      .catch((error) => setSnackbar({ severity: 'error', message: toErrorMessage(error) }))
      .finally(() => setTourMatchesLoading(false));
  }, [active, detail]);

  useEffect(() => {
    if (Number(detail?.IS_SUPPORTED_CLUB_MATCH ?? 0) !== 1 && activeTab !== 'info') {
      setActiveTab('info');
    }
  }, [activeTab, detail]);

  const isDirty = useMemo(() => {
    if (!draft) return false;
    return getDraftSignature(draft, adminDecisionEnabled) !== initialSignatureRef.current;
  }, [draft, adminDecisionEnabled]);

  useEffect(() => {
    setDirty(isDirty || isCompositionDirty || isEventDialogDirty);
  }, [isDirty, isCompositionDirty, isEventDialogDirty, setDirty]);

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

      if (Number(detail.IS_SUPPORTED_CLUB_MATCH ?? 0) === 1) {
        await upsertRencontreMatchMeta(detail.RECLEUNIK, {
          IDARBITRE: String(draft.arbitreId ?? '').trim() || null,
          TECLEUNIK: String(draft.terrainId ?? '').trim() || null,
          NBSPECT: draft.houseClosed ? -1 : Number(toNonNegativeIntegerString(draft.nbSpect)),
        });
      }

      await reloadAll();
      setSnackbar({ severity: 'success', message: 'Rencontre enregistree.' });
      notifySaveDone();
    } catch (error) {
      // Temporary log: pinpoint which request fails
      const ax = error as { response?: { status?: number; data?: unknown; config?: { url?: string; method?: string } } };
      console.error('[handleSave ERR]', ax.response?.status, ax.response?.config?.method, ax.response?.config?.url, ax.response?.data);
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const anyDirty = isDirty || isCompositionDirty || isEventDialogDirty;
  const anySaving = saving || isCompositionSaving || isEventDialogSaving;

  const handleGlobalSave = async () => {
    const saveCompo = isCompositionDirty && compositionActionsRef.current;
    const saveEvent = isEventDialogDirty && eventDialogActionsRef.current;

    if (saveCompo) {
      setIsCompositionSaving(true);
    }
    if (saveEvent) {
      setIsEventDialogSaving(true);
    }

    try {
      // Run both saves concurrently when both are dirty.
      await Promise.all([
        isDirty ? handleSave() : Promise.resolve(),
        saveCompo ? compositionActionsRef.current!.save() : Promise.resolve(),
        saveEvent ? eventDialogActionsRef.current!.save() : Promise.resolve(),
      ]);
    } catch { /* errors shown inline by each section */ }
    finally {
      if (saveCompo) setIsCompositionSaving(false);
      if (saveEvent) setIsEventDialogSaving(false);
    }
  };

  const handleGlobalCancel = () => {
    if (compositionActionsRef.current) {
      compositionActionsRef.current.reset();
    }
    if (eventDialogActionsRef.current) {
      eventDialogActionsRef.current.reset();
    }
    setEventDialogOpen(false);
    resetDraft();
  };

  handleSaveRef.current = handleGlobalSave;

  if (!active) {
    return <Box sx={{ display: 'none' }} />;
  }

  if (loading) {
    return (
      <Box sx={{ py: 1 }}>
        <Typography variant="body2" color="text.secondary">Chargement de la rencontre...</Typography>
      </Box>
    );
  }

  if (!detail || !draft) {
    return (
      <Stack spacing={1} sx={{ py: 1 }}>
        <Typography variant="body2" color="error.main">
          {initialLoadError ? `Impossible de charger la rencontre: ${initialLoadError}` : 'Impossible de charger la rencontre.'}
        </Typography>
        <Box>
          <Button size="small" variant="outlined" onClick={() => void reloadAll()}>
            Reessayer
          </Button>
        </Box>
      </Stack>
    );
  }

  const isSupportedClubMatch = Number(detail.IS_SUPPORTED_CLUB_MATCH ?? 0) === 1;

  const programmeColumns: GridColDef<TourMatchWithNamesRow>[] = [
    {
      field: 'DATE',
      headerName: 'Date',
      width: 100,
      valueFormatter: (value: unknown) => formatDateShort(value),
    },
    {
      field: 'HEURE',
      headerName: 'Heure',
      width: 68,
      align: 'center',
      headerAlign: 'center',
      valueFormatter: (value: unknown) => {
        const raw = String(value ?? '').trim();
        if (!raw) return '';
        // "HHMM" → "HHhMM"
        if (/^([01]\d|2[0-3])([0-5]\d)$/.test(raw)) return `${raw.slice(0, 2)}h${raw.slice(2, 4)}`;
        // "HH:MM" or "HH:MM:SS"
        const m = raw.match(/^([01]\d|2[0-3]):([0-5]\d)/);
        if (m) return `${m[1]}h${m[2]}`;
        // "HHhMM" already formatted
        if (/^([01]\d|2[0-3])h([0-5]\d)/i.test(raw)) return raw.slice(0, 5);
        return raw;
      },
    },
    {
      field: 'DOMICILE_NOM',
      headerName: 'Domicile',
      headerAlign: 'right',
      minWidth: 120,
      flex: 1,
      sortable: false,
      renderCell: (params) => (
        <ProgrammeClubCell clubId={String(params.row.DOMICILE ?? '')} clubName={String(params.row.DOMICILE_NOM ?? '')} alignRight />
      ),
    },
    {
      field: 'score',
      headerName: 'Score',
      width: 72,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      valueGetter: (_value: unknown, row: TourMatchWithNamesRow) => {
        if (Number(row.ETAT) !== 3 && Number(row.ETAT) !== 2) return '-';
        return `${row.BUTDOM} - ${row.BUTEXT}`;
      },
    },
    {
      field: 'EXTERIEUR_NOM',
      headerName: 'Extérieur',
      minWidth: 120,
      flex: 1,
      sortable: false,
      renderCell: (params) => (
        <ProgrammeClubCell clubId={String(params.row.EXTERIEUR ?? '')} clubName={String(params.row.EXTERIEUR_NOM ?? '')} />
      ),
    },
  ];

  const orderedEvents = [...(highlights?.EVENTS ?? [])].sort((a, b) => {
    const minuteA = Number(a.MINUTE ?? 0);
    const minuteB = Number(b.MINUTE ?? 0);
    if (minuteA !== minuteB) {
      return minuteA - minuteB;
    }
    return Number(a.EVCLEUNIK ?? 0) - Number(b.EVCLEUNIK ?? 0);
  });
  const showTabs = isSupportedClubMatch;
  const showInfoContent = !showTabs || activeTab === 'info';
  const showResumeContent = showTabs && activeTab === 'resume';
  const showCompositionContent = showTabs && activeTab === 'composition';
  const showProgrammeContent = showTabs && activeTab === 'programme';
  const supportedClubName = detail.SUPPORTED_CLUB_SIDE === 'home'
    ? detail.DOMICILE_NOM_EFFECTIF
    : detail.SUPPORTED_CLUB_SIDE === 'away'
      ? detail.EXTERIEUR_NOM_EFFECTIF
      : '';
  const opponentClubName = detail.SUPPORTED_CLUB_SIDE === 'home'
    ? detail.EXTERIEUR_NOM_EFFECTIF
    : detail.SUPPORTED_CLUB_SIDE === 'away'
      ? detail.DOMICILE_NOM_EFFECTIF
      : '';

  return (
    <Box sx={{ bgcolor: '#ffffff', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
    <Stack spacing={1.5}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, alignItems: 'center' }}>
        <ClubInlineLine
          clubId={detail.DOMICILE}
          clubName={detail.DOMICILE_NOM_EFFECTIF}
          clubShortName={String(detail.DOMICILE_ABREGE ?? '').trim()}
          clubFond={detail.DOMICILE_FOND}
          clubTexte={detail.DOMICILE_TEXTE}
          align="right"
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
          align="left"
          onOpenClub={() => {
            navigate(`/admin/clubs/${encodeURIComponent(String(detail.EXTERIEUR))}`);
          }}
        />
      </Box>

      <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        <NumberField
          label="Tab dom"
          value={draft.tabDom}
          onChange={(nextValue) => setDraft((prev) => (prev ? { ...prev, tabDom: nextValue } : prev))}
          maxLength={2}
          align="center"
          sx={{ width: 82 }}
        />
        <NumberField
          label="But dom"
          value={draft.butDom}
          onChange={(nextValue) => setDraft((prev) => (prev ? { ...prev, butDom: nextValue } : prev))}
          maxLength={2}
          align="center"
          sx={{ width: 82 }}
        />
        <NumberField
          label="But ext"
          value={draft.butExt}
          onChange={(nextValue) => setDraft((prev) => (prev ? { ...prev, butExt: nextValue } : prev))}
          maxLength={2}
          align="center"
          sx={{ width: 82 }}
        />
        <NumberField
          label="Tab ext"
          value={draft.tabExt}
          onChange={(nextValue) => setDraft((prev) => (prev ? { ...prev, tabExt: nextValue } : prev))}
          maxLength={2}
          align="center"
          sx={{ width: 82 }}
        />
      </Stack>

      {showTabs ? (
        <Tabs
          value={activeTab}
          onChange={(_event, value: RencontreTabKey) => setActiveTab(value)}
          sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36 } }}
        >
          <Tab value="info" label="Informations" />
          <Tab value="highlights" label="Faits marquants" />
          <Tab value="composition" label="Composition" />
          <Tab value="resume" label="Résumé" />
          <Tab value="programme" label="Programme" />
        </Tabs>
      ) : null}

      {showInfoContent ? (
        <>
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
                <MenuItem value="">Match amical</MenuItem>
                {competitionOptions.map((competition) => (
                  <MenuItem key={competition.id} value={competition.id}>{competition.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ width: 260, flex: '0 0 auto' }} disabled={!draft.competitionId}>
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

            <FormControl size="small" sx={{ width: 260, flex: '0 0 auto' }} disabled={!draft.competitionId}>
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

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, alignItems: 'center' }}>
            <FormControlLabel
              control={(
                <Switch
                  checked={adminDecisionEnabled}
                  onChange={(_event, checked) => setAdminDecisionEnabled(checked)}
                />
              )}
              label="Decision administrative"
              sx={{ flexShrink: 0 }}
            />

            {adminDecisionEnabled ? (
              <FormControl size="small" sx={{ width: 'auto', flex: '1 1 320px', minWidth: 260, maxWidth: '100%' }}>
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
          </Box>

          {isSupportedClubMatch ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, rowGap: 2, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                <Box sx={{ width: '100%', minWidth: 0 }}>
                  <TextField
                    label="Arbitre"
                    value=""
                    placeholder={draft.arbitreId ? '' : 'Aucun arbitre'}
                    size="small"
                    fullWidth
                    slotProps={{
                      input: {
                        readOnly: true,
                        startAdornment: draft.arbitreId ? (
                          <InputAdornment position="start" sx={{ maxWidth: 'calc(100% - 12px)', mr: 0.5 }}>
                            <ArbitreIdentityDisplay arbitreId={draft.arbitreId} compact inField size={24} />
                          </InputAdornment>
                        ) : undefined,
                        endAdornment: (
                          <InputAdornment position="end">
                            <Stack direction="row" spacing={0.25}>
                              <Tooltip title="Choisir l'arbitre">
                                <IconButton size="small" onClick={() => setArbitrePickerOpen(true)} aria-label="Choisir l'arbitre">
                                  <SearchRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Effacer l'arbitre">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => setDraft((prev) => (prev ? { ...prev, arbitreId: '', arbitreLabel: '' } : prev))}
                                    disabled={!draft.arbitreId}
                                    aria-label="Effacer l'arbitre"
                                  >
                                    <ClearRoundedIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Box>

                <Box sx={{ width: '100%', minWidth: 0 }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>Stade</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                    <TextField
                      value={draft.terrainLabel || draft.terrainId}
                      placeholder="Aucun stade"
                      size="small"
                      sx={{ flex: '1 1 360px', minWidth: 260 }}
                      slotProps={{
                        input: {
                          readOnly: true,
                          endAdornment: (
                            <InputAdornment position="end">
                              <Stack direction="row" spacing={0.25}>
                                <Tooltip title="Choisir le stade">
                                  <IconButton size="small" onClick={() => setTerrainPickerOpen(true)} aria-label="Choisir le stade">
                                    <SearchRoundedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Effacer le stade">
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() => setDraft((prev) => (prev ? { ...prev, terrainId: '', terrainLabel: '' } : prev))}
                                      disabled={!draft.terrainId}
                                      aria-label="Effacer le stade"
                                    >
                                      <ClearRoundedIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Stack>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />

                    <FormControlLabel
                      control={(
                        <Switch
                          checked={draft.houseClosed}
                          onChange={(_event, checked) => setDraft((prev) => (prev ? { ...prev, houseClosed: checked } : prev))}
                        />
                      )}
                      label="à huis clos"
                    />

                    {!draft.houseClosed ? (
                      <NumberField
                        label="Nombre de spectateurs"
                        value={draft.nbSpect}
                        onChange={(nextValue) => setDraft((prev) => (prev ? { ...prev, nbSpect: nextValue } : prev))}
                        suffix="spect"
                        maxLength={7}
                        sx={{ width: 170, flex: '0 0 auto' }}
                      />
                    ) : null}
                  </Box>
                </Box>
            </Box>
          ) : (
            <TextField
              label="Commentaire"
              value={draft.comment}
              onChange={(event) => setDraft((prev) => (prev ? { ...prev, comment: event.target.value } : prev))}
              fullWidth
              multiline
              minRows={3}
              maxRows={7}
              slotProps={{ htmlInput: { lang: 'fr', spellCheck: true } }}
            />
          )}
        </>
      ) : null}

      {showTabs ? (
        <Box sx={{ display: showCompositionContent ? 'block' : 'none' }}>
          <RencontreCompositionTab
            rencontreId={rencontreId}
            active={showCompositionContent}
            season={draft?.saison ?? ''}
            supportedClubName={supportedClubName}
            opponentClubName={opponentClubName}
            onDirtyChange={setIsCompositionDirty}
            actionsRef={compositionActionsRef}
          />
        </Box>
      ) : null}

      {showResumeContent ? (
        <Stack spacing={1.5}>
          <TextField
            label="Résumé"
            value={draft.comment}
            onChange={(event) => setDraft((prev) => (prev ? { ...prev, comment: event.target.value } : prev))}
            fullWidth
            multiline
            minRows={6}
            maxRows={20}
            placeholder="Aucun résumé pour cette rencontre."
            slotProps={{ htmlInput: { lang: 'fr', spellCheck: true } }}
          />
        </Stack>
      ) : null}

      {showTabs && activeTab === 'highlights' ? (
        <Stack spacing={1}>
          {detail?.IS_SUPPORTED_CLUB_MATCH === 1 ? (
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={() => { setEventDialogMode('create'); setEventDialogOpen(true); }}>Ajouter</Button>
              <Button size="small" variant="outlined"
                disabled={selectedEventId == null}
                onClick={() => { setEventDialogMode('edit'); setEventDialogOpen(true); }}
              >Modifier</Button>
              <Button size="small" variant="outlined" color="error"
                disabled={selectedEventId == null}
                onClick={() => {
                  if (selectedEventId == null || !detail) return;
                  void deleteRencontreEvent(detail.RECLEUNIK, selectedEventId)
                    .then((data) => { setHighlights(data); setSelectedEventId(null); })
                    .catch((err) => setSnackbar({ severity: 'error', message: toErrorMessage(err) }));
                }}
              >Supprimer</Button>
            </Stack>
          ) : null}
          {highlightsLoading ? (
            <Typography variant="body2" color="text.secondary">Chargement des faits marquants...</Typography>
          ) : null}

          {!highlightsLoading && orderedEvents.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Aucun fait marquant pour cette rencontre.</Typography>
          ) : null}

          {!highlightsLoading && orderedEvents.length > 0 ? (
            <Stack spacing={0.75}>
              {orderedEvents.map((eventRow) => {
                const isHomeEvent = eventRow.SIDE === 'home';
                const eventText = eventRow.TEXT || String(eventRow.COMMENT ?? '');
                const visual = getEventVisual(Number(eventRow.TYPE_EVENT ?? 0));
                const minuteText = formatEventMinute(eventRow) || '-';
                const isSelected = selectedEventId === eventRow.EVCLEUNIK;

                const card = (
                  <Box
                    sx={{
                      ...buildEventCardSx(isHomeEvent ? 'right' : 'left'),
                      cursor: 'pointer',
                      outline: isSelected ? '2px solid' : 'none',
                      outlineColor: 'primary.main',
                    }}
                    onClick={() => setSelectedEventId(isSelected ? null : eventRow.EVCLEUNIK)}
                    onDoubleClick={() => { setSelectedEventId(eventRow.EVCLEUNIK); setEventDialogMode('edit'); setEventDialogOpen(true); }}
                  >
                    <Stack
                      direction="row"
                      spacing={0.75}
                      sx={{
                        alignItems: 'center',
                        justifyContent: isHomeEvent ? 'flex-end' : 'flex-start',
                      }}
                    >
                      {isHomeEvent ? (
                        <>
                          <Typography variant="body2" sx={{ lineHeight: 1.2, overflowWrap: 'anywhere' }}>{eventText}</Typography>
                          <Box
                            sx={{
                              width: 18,
                              height: 18,
                              minWidth: 18,
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14,
                              color: visual.color,
                              bgcolor: visual.backgroundColor,
                            }}
                          >
                            {visual.icon}
                          </Box>
                        </>
                      ) : (
                        <>
                          <Box
                            sx={{
                              width: 18,
                              height: 18,
                              minWidth: 18,
                              borderRadius: '50%',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14,
                              color: visual.color,
                              bgcolor: visual.backgroundColor,
                            }}
                          >
                            {visual.icon}
                          </Box>
                          <Typography variant="body2" sx={{ lineHeight: 1.2, overflowWrap: 'anywhere' }}>{eventText}</Typography>
                        </>
                      )}
                    </Stack>
                  </Box>
                );

                return (
                  <Box
                    key={eventRow.EVCLEUNIK}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'minmax(0,1fr) 56px minmax(0,1fr)', md: 'minmax(0,1fr) 68px minmax(0,1fr)' },
                      columnGap: 0.75,
                      alignItems: 'center',
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      {isHomeEvent ? card : null}
                    </Box>

                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                        {minuteText}
                      </Typography>
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      {!isHomeEvent ? card : null}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          ) : null}
        </Stack>
      ) : null}

      {showProgrammeContent ? (
        <Box sx={{ bgcolor: '#ffffff', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
          <Stack spacing={0.75}>
            {tourMatchesLoading ? (
              <Typography variant="body2" color="text.secondary">Chargement du programme...</Typography>
            ) : null}
            {!tourMatchesLoading && tourMatches.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Aucune autre rencontre pour ce tour et cette circonstance.</Typography>
            ) : null}
            {!tourMatchesLoading && tourMatches.length > 0 ? (
              <Box sx={{ height: 260 }}>
                <DataGrid
                  rows={tourMatches}
                  columns={programmeColumns}
                  loading={tourMatchesLoading}
                  getRowId={(row) => row.RECLEUNIK}
                  getRowClassName={(params) => programmeRowStatusClass(Number(params.row.ETAT))}
                  disableRowSelectionOnClick
                  onRowDoubleClick={(params) => {
                    navigate(`/admin/rencontres/${encodeURIComponent(String(params.id))}`);
                  }}
                  disableColumnMenu
                  density="compact"
                  pageSizeOptions={[10, 25, 50]}
                  sx={{
                    width: '100%',
                    '& .MuiDataGrid-cell': { cursor: 'default' },
                    '& .MuiDataGrid-row.status-terminee .MuiDataGrid-cell': { color: 'common.black' },
                    '& .MuiDataGrid-row.status-en-cours .MuiDataGrid-cell': { color: 'success.main' },
                    '& .MuiDataGrid-row.status-en-attente .MuiDataGrid-cell': { color: 'text.secondary' },
                    '& .MuiDataGrid-row.status-programmee .MuiDataGrid-cell': { color: 'text.secondary' },
                    '& .MuiDataGrid-row.status-non-jouee .MuiDataGrid-cell': { color: 'text.disabled' },
                  }}
                />
              </Box>
            ) : null}
          </Stack>
        </Box>
      ) : null}

      {anyDirty ? (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={handleGlobalCancel}
            disabled={anySaving || optionsLoading}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleGlobalSave()}
            disabled={anySaving || optionsLoading}
          >
            {anySaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </Stack>
      ) : null}

      {detail?.IS_SUPPORTED_CLUB_MATCH === 1 ? (
        <EventFormDialog
          open={eventDialogOpen}
          onClose={() => setEventDialogOpen(false)}
          onSaved={(data) => { setHighlights(data); setSelectedEventId(null); setEventDialogOpen(false); }}
          rencontreId={rencontreId}
          event={eventDialogMode === 'edit' ? (orderedEvents.find((e) => e.EVCLEUNIK === selectedEventId) ?? null) : null}
          onDirtyChange={setIsEventDialogDirty}
          actionsRef={eventDialogActionsRef}
        />
      ) : null}

      <Dialog
        open={arbitrePickerOpen}
        onClose={() => setArbitrePickerOpen(false)}
        fullWidth
        maxWidth="xl"
        slotProps={{ paper: { sx: { height: '80vh' } } }}
      >
        <DialogTitle>Sélectionner l'arbitre</DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          <ArbitrePage
            variant="modalPicker"
            onOpenInTab={({ rowId, label }) => {
              setDraft((prev) => (prev ? {
                ...prev,
                arbitreId: String(rowId),
                arbitreLabel: String(label ?? '').trim(),
              } : prev));
              setArbitrePickerOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <TerrainPickerDialog
        open={terrainPickerOpen}
        onClose={() => setTerrainPickerOpen(false)}
        onSelect={({ rowId, label }) => {
          setDraft((prev) => (prev ? {
            ...prev,
            terrainId: String(rowId),
            terrainLabel: String(label ?? '').trim(),
          } : prev));
        }}
      />

      <AppFeedbackSnackbar value={snackbar} onClose={() => setSnackbar(null)} />
    </Stack>
    </Box>
  );
}
