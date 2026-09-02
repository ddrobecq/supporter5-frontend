import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import FormatColorFillRoundedIcon from '@mui/icons-material/FormatColorFillRounded';
import FormatColorTextRoundedIcon from '@mui/icons-material/FormatColorTextRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMediaQuery, useTheme } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { CompletenessChip } from '../../components/CompletenessChip';
import { DateInputField, formatDateShort, toInputDateFromDisplay } from '../../components/DateInputField';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { NatioAutocomplete } from '../../components/NatioAutocomplete';
import { EntityImageFrame } from '../../components/EntityImageFrame';
import { updateEntityImage } from '../../lib/entityImageApi';
import { useTabFormPaneBridge } from '../../lib/useTabFormPaneBridge';
import { toErrorMessage } from '../../components/useEntityPage';
import { useEntityImage } from '../../lib/useEntityImage';
import { pickScreenColor } from '../../lib/screenColorPicker';
import { fetchNatio } from '../natio/natioApi';
import type { NatioRow } from '../natio/types';
import { VillePicker } from '../../components/VillePicker';
import { ClubJerseyVisual, normalizeColorCode } from './ClubJerseyVisual';
import { ClubMatchesTab } from './ClubMatchesTab';
import {
  createClubTerrainHistory,
  fetchClubMatches,
  fetchClubPalmares,
  createClubNameHistory,
  deleteClubTerrainHistory,
  deleteClubNameHistory,
  fetchClubNameHistory,
  fetchClubProfileById,
  fetchClubTerrainHistory,
  updateClubTerrainHistory,
  updateClubNameHistory,
  updateClubProfile,
} from './clubApi';
import type { ClubMatchRow, ClubNameHistoryRow, ClubPalmareRow, ClubProfileRow, ClubTerrainHistoryRow } from './types';
import { TerrainPickerDialog } from '../terrain/TerrainPickerDialog';
import { supportedClubStore } from '../system/supportedClubStore';
import { getClubCompleteness } from './clubCompleteness';

interface ClubTabFormPaneProps {
  tabPath: string;
  clubId: string;
  active: boolean;
}

type ClubTabKey = 'info' | 'matches' | 'palmares';

interface ClubProfileDraft {
  name: string;
  natioId: string;
  villeId: string;
  villeName: string;
  villeNatioId: string;
  fond: string;
  texte: string;
}

interface ClubNameDialogDraft {
  date: string;
  eventType: '1' | '2' | '3';
  name: string;
}

interface ClubTerrainDialogDraft {
  date: string;
  terrainId: string;
  terrainName: string;
}

