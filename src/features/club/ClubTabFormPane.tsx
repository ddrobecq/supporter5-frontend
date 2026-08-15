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
import jerseySvgSource from '../../../img/jersey.svg?raw';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { ClubSelectField } from '../../components/ClubSelectField';
import { DateInputField, formatDateShort, toInputDateFromDisplay } from '../../components/DateInputField';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { NatioAutocomplete } from '../../components/NatioAutocomplete';
import { EntityImageFrame } from '../../components/EntityImageFrame';
import { MatchDataGrid } from '../../components/MatchDataGrid';
import { buildMatchGridColumns } from '../../components/matchGridColumns';
import { updateEntityImage } from '../../lib/entityImageApi';
import { useTabFormPaneBridge } from '../../lib/useTabFormPaneBridge';
import { toErrorMessage } from '../../components/useEntityPage';
import { useEntityImage } from '../../lib/useEntityImage';
import { fetchNatio } from '../natio/natioApi';
import type { NatioRow } from '../natio/types';
import { VillePicker } from '../../components/VillePicker';
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
      // WinDev/OLE style integer: low byte = red, middle = green, high = blue.
      const r = colorInt & 0xFF;
      const g = (colorInt >> 8) & 0xFF;
      const b = (colorInt >> 16) & 0xFF;
      const rr = r.toString(16).padStart(2, '0');
      const gg = g.toString(16).padStart(2, '0');
      const bb = b.toString(16).padStart(2, '0');
      return `#${rr}${gg}${bb}`;
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

function replaceSvgStyleColor(svg: string, target: string, replacement: string): string {
  const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return svg
    .replace(new RegExp(`fill:${escapedTarget};`, 'g'), `fill:${replacement};`)
    .replace(new RegExp(`stroke:${escapedTarget};`, 'g'), `stroke:${replacement};`)
    .replace(new RegExp(`fill="${escapedTarget}"`, 'g'), `fill="${replacement}"`)
    .replace(new RegExp(`stroke="${escapedTarget}"`, 'g'), `stroke="${replacement}"`);
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapClubNameLines(rawName: string): string[] {
  const text = rawName.replace(/\s+/g, ' ').trim();
  if (!text) return [];

  const words = text.split(' ');
  const maxLines = 3;
  const maxCharsPerLine = 11;

  // If the label has multiple words, prefer one word per line for clearer jersey rendering.
  if (words.length > 1) {
    const rawLines = words.slice(0, maxLines - 1);
    const remaining = words.slice(maxLines - 1).join(' ');
    if (remaining) {
      rawLines.push(remaining);
    }

    const normalizedLines = rawLines
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, maxLines)
      .map((line, index, array) => {
        if (line.length <= maxCharsPerLine) return line;
        if (index < array.length - 1) return `${line.slice(0, maxCharsPerLine - 1)}…`;
        return `${line.slice(0, maxCharsPerLine - 1)}…`;
      });

    return normalizedLines;
  }

  const lines: string[] = [];
  let current = '';

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index] ?? '';
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = '';
      if (lines.length === maxLines - 1) {
        const remaining = [word, ...words.slice(index + 1)].join(' ');
        lines.push(remaining);
        break;
      }
    }

    if (word.length > maxCharsPerLine) {
      const chunk = word.slice(0, maxCharsPerLine - 1);
      const rest = word.slice(maxCharsPerLine - 1);
      lines.push(chunk);
      if (lines.length === maxLines) break;
      current = rest;
    } else {
      current = word;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }

  if (lines.length === maxLines && lines[maxLines - 1].length > maxCharsPerLine) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, maxCharsPerLine - 1)}…`;
  }

  return lines;
}

function createJerseyVisualDataUri(fondColor: string, texteColor: string, clubName: string): string {
  let svg = jerseySvgSource;
  svg = replaceSvgStyleColor(svg, '#32BEA6', 'transparent');
  svg = replaceSvgStyleColor(svg, '#000000', fondColor);
  svg = replaceSvgStyleColor(svg, '#EFCE0F', fondColor);
  svg = replaceSvgStyleColor(svg, '#F2B906', fondColor);
  svg = replaceSvgStyleColor(svg, '#578408', fondColor);
  svg = replaceSvgStyleColor(svg, '#C49F05', texteColor);
  svg = replaceSvgStyleColor(svg, '#487206', texteColor);
  svg = replaceSvgStyleColor(svg, '#8c9183', texteColor);

  const wrappedLines = wrapClubNameLines(clubName);
  if (wrappedLines.length > 0) {
    const lineHeight = 38;
    const startY = 245 - ((wrappedLines.length - 1) * lineHeight) / 2;
    const tspans = wrappedLines
      .map((line, index) => `<tspan x="248" y="${startY + index * lineHeight}">${escapeSvgText(line)}</tspan>`)
      .join('');
    const textLayer = `<text text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="700" letter-spacing="0.5" fill="${texteColor}">${tspans}</text>`;
    svg = svg.replace('</svg>', `${textLayer}</svg>`);
  }

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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
        sx={{ width: 44, height: 44, bgcolor: 'grey.100', flexShrink: 0 }}
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
  const fondColorInputRef = useRef<HTMLInputElement | null>(null);
  const texteColorInputRef = useRef<HTMLInputElement | null>(null);
  const profileSignatureRef = useRef('');
  const nameDialogSignatureRef = useRef('');
  const terrainDialogSignatureRef = useRef('');
  const clubImage = useEntityImage('club', clubId, clubImageRefreshToken);
  const currentFondColor = profileDraft.fond;
  const currentTexteColor = profileDraft.texte;
  const kitVisualSrc = createJerseyVisualDataUri(currentFondColor, currentTexteColor, profileDraft.name);

  const isProfileDirty =
    getClubProfileSignature(profileDraft) !== profileSignatureRef.current || clubImageDraft !== undefined;
  const isNameDialogDirty = nameDialogOpen
    && getClubNameDialogSignature(nameDialogDraft) !== nameDialogSignatureRef.current;
  const isTerrainDialogDirty = terrainDialogOpen
    && getClubTerrainDialogSignature(terrainDialogDraft) !== terrainDialogSignatureRef.current;
  const isAnyDirty = isProfileDirty || isNameDialogDirty || isTerrainDialogDirty;

  const handlePickFondColor = () => {
    fondColorInputRef.current?.click();
  };

  const handlePickTexteColor = () => {
    texteColorInputRef.current?.click();
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
        return 'Creation';
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

  const filteredMatchRows = useMemo(() => {
    if (!matchFilterClubId) return matchRows;
    return matchRows.filter(
      (m) => m.DOMICILE === matchFilterClubId || m.EXTERIEUR === matchFilterClubId,
    );
  }, [matchRows, matchFilterClubId]);

  const matchStats = useMemo(() => {
    const completed = filteredMatchRows.filter((m) => m.ETAT === 2 || m.ETAT === 3);
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    for (const m of completed) {
      const isHome = m.DOMICILE === clubId;
      const gf = isHome ? (m.BUTDOM ?? 0) : (m.BUTEXT ?? 0);
      const gc = isHome ? (m.BUTEXT ?? 0) : (m.BUTDOM ?? 0);
      goalsFor += gf;
      goalsAgainst += gc;
      if (gf > gc) wins += 1;
      else if (gf === gc) draws += 1;
      else losses += 1;
    }
    return { played: completed.length, wins, draws, losses, goalsFor, goalsAgainst, diff: goalsFor - goalsAgainst };
  }, [filteredMatchRows, clubId]);

  const matchColumns = useMemo<GridColDef<ClubMatchRow>[]>(() => buildMatchGridColumns<ClubMatchRow>({
    date: {
      enabled: true,
      width: 110,
      sortable: true,
      renderCell: (matchRow) => formatClubDate(matchRow.DATE),
    },
    circ: {
      enabled: true,
      width: 260,
      sortable: true,
      field: 'CIRC_COMPLET',
      headerName: 'Circonstance complete',
    },
    score: {
      mode: 'readonly',
      sortable: false,
      valueGetter: (matchRow) => {
        const etat = Number(matchRow.ETAT ?? 0);
        if (etat === 1 || etat === 5) {
          return '-vs-';
        }
        if (etat === 4) {
          return '';
        }
        const hasPenalties = Number(matchRow.TABDOM ?? 0) > 0 || Number(matchRow.TABEXT ?? 0) > 0;
        if (hasPenalties) {
          return `${Number(matchRow.TABDOM ?? 0)} ${Number(matchRow.BUTDOM ?? 0)}-${Number(matchRow.BUTEXT ?? 0)} ${Number(matchRow.TABEXT ?? 0)}`;
        }
        return `${Number(matchRow.BUTDOM ?? 0)}-${Number(matchRow.BUTEXT ?? 0)}`;
      },
    },
    domicileHeaderName: 'Dom',
    exterieurHeaderName: 'Ext',
  }), []);

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
        bgcolor: 'rgba(255, 255, 255, 0.22)',
        backdropFilter: 'blur(2px)',
        borderRadius: 999,
        px: 0.5,
        py: 0.25,
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.12)',
      }}
    >
      <Tooltip title="Choisir la couleur du FOND">
        <IconButton
          size="small"
          onClick={handlePickFondColor}
          aria-label="Choisir la couleur du FOND"
          sx={{ color: currentFondColor }}
        >
          <FormatColorFillRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Choisir la couleur du TEXTE">
        <IconButton
          size="small"
          onClick={handlePickTexteColor}
          aria-label="Choisir la couleur du TEXTE"
          sx={{ color: currentTexteColor }}
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
        <Box sx={{ bgcolor: '#ffffff', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
          <Stack spacing={2.25}>
            <Tabs
              value={activeTab}
              onChange={(_event, value: ClubTabKey) => setActiveTab(value)}
              sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36 } }}
            >
              <Tab value="info" label="INFORMATIONS" />
              <Tab value="matches" label="MATCHES" />
              <Tab value="palmares" label="PALMARÈS" />
            </Tabs>

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

            {activeTab === 'matches' ? (
              <Stack spacing={1.5}>
                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <Box
                      sx={{
                        flex: '1 1 240px',
                        maxWidth: 320,
                        '& .MuiInputAdornment-positionStart .MuiTypography-root': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                      }}
                    >
                      <ClubSelectField
                        label="Filtrer par adversaire"
                        clubId={matchFilterClubId}
                        clubName={matchFilterClubName}
                        onChange={handleMatchFilterChange}
                        clearLabel="Effacer"
                      />
                    </Box>
                  </Stack>
                </Box>

                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>STATISTIQUES</Typography>
                  <Stack direction="row" spacing={0} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {([
                      { label: 'Matchs', value: matchStats.played },
                      { label: 'V', value: matchStats.wins },
                      { label: 'N', value: matchStats.draws },
                      { label: 'D', value: matchStats.losses },
                      { label: 'BP', value: matchStats.goalsFor },
                      { label: 'BC', value: matchStats.goalsAgainst },
                      { label: 'Diff', value: matchStats.diff > 0 ? `+${matchStats.diff}` : String(matchStats.diff) },
                    ] as { label: string; value: number | string }[]).map((stat) => (
                      <Box
                        key={stat.label}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          minWidth: 48,
                          px: 1,
                          py: 0.5,
                          bgcolor: 'action.hover',
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>{stat.label}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{stat.value}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>

                <Box sx={{ height: 400 }}>
                  <MatchDataGrid
                    rows={filteredMatchRows}
                    columns={matchColumns}
                    loading={matchesLoading}
                    getRowId={(matchRow) => matchRow.RECLEUNIK}
                    openMatchOnDoubleClick
                    disableRowSelectionOnClick
                    disableColumnMenu
                    density="compact"
                    pageSizeOptions={[25, 50, 100]}
                  />
                </Box>
              </Stack>
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
                  sx={{ bgcolor: '#f5f5f5' }}
                />

                <Stack spacing={0.5} sx={{ width: 132, flexShrink: 0 }}>
                  <EntityImageFrame
                    width={132}
                    height={150}
                    src={kitVisualSrc}
                    alt="Maillot du club"
                    objectFit="contain"
                    objectPosition="center top"
                    imageSx={{ transform: 'translateY(-10px) scale(1.56)', transformOrigin: 'center 24%' }}
                    sx={{
                      bgcolor: '#f5f5f5',
                      '&:hover .club-kit-actions, &:focus-within .club-kit-actions': {
                        opacity: 1,
                        pointerEvents: 'auto',
                      },
                    }}
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
                      sx: { color: 'text.secondary', bgcolor: '#f3f4f6' },
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

            <input
              ref={fondColorInputRef}
              type="color"
              value={currentFondColor}
              onChange={(event) => handleFondChange(event.target.value)}
              style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
              tabIndex={-1}
              aria-hidden="true"
            />

            <input
              ref={texteColorInputRef}
              type="color"
              value={currentTexteColor}
              onChange={(event) => handleTexteChange(event.target.value)}
              style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
              tabIndex={-1}
              aria-hidden="true"
            />

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
              label="Evenement (TYPE)"
              value={nameDialogDraft.eventType}
              onChange={(event) => setNameDialogDraft((prev) => ({ ...prev, eventType: event.target.value as '1' | '2' | '3' }))}
              size="small"
              fullWidth
              slotProps={{ inputLabel: { shrink: true }, select: { native: true } }}
            >
              <option value="1">Creation</option>
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