function cssColorToDbColor(cssColor: string): number {
  const normalized = normalizeColorCode(cssColor, '#000000');
  const match = normalized.match(/^#([0-9a-fA-F]{6})$/);
  if (!match) {
    return 0;
  }

  const hex = match[1];
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return red + (green << 8) + (blue << 16);
}

function createClubProfileDraft(row?: ClubProfileRow): ClubProfileDraft {
  const fond = normalizeColorCode(row?.FOND, '#2e7d32');
  const texte = normalizeColorCode(row?.TEXTE, '#1f1f1f');
  return {
    name: String(row?.CLUB_ABREGE ?? '').trim(),
    natioId: String(row?.IDNATIO ?? '').trim(),
    villeId: String(row?.IDVILLE ?? '').trim(),
    villeName: String(row?.VILLE_NOM ?? '').trim(),
    villeNatioId: String(row?.VILLE_IDNATIO ?? '').trim(),
    fond,
    texte,
  };
}

function getClubProfileSignature(draft: ClubProfileDraft): string {
  return JSON.stringify({
    name: draft.name.trim(),
    natioId: draft.natioId.trim(),
    villeId: draft.villeId.trim(),
    fond: draft.fond.trim(),
    texte: draft.texte.trim(),
  });
}

function getClubNameDialogSignature(draft: ClubNameDialogDraft): string {
  return JSON.stringify({
    date: String(draft.date ?? '').trim(),
    eventType: String(draft.eventType ?? '').trim(),
    name: String(draft.name ?? '').trim(),
  });
}

function getClubTerrainDialogSignature(draft: ClubTerrainDialogDraft): string {
  return JSON.stringify({
    date: String(draft.date ?? '').trim(),
    terrainId: String(draft.terrainId ?? '').trim(),
    terrainName: String(draft.terrainName ?? '').trim(),
  });
}

function rgbToHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0'))
    .join('')}`;
}

async function extractDominantColorsFromImage(src: string): Promise<{ fond: string; texte: string } | null> {
  const image = new Image();
  image.decoding = 'async';

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Impossible de charger l ecusson.'));
    image.src = src;
  });

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  context.clearRect(0, 0, size, size);
  context.drawImage(image, 0, 0, size, size);
  const { data } = context.getImageData(0, 0, size, size);
  const buckets = new Map<string, { count: number; red: number; green: number; blue: number }>();

  for (let index = 0; index < data.length; index += 16) {
    const alpha = data[index + 3] ?? 0;
    if (alpha < 140) continue;

    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
    if (luminance > 245) continue;

    const key = `${red >> 4}:${green >> 4}:${blue >> 4}`;
    const current = buckets.get(key);
    if (current) {
      current.count += 1;
      current.red += red;
      current.green += green;
      current.blue += blue;
    } else {
      buckets.set(key, { count: 1, red, green, blue });
    }
  }

  const colors = Array.from(buckets.values())
    .filter((entry) => entry.count > 1)
    .map((entry) => ({
      count: entry.count,
      hex: rgbToHex(entry.red / entry.count, entry.green / entry.count, entry.blue / entry.count),
    }))
    .sort((a, b) => b.count - a.count);

  if (colors.length === 0) {
    return null;
  }

  const fond = colors[0]?.hex ?? '#000000';
  const texte = colors.find((color) => color.hex !== fond)?.hex ?? fond;
  return { fond, texte };
}

function formatClubDate(value: unknown): string {
  return formatDateShort(value);
}

function formatDateForInput(value: unknown): string {
  const text = String(value ?? '').trim();
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    return `${compact[1]}/${compact[2]}/${compact[3]}`;
  }
  const dashed = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dashed) {
    return `${dashed[1]}/${dashed[2]}/${dashed[3]}`;
  }
  return '';
}

function formatDateForApi(value: string): string | null {
  const text = String(value ?? '').trim();
  if (!text) {
    return null;
  }

  const genericDate = toInputDateFromDisplay(text);
  if (genericDate) {
    return genericDate;
  }

  const french = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (french) {
    return `${french[3]}-${french[2]}-${french[1]}`;
  }

  const dashed = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dashed) {
    return `${dashed[1]}-${dashed[2]}-${dashed[3]}`;
  }
  return text || null;
}

function PalmareListItem({ row }: { row: ClubPalmareRow }) {
  const image = useEntityImage('epreuve', row.IDEPREUVE);
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', py: 1.5, px: 0.5 }}>
      <Avatar
        src={image.src ?? undefined}
        sx={{ width: 44, height: 44, bgcolor: 'action.hover', flexShrink: 0 }}
      >
        {!image.src && <EmojiEventsRoundedIcon sx={{ fontSize: 26, color: 'text.disabled' }} />}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.EPREUVE}</Typography>
        <Typography variant="caption" color="text.secondary">{row.ANNEES.join(' · ')}</Typography>
      </Box>
      <Chip
        label={`×${row.NB_TITRES}`}
        size="small"
        color="primary"
        sx={{ fontWeight: 700, flexShrink: 0 }}
      />
    </Stack>
  );
}

export function ClubTabFormPane({ tabPath, clubId, active }: ClubTabFormPaneProps) {
  const handleProfileSaveRef = useRef<(() => Promise<void>) | null>(null);
  const { setDirty, setLabel, notifySaveDone } = useTabFormPaneBridge({
    tabPath,
    onSaveRequest: () => handleProfileSaveRef.current?.(),
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ClubProfileRow | undefined>(undefined);
  const [profileDraft, setProfileDraft] = useState<ClubProfileDraft>(createClubProfileDraft());
  const [savingProfile, setSavingProfile] = useState(false);
  const [natioRows, setNatioRows] = useState<NatioRow[]>([]);
  const [nameHistoryRows, setNameHistoryRows] = useState<ClubNameHistoryRow[]>([]);
  const [terrainHistoryRows, setTerrainHistoryRows] = useState<ClubTerrainHistoryRow[]>([]);
  const [matchRows, setMatchRows] = useState<ClubMatchRow[]>([]);
  const [palmareRows, setPalmareRows] = useState<ClubPalmareRow[]>([]);
  const [palmareLoading, setPalmareLoading] = useState(false);
  const [matchFilterClubId, setMatchFilterClubId] = useState(() => supportedClubStore.getState().clubId);
  const [matchFilterClubName, setMatchFilterClubName] = useState(() => supportedClubStore.getState().clubName);
  const supportedClubLoaded = supportedClubStore((s) => s.loaded);
  const supportedClubStoreId = supportedClubStore((s) => s.clubId);
  const supportedClubStoreName = supportedClubStore((s) => s.clubName);
  const [nameHistoryLoading, setNameHistoryLoading] = useState(false);
  const [terrainHistoryLoading, setTerrainHistoryLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [nameHistorySelection, setNameHistorySelection] = useState<GridRowId[]>([]);
  const [terrainHistorySelection, setTerrainHistorySelection] = useState<GridRowId[]>([]);
  const [activeTab, setActiveTab] = useState<ClubTabKey>('info');
  const [hasOpenedMatchesTab, setHasOpenedMatchesTab] = useState(false);

  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [nameDialogMode, setNameDialogMode] = useState<'create' | 'edit'>('create');
  const [nameDialogId, setNameDialogId] = useState<number | null>(null);
  const [nameDialogSaving, setNameDialogSaving] = useState(false);
  const [nameDialogDraft, setNameDialogDraft] = useState<ClubNameDialogDraft>({ date: '', eventType: '1', name: '' });
  const [nameDeleteConfirmOpen, setNameDeleteConfirmOpen] = useState(false);
  const [nameDeleteSaving, setNameDeleteSaving] = useState(false);
  const [terrainDialogOpen, setTerrainDialogOpen] = useState(false);
  const [terrainDialogMode, setTerrainDialogMode] = useState<'create' | 'edit'>('create');
  const [terrainDialogId, setTerrainDialogId] = useState<number | null>(null);
  const [terrainDialogSaving, setTerrainDialogSaving] = useState(false);
  const [terrainDialogDraft, setTerrainDialogDraft] = useState<ClubTerrainDialogDraft>({ date: '', terrainId: '', terrainName: '' });
  const [terrainDeleteConfirmOpen, setTerrainDeleteConfirmOpen] = useState(false);
  const [terrainDeleteSaving, setTerrainDeleteSaving] = useState(false);
  const [terrainSelectorOpen, setTerrainSelectorOpen] = useState(false);
  const [clubImageDraft, setClubImageDraft] = useState<string | null | undefined>(undefined);
  const [clubImageRefreshToken, setClubImageRefreshToken] = useState(0);
  const profileSignatureRef = useRef('');
  const nameDialogSignatureRef = useRef('');
  const terrainDialogSignatureRef = useRef('');
  const clubImage = useEntityImage('club', clubId, clubImageRefreshToken);
  const currentFondColor = profileDraft.fond;
  const currentTexteColor = profileDraft.texte;

  const isProfileDirty =
    getClubProfileSignature(profileDraft) !== profileSignatureRef.current || clubImageDraft !== undefined;
  const isNameDialogDirty = nameDialogOpen
    && getClubNameDialogSignature(nameDialogDraft) !== nameDialogSignatureRef.current;
  const isTerrainDialogDirty = terrainDialogOpen
    && getClubTerrainDialogSignature(terrainDialogDraft) !== terrainDialogSignatureRef.current;
  const isAnyDirty = isProfileDirty || isNameDialogDirty || isTerrainDialogDirty;

  const hasLogo = clubImageDraft === undefined ? Boolean(clubImage.src) : clubImageDraft !== null;
  const missingItems = useMemo(() => getClubCompleteness({
    natioId: profileDraft.natioId,
    villeId: profileDraft.villeId,
    hasStade: terrainHistoryRows.length > 0,
    hasCreationDate: nameHistoryRows.some((row) => Number(row.CN_ACTION) === 1 && Boolean(String(row.DATE ?? '').trim())),
    hasLogo,
  }), [profileDraft.natioId, profileDraft.villeId, terrainHistoryRows, nameHistoryRows, hasLogo]);

  const handlePickScreenColor = async (target: 'fond' | 'texte') => {
    try {
      const color = await pickScreenColor();
      if (target === 'fond') {
        handleFondChange(color);
      } else {
        handleTexteChange(color);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setSnackbar({ severity: 'error', message: 'Impossible de sélectionner cette couleur.' });
    }
  };

  const handleFondChange = (nextFond: string) => {
    setProfileDraft((prev) => ({ ...prev, fond: nextFond }));
  };

  const handleTexteChange = (nextTexte: string) => {
    setProfileDraft((prev) => ({ ...prev, texte: nextTexte }));
  };

  const handleAutoDetectColors = async () => {
    if (!clubImage.src) {
      return;
    }

    try {
      const detected = await extractDominantColorsFromImage(clubImage.src);
      if (!detected) {
        return;
      }
      setProfileDraft((prev) => ({ ...prev, fond: detected.fond, texte: detected.texte }));
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  const handleProfileSave = async () => {
    if (!row || savingProfile) {
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await updateClubProfile(clubId, {
        name: profileDraft.name,
        natioId: profileDraft.natioId,
        villeId: profileDraft.villeId || null,
        fond: cssColorToDbColor(profileDraft.fond),
        texte: cssColorToDbColor(profileDraft.texte),
      });

      if (clubImageDraft !== undefined) {
        await updateEntityImage('club', clubId, clubImageDraft);
        setClubImageRefreshToken((prev) => prev + 1);
      }

      setRow(updated);
      setProfileDraft(createClubProfileDraft(updated));
      setClubImageDraft(undefined);
      profileSignatureRef.current = getClubProfileSignature(createClubProfileDraft(updated));
      setLabel(String(updated.CLUB_ABREGE ?? '').trim() || String(clubId));
      setDirty(false);
      setSnackbar({ severity: 'success', message: 'Club mis a jour.' });
      notifySaveDone();
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleProfileReset = () => {
    setProfileDraft(createClubProfileDraft(row));
    setDirty(false);
  };

  const nameHistoryColumns: GridColDef<ClubNameHistoryRow>[] = [
    {
      field: 'DATE',
      headerName: 'Date',
      width: 120,
      minWidth: 120,
      maxWidth: 120,
      valueGetter: (_value, historyRow) => formatClubDate(historyRow.DATE),
    },
    {
      field: 'CN_ACTION_LABEL',
      headerName: 'Type',
      width: 110,
      minWidth: 110,
      maxWidth: 110,
      valueGetter: (_value, row) => {
        const action = Number(row.CN_ACTION ?? 0);
        if (action === 3) return 'Dissolution';
        if (action === 2) return 'Modification';
        return 'Création';
      },
    },
    {
      field: 'CN_NOM',
      headerName: 'Nom complet',
      minWidth: 280,
      flex: 1,
      valueGetter: (_value, row) => (Number(row.CN_ACTION ?? 0) === 3 ? '' : row.CN_NOM),
    },
  ];

  const terrainHistoryColumns: GridColDef<ClubTerrainHistoryRow>[] = [
    {
      field: 'DATE',
      headerName: 'Date',
      width: 120,
      minWidth: 120,
      maxWidth: 120,
      valueGetter: (_value, historyRow) => formatClubDate(historyRow.DATE),
    },
    {
      field: 'STADE',
      headerName: 'Stade',
      minWidth: 280,
      flex: 1,
    },
  ];

  const reloadRow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClubProfileById(clubId);
      setRow(data);
      setClubImageDraft(undefined);
      const nextDraft = createClubProfileDraft(data);
      setProfileDraft(nextDraft);
      profileSignatureRef.current = getClubProfileSignature(nextDraft);
      const nextLabel = String(data.CLUB_ABREGE ?? '').trim() || String(clubId);
      setLabel(nextLabel);
      setDirty(false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [clubId, setDirty, setLabel]);

  const reloadHistories = useCallback(async () => {
    setNameHistoryLoading(true);
    setTerrainHistoryLoading(true);
    try {
      const [names, terrains] = await Promise.all([
        fetchClubNameHistory(clubId),
        fetchClubTerrainHistory(clubId),
      ]);
      setNameHistoryRows(names);
      setTerrainHistoryRows(terrains);
      setNameHistorySelection([]);
      setTerrainHistorySelection([]);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setNameHistoryLoading(false);
      setTerrainHistoryLoading(false);
    }
  }, [clubId]);

  const reloadMatches = useCallback(async () => {
    setMatchesLoading(true);
    try {
      const matches = await fetchClubMatches(clubId);
      setMatchRows(matches);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setMatchesLoading(false);
    }
  }, [clubId]);

  const reloadPalmares = useCallback(async () => {
    setPalmareLoading(true);
    try {
      const rows = await fetchClubPalmares(clubId);
      setPalmareRows(rows);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setPalmareLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    if (!supportedClubLoaded) return;
    setMatchFilterClubId((prev) => (prev === supportedClubStore.getState().clubId || prev === '0001' ? supportedClubStoreId : prev));
    setMatchFilterClubName((prev) => (prev === 'Club supporte' ? supportedClubStoreName : prev));
  }, [supportedClubLoaded, supportedClubStoreId, supportedClubStoreName]);

  // ClubSelectField.onChange gives CLUB_NOM_COMPLET; fetch CLUB_ABREGE for this filter only
  const handleMatchFilterChange = ({ clubId: newId, clubName: newName }: { clubId: string; clubName: string }) => {
    setMatchFilterClubId(newId);
    setMatchFilterClubName(newName);
    if (newId) {
      void fetchClubProfileById(newId)
        .then((profile) => setMatchFilterClubName(profile.CLUB_ABREGE || newName))
        .catch(() => {});
    }
  };

  useEffect(() => {
    if (activeTab !== 'palmares') return;
    void reloadPalmares();
  }, [activeTab, reloadPalmares]);

  // Une fois monte, l'onglet Matches reste dans le DOM (juste masque) pour eviter
  // de reconstruire la grille (~4000 lignes) a chaque changement d'onglet.
  useEffect(() => {
    if (activeTab === 'matches') setHasOpenedMatchesTab(true);
  }, [activeTab]);

  useEffect(() => {
    const controller = new AbortController();

    void fetchNatio('', controller.signal)
      .then((result) => setNatioRows(result.data ?? []))
      .catch(() => {});

    void reloadRow();
    void reloadHistories();
    void reloadMatches();

    return () => {
      controller.abort();
      setDirty(false);
    };
  }, [reloadHistories, reloadMatches, reloadRow, setDirty]);

  useEffect(() => {
    setClubImageDraft(undefined);
  }, [clubId]);

  useEffect(() => {
    if (loading) return;
    setDirty(isAnyDirty);
  }, [isAnyDirty, loading, setDirty]);

  const selectedNameHistoryId = Number(nameHistorySelection[0] ?? 0);
  const selectedNameHistoryRow = nameHistoryRows.find((historyRow) => Number(historyRow.IDCLUB_NOM) === selectedNameHistoryId);
  const selectedTerrainHistoryId = Number(terrainHistorySelection[0] ?? 0);
  const selectedTerrainHistoryRow = terrainHistoryRows.find((historyRow) => Number(historyRow.CT_CLEUNIK) === selectedTerrainHistoryId);

  const openNameCreateDialog = () => {
    const nextDraft = {
      date: '',
      eventType: '1' as const,
      name: String(profileDraft.name ?? '').trim(),
    };
    setNameDialogMode('create');
    setNameDialogId(null);
    setNameDialogDraft(nextDraft);
    nameDialogSignatureRef.current = getClubNameDialogSignature(nextDraft);
    setNameDialogOpen(true);
  };

  const openNameEditDialog = (historyRow?: ClubNameHistoryRow) => {
    const rowToEdit = historyRow ?? selectedNameHistoryRow;
    if (!rowToEdit) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un nom de club a modifier.' });
      return;
    }
    const eventType = Number(rowToEdit.CN_ACTION ?? 0);
    const nextDraft = {
      date: formatDateForInput(rowToEdit.DATE),
      eventType: eventType >= 1 && eventType <= 3 ? String(eventType) as '1' | '2' | '3' : '2',
      name: String(rowToEdit.CN_NOM ?? ''),
    };
    setNameDialogMode('edit');
    setNameDialogId(Number(rowToEdit.IDCLUB_NOM));
    setNameDialogDraft(nextDraft);
    nameDialogSignatureRef.current = getClubNameDialogSignature(nextDraft);
    setNameDialogOpen(true);
  };

  const openNameDeleteConfirm = () => {
    if (!selectedNameHistoryRow) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un nom de club a supprimer.' });
      return;
    }
    setNameDeleteConfirmOpen(true);
  };

  const handleNameDialogSave = async (): Promise<boolean> => {
    const date = formatDateForApi(nameDialogDraft.date);
    const name = String(nameDialogDraft.name ?? '').trim();
    const eventType = nameDialogDraft.eventType;

    if (!name) {
      setSnackbar({ severity: 'error', message: 'Le nom est requis.' });
      return false;
    }

    setNameDialogSaving(true);
    try {
      if (nameDialogMode === 'create') {
        await createClubNameHistory(clubId, { date, eventType, name });
      } else {
        if (!nameDialogId) {
          setSnackbar({ severity: 'error', message: 'Nom de club invalide.' });
          return false;
        }
        await updateClubNameHistory(clubId, nameDialogId, { date, eventType, name });
      }

      await reloadHistories();
      setNameDialogOpen(false);
      setSnackbar({ severity: 'success', message: 'Historique des noms mis a jour.' });
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setNameDialogSaving(false);
    }
  };

  const handleNameDeleteConfirm = async () => {
    if (!selectedNameHistoryRow) {
      setNameDeleteConfirmOpen(false);
      return;
    }

    setNameDeleteSaving(true);
    try {
      await deleteClubNameHistory(clubId, selectedNameHistoryRow.IDCLUB_NOM);
      await reloadHistories();
      setNameDeleteConfirmOpen(false);
      setSnackbar({ severity: 'success', message: 'Nom de club supprime.' });
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setNameDeleteSaving(false);
    }
  };

  const openTerrainCreateDialog = () => {
    const nextDraft = { date: '', terrainId: '', terrainName: '' };
    setTerrainDialogMode('create');
    setTerrainDialogId(null);
    setTerrainDialogDraft(nextDraft);
    terrainDialogSignatureRef.current = getClubTerrainDialogSignature(nextDraft);
    setTerrainDialogOpen(true);
  };

  const openTerrainEditDialog = (historyRow?: ClubTerrainHistoryRow) => {
    const rowToEdit = historyRow ?? selectedTerrainHistoryRow;
    if (!rowToEdit) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un stade a modifier.' });
      return;
    }

    const nextDraft = {
      date: formatDateForInput(rowToEdit.DATE),
      terrainId: String(rowToEdit.TECLEUNIK ?? ''),
      terrainName: String(rowToEdit.STADE ?? ''),
    };
    setTerrainDialogMode('edit');
    setTerrainDialogId(Number(rowToEdit.CT_CLEUNIK));
    setTerrainDialogDraft(nextDraft);
    terrainDialogSignatureRef.current = getClubTerrainDialogSignature(nextDraft);
    setTerrainDialogOpen(true);
  };

  const openTerrainDeleteConfirm = () => {
    if (!selectedTerrainHistoryRow) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un stade a supprimer.' });
      return;
    }
    setTerrainDeleteConfirmOpen(true);
  };

  const handleTerrainDialogSave = async (): Promise<boolean> => {
    const date = formatDateForApi(terrainDialogDraft.date);
    const terrainId = String(terrainDialogDraft.terrainId ?? '').trim();

    if (!terrainId) {
      setSnackbar({ severity: 'error', message: 'Le stade est requis.' });
      return false;
    }

    setTerrainDialogSaving(true);
    try {
      if (terrainDialogMode === 'create') {
        await createClubTerrainHistory(clubId, { date, terrainId });
      } else {
        if (!terrainDialogId) {
          setSnackbar({ severity: 'error', message: 'Stade club invalide.' });
          return false;
        }
        await updateClubTerrainHistory(clubId, terrainDialogId, { date, terrainId });
      }

      await reloadHistories();
      setTerrainDialogOpen(false);
      setSnackbar({ severity: 'success', message: 'Historique des stades mis a jour.' });
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setTerrainDialogSaving(false);
    }
  };

  const handleTerrainDeleteConfirm = async () => {
    if (!selectedTerrainHistoryRow) {
      setTerrainDeleteConfirmOpen(false);
      return;
    }

    setTerrainDeleteSaving(true);
    try {
      await deleteClubTerrainHistory(clubId, selectedTerrainHistoryRow.CT_CLEUNIK);
      await reloadHistories();
      setTerrainDeleteConfirmOpen(false);
      setSnackbar({ severity: 'success', message: 'Stade supprime.' });
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setTerrainDeleteSaving(false);
    }
  };

  const handleTerrainSelected = (terrain: { rowId: GridRowId; label: string }) => {
    setTerrainDialogDraft((prev) => ({
      ...prev,
      terrainId: String(terrain.rowId),
      terrainName: String(terrain.label ?? '').trim(),
    }));
    setTerrainSelectorOpen(false);
  };

  const handleGlobalSave = async (): Promise<void> => {
    if (nameDialogOpen) {
      const saved = await handleNameDialogSave();
      if (!saved) {
        return;
      }
    }

    if (terrainDialogOpen) {
      const saved = await handleTerrainDialogSave();
      if (!saved) {
        return;
      }
    }

    if (isProfileDirty) {
      await handleProfileSave();
    }
  };

  handleProfileSaveRef.current = handleGlobalSave;

  const handleGlobalReset = () => {
    setNameDialogOpen(false);
    setTerrainDialogOpen(false);
    setNameDeleteConfirmOpen(false);
    setTerrainDeleteConfirmOpen(false);
    setTerrainSelectorOpen(false);
    handleProfileReset();
  };

  const nameHistoryActions = (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title="Ajouter">
        {isMobile ? (
          <IconButton size="small" color="primary" aria-label="Ajouter" onClick={openNameCreateDialog}>
            <AddCircleOutlineRoundedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" variant="outlined" startIcon={<AddCircleOutlineRoundedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={openNameCreateDialog}>
            Ajouter
          </Button>
        )}
      </Tooltip>
      <Tooltip title="Modifier">
        {isMobile ? (
          <IconButton size="small" color="primary" aria-label="Modifier" onClick={() => openNameEditDialog()} disabled={!selectedNameHistoryRow}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={() => openNameEditDialog()} disabled={!selectedNameHistoryRow}>
            Modifier
          </Button>
        )}
      </Tooltip>
      <Tooltip title="Supprimer">
        {isMobile ? (
          <IconButton size="small" color="error" aria-label="Supprimer" onClick={openNameDeleteConfirm} disabled={!selectedNameHistoryRow}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" color="error" variant="outlined" startIcon={<DeleteOutlineRoundedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={openNameDeleteConfirm} disabled={!selectedNameHistoryRow}>
            Supprimer
          </Button>
        )}
      </Tooltip>
    </Stack>
  );

  const handleNameHistoryRowDoubleClick = (rowId: GridRowId) => {
    const clicked = nameHistoryRows.find((historyRow) => Number(historyRow.IDCLUB_NOM) === Number(rowId));
    if (!clicked) return;
    setNameHistorySelection([clicked.IDCLUB_NOM]);
    openNameEditDialog(clicked);
  };

  const terrainHistoryActions = (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title="Ajouter">
        {isMobile ? (
          <IconButton size="small" color="primary" aria-label="Ajouter" onClick={openTerrainCreateDialog}>
            <AddCircleOutlineRoundedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" variant="outlined" startIcon={<AddCircleOutlineRoundedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={openTerrainCreateDialog}>
            Ajouter
          </Button>
        )}
      </Tooltip>
      <Tooltip title="Modifier">
        {isMobile ? (
          <IconButton size="small" color="primary" aria-label="Modifier" onClick={() => openTerrainEditDialog()} disabled={!selectedTerrainHistoryRow}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={() => openTerrainEditDialog()} disabled={!selectedTerrainHistoryRow}>
            Modifier
          </Button>
        )}
      </Tooltip>
      <Tooltip title="Supprimer">
        {isMobile ? (
          <IconButton size="small" color="error" aria-label="Supprimer" onClick={openTerrainDeleteConfirm} disabled={!selectedTerrainHistoryRow}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" color="error" variant="outlined" startIcon={<DeleteOutlineRoundedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={openTerrainDeleteConfirm} disabled={!selectedTerrainHistoryRow}>
            Supprimer
          </Button>
        )}
      </Tooltip>
    </Stack>
  );

  const handleTerrainHistoryRowDoubleClick = (rowId: GridRowId) => {
    const clicked = terrainHistoryRows.find((historyRow) => Number(historyRow.CT_CLEUNIK) === Number(rowId));
    if (!clicked) return;
    setTerrainHistorySelection([clicked.CT_CLEUNIK]);
    openTerrainEditDialog(clicked);
  };

  const visualButtons = (
    <Stack
      direction="row"
      spacing={0.25}
      sx={{
        justifyContent: 'center',
        bgcolor: 'background.paper',
        backdropFilter: 'blur(2px)',
        borderRadius: 999,
        px: 0.5,
        py: 0.25,
        boxShadow: 2,
      }}
    >
      <Tooltip title="Pipette : choisir la couleur du FOND">
        <IconButton
          size="small"
          onClick={() => void handlePickScreenColor('fond')}
          aria-label="Pipette : choisir la couleur du FOND"
          sx={{ color: 'action.active' }}
        >
          <FormatColorFillRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Pipette : choisir la couleur du TEXTE">
        <IconButton
          size="small"
          onClick={() => void handlePickScreenColor('texte')}
          aria-label="Pipette : choisir la couleur du TEXTE"
          sx={{ color: 'action.active' }}
        >
          <FormatColorTextRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Detecter les 2 couleurs principales de l ecusson">
        <IconButton size="small" onClick={handleAutoDetectColors} aria-label="Detecter les 2 couleurs principales de l ecusson">
          <AutoFixHighRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  return (
    <Box sx={{ display: active ? 'block' : 'none' }}>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Chargement du club...</Typography>
        </Box>
      ) : row ? (
        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
          <Stack spacing={2.25}>
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ position: 'absolute', top: -8, right: 0, zIndex: 1 }}>
                <CompletenessChip missing={missingItems} />
              </Box>
              <Tabs
                value={activeTab}
                onChange={(_event, value: ClubTabKey) => setActiveTab(value)}
                sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36 } }}
              >
                <Tab value="info" label="INFORMATIONS" />
                <Tab value="matches" label="MATCHES" />
                <Tab value="palmares" label="PALMARÈS" />
              </Tabs>
            </Box>

            {activeTab === 'palmares' ? (
              <Box>
                {palmareLoading ? (
                  <Stack sx={{ alignItems: 'center', py: 4 }}><CircularProgress size={28} /></Stack>
                ) : palmareRows.length === 0 ? (
                  <Stack sx={{ alignItems: 'center', py: 4 }}>
                    <EmojiEventsRoundedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">Aucun titre remporté.</Typography>
                  </Stack>
                ) : (
                  <Stack spacing={0} divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
                    {palmareRows.map((palmareRow) => (
                      <PalmareListItem key={palmareRow.IDEPREUVE} row={palmareRow} />
                    ))}
                  </Stack>
                )}
              </Box>
            ) : null}

            {hasOpenedMatchesTab ? (
              <Box sx={{ display: activeTab === 'matches' ? 'block' : 'none' }}>
                <ClubMatchesTab
                  clubId={clubId}
                  matches={matchRows}
                  matchesLoading={matchesLoading}
                  filterClubId={matchFilterClubId}
                  filterClubName={matchFilterClubName}
                  onFilterChange={handleMatchFilterChange}
                />
              </Box>
            ) : null}

            {activeTab === 'info' ? (
            <>
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <EntityImageFrame
                  width={120}
                  height={150}
                  loading={clubImageDraft === undefined && clubImage.loading}
                  src={clubImageDraft === undefined ? clubImage.src : clubImageDraft}
                  alt="Ecusson du club"
                  objectFit="contain"
                  editable
                  accept="image/*"
                  onChangeImage={(nextValue) => setClubImageDraft(nextValue)}
                  onActionError={(message) => setSnackbar({ severity: 'error', message })}
                  actionLabels={{
                    upload: 'Importer un ecusson',
                    paste: 'Coller un ecusson depuis le presse-papiers',
                    clear: 'Supprimer l ecusson',
                  }}
                  fallback={<ShieldRoundedIcon sx={{ width: '100%', height: '100%', p: 1.5, color: 'text.disabled' }} />}
                  sx={{ bgcolor: 'background.paper' }}
                />

                <Stack spacing={0.5} sx={{ width: 132, flexShrink: 0 }}>
                  <ClubJerseyVisual
                    fond={currentFondColor}
                    texte={currentTexteColor}
                    clubName={profileDraft.name}
                    overlay={(
                      <Box
                        className="club-kit-actions"
                        sx={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 2,
                          display: 'flex',
                          justifyContent: 'center',
                          opacity: 0,
                          pointerEvents: 'none',
                          transition: 'opacity 160ms ease',
                          '.MuiIconButton-root': {
                            pointerEvents: 'auto',
                          },
                        }}
                      >
                        {visualButtons}
                      </Box>
                    )}
                  />
                </Stack>

                <TextField
                  label="Identifiant"
                  value={String(row.IDCLUB ?? '')}
                  size="small"
                  sx={{ width: '14ch', minWidth: '14ch', maxWidth: '14ch', flexShrink: 0 }}
                  slotProps={{
                    input: {
                      readOnly: true,
                      sx: { color: 'text.secondary', bgcolor: 'action.hover' },
                    },
                  }}
                />
              </Stack>

              <TextField
                label="Nom"
                value={profileDraft.name}
                onChange={(event) => setProfileDraft((prev) => ({ ...prev, name: event.target.value }))}
                size="small"
                fullWidth
                autoFocus
              />

              <VillePicker
                villeId={profileDraft.villeId}
                villeName={profileDraft.villeName}
                villeNatioId={profileDraft.villeNatioId}
                entityNatioId={profileDraft.natioId}
                onChange={(id, name, natioId) => setProfileDraft((prev) => ({ ...prev, villeId: id, villeName: name, villeNatioId: natioId }))}
              />

              <NatioAutocomplete
                natioDatas={natioRows}
                value={profileDraft.natioId}
                onChange={(id) => setProfileDraft((prev) => ({ ...prev, natioId: id }))}
                label="Pays"
              />
            </Stack>

            <Stack spacing={0.75}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Historique des noms</Typography>
                {nameHistoryActions}
              </Stack>
              <Box sx={{ height: 220 }}>
                <EntityDataGrid
                  rows={nameHistoryRows}
                  columns={nameHistoryColumns}
                  loading={nameHistoryLoading}
                  getRowId={(historyRow) => historyRow.IDCLUB_NOM}
                  selection={nameHistorySelection}
                  onSelectionChange={setNameHistorySelection}
                  onRowDoubleClick={handleNameHistoryRowDoubleClick}
                  pageSizeOptions={[10, 25, 50]}
                />
              </Box>
            </Stack>

            <Stack spacing={0.75}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Historique des stades</Typography>
                {terrainHistoryActions}
              </Stack>
              <Box sx={{ height: 220 }}>
                <EntityDataGrid
                  rows={terrainHistoryRows}
                  columns={terrainHistoryColumns}
                  loading={terrainHistoryLoading}
                  getRowId={(historyRow) => historyRow.CT_CLEUNIK}
                  selection={terrainHistorySelection}
                  onSelectionChange={setTerrainHistorySelection}
                  onRowDoubleClick={handleTerrainHistoryRowDoubleClick}
                  pageSizeOptions={[10, 25, 50]}
                />
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', pt: 0.5 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleGlobalReset}
                disabled={!isAnyDirty || savingProfile || nameDialogSaving || terrainDialogSaving}
              >
                Annuler
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => void handleGlobalSave()}
                disabled={!isAnyDirty || savingProfile || nameDialogSaving || terrainDialogSaving}
              >
                Enregistrer
              </Button>
            </Stack>
            </>
            ) : null}
          </Stack>
        </Box>
      ) : null}

      <Dialog open={nameDialogOpen} onClose={() => { if (!nameDialogSaving) setNameDialogOpen(false); }} fullWidth maxWidth="sm">
        <DialogTitle>{nameDialogMode === 'create' ? 'Ajouter un nom de club' : 'Modifier un nom de club'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.75 }}>
            <DateInputField
              label="Date"
              value={nameDialogDraft.date}
              onChange={(nextDate) => setNameDialogDraft((prev) => ({ ...prev, date: nextDate }))}
              fullWidth
              calendarAriaLabel="Calendrier date"
            />

            <TextField
              select
              label="Evénement"
              value={nameDialogDraft.eventType}
              onChange={(event) => setNameDialogDraft((prev) => ({ ...prev, eventType: event.target.value as '1' | '2' | '3' }))}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true }, select: { native: true } }}
            >
              <option value="1">Création</option>
              <option value="2">Modification</option>
              <option value="3">Dissolution</option>
            </TextField>

            <TextField
              label="Nom"
              value={nameDialogDraft.name}
              onChange={(event) => setNameDialogDraft((prev) => ({ ...prev, name: event.target.value }))}
              size="small"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNameDialogOpen(false)} disabled={nameDialogSaving}>Annuler</Button>
          <Button variant="contained" onClick={() => void handleNameDialogSave()} disabled={nameDialogSaving}>OK</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={nameDeleteConfirmOpen} onClose={() => { if (!nameDeleteSaving) setNameDeleteConfirmOpen(false); }}>
        <DialogTitle>Supprimer un nom de club</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Confirmez-vous la suppression de ce nom de club ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNameDeleteConfirmOpen(false)} disabled={nameDeleteSaving}>Annuler</Button>
          <Button color="error" variant="contained" onClick={() => void handleNameDeleteConfirm()} disabled={nameDeleteSaving}>Supprimer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={terrainDialogOpen} onClose={() => { if (!terrainDialogSaving) setTerrainDialogOpen(false); }} fullWidth maxWidth="sm">
        <DialogTitle>{terrainDialogMode === 'create' ? 'Ajouter un stade' : 'Modifier un stade'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.75 }}>
            <DateInputField
              label="Date"
              value={terrainDialogDraft.date}
              onChange={(nextDate) => setTerrainDialogDraft((prev) => ({ ...prev, date: nextDate }))}
              fullWidth
              calendarAriaLabel="Calendrier date"
            />

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TextField
                label="Stade"
                value={terrainDialogDraft.terrainName}
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Stack direction="row" spacing={0.25}>
                          <Tooltip title="Sélectionner un stade">
                            <IconButton size="small" onClick={() => setTerrainSelectorOpen(true)} aria-label="Sélectionner un stade">
                              <SearchRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Effacer le stade">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => setTerrainDialogDraft((prev) => ({ ...prev, terrainId: '', terrainName: '' }))}
                                disabled={!terrainDialogDraft.terrainId}
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
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerrainDialogOpen(false)} disabled={terrainDialogSaving}>Annuler</Button>
          <Button variant="contained" onClick={() => void handleTerrainDialogSave()} disabled={terrainDialogSaving}>OK</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={terrainDeleteConfirmOpen} onClose={() => { if (!terrainDeleteSaving) setTerrainDeleteConfirmOpen(false); }}>
        <DialogTitle>Supprimer un stade</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Confirmez-vous la suppression de ce stade de l historique ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTerrainDeleteConfirmOpen(false)} disabled={terrainDeleteSaving}>Annuler</Button>
          <Button color="error" variant="contained" onClick={() => void handleTerrainDeleteConfirm()} disabled={terrainDeleteSaving}>Supprimer</Button>
        </DialogActions>
      </Dialog>

      <AppFeedbackSnackbar value={snackbar} onClose={() => setSnackbar(null)} />

      <TerrainPickerDialog
        open={terrainSelectorOpen}
        onClose={() => setTerrainSelectorOpen(false)}
        onSelect={handleTerrainSelected}
      />
    </Box>
  );
}
