import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import FormatColorFillRoundedIcon from '@mui/icons-material/FormatColorFillRounded';
import FormatColorTextRoundedIcon from '@mui/icons-material/FormatColorTextRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMediaQuery, useTheme } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import jerseySvgSource from '../../../img/jersey.svg?raw';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { DateInputField } from '../../components/DateInputField';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { EntityImageFrame } from '../../components/EntityImageFrame';
import { toErrorMessage } from '../../components/useEntityPage';
import { useEntityImage } from '../../lib/useEntityImage';
import { fetchNatio } from '../natio/natioApi';
import type { NatioRow } from '../natio/types';
import { TerrainVilleSelector } from '../terrain/TerrainVilleSelector';
import type { VilleRow } from '../ville/types';
import {
  createClubTerrainHistory,
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
import type { ClubNameHistoryRow, ClubProfileRow, ClubTerrainHistoryRow } from './types';
import { TerrainSelector } from '../terrain/TerrainSelector';

interface ClubTabFormPaneProps {
  tabPath: string;
  clubId: string;
  active: boolean;
}

interface ClubProfileDraft {
  name: string;
  natioId: string;
  villeId: string;
  villeName: string;
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

function dispatchDirty(tabPath: string, dirty: boolean) {
  window.dispatchEvent(new CustomEvent('supporter:tab-dirty', { detail: { path: tabPath, dirty } }));
}

function dispatchTabLabel(tabPath: string, label: string) {
  window.dispatchEvent(new CustomEvent('supporter:tab-label', { detail: { path: tabPath, label } }));
}

const MONTHS_FR_SHORT = ['jan', 'fev', 'mar', 'avr', 'mai', 'jun', 'jul', 'aou', 'sep', 'oct', 'nov', 'dec'];

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
  svg = replaceSvgStyleColor(svg, '#32BEA6', '#eeeeee');
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
  const text = String(value ?? '').trim();
  const compactMatch = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  const dashedMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parts = compactMatch ?? dashedMatch;
  if (!parts) return text;

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || month < 1 || month > 12) {
    return text;
  }

  const dd = String(day).padStart(2, '0');
  const mmm = MONTHS_FR_SHORT[month - 1] ?? '---';
  return `${dd}-${mmm}-${year}`;
}

function formatDateForInput(value: unknown): string {
  const text = String(value ?? '').trim();
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    return `${compact[3]}/${compact[2]}/${compact[1]}`;
  }
  const dashed = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dashed) {
    return `${dashed[3]}/${dashed[2]}/${dashed[1]}`;
  }
  return '';
}

function formatDateForApi(value: string): string | null {
  const text = String(value ?? '').trim();
  if (!text) {
    return null;
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

export function ClubTabFormPane({ tabPath, clubId, active }: ClubTabFormPaneProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ClubProfileRow | undefined>(undefined);
  const [profileDraft, setProfileDraft] = useState<ClubProfileDraft>(createClubProfileDraft());
  const [savingProfile, setSavingProfile] = useState(false);
  const [natioRows, setNatioRows] = useState<NatioRow[]>([]);
  const [nameHistoryRows, setNameHistoryRows] = useState<ClubNameHistoryRow[]>([]);
  const [terrainHistoryRows, setTerrainHistoryRows] = useState<ClubTerrainHistoryRow[]>([]);
  const [nameHistoryLoading, setNameHistoryLoading] = useState(false);
  const [terrainHistoryLoading, setTerrainHistoryLoading] = useState(false);
  const [nameHistorySelection, setNameHistorySelection] = useState<GridRowId[]>([]);
  const [terrainHistorySelection, setTerrainHistorySelection] = useState<GridRowId[]>([]);
  const [villeSelectorOpen, setVilleSelectorOpen] = useState(false);
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
  const fondColorInputRef = useRef<HTMLInputElement | null>(null);
  const texteColorInputRef = useRef<HTMLInputElement | null>(null);
  const profileSignatureRef = useRef('');
  const clubImage = useEntityImage('club', clubId);
  const currentFondColor = profileDraft.fond;
  const currentTexteColor = profileDraft.texte;
  const kitVisualSrc = createJerseyVisualDataUri(currentFondColor, currentTexteColor, profileDraft.name);

  const isProfileDirty = getClubProfileSignature(profileDraft) !== profileSignatureRef.current;

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
      setRow(updated);
      setProfileDraft(createClubProfileDraft(updated));
      profileSignatureRef.current = getClubProfileSignature(createClubProfileDraft(updated));
      dispatchTabLabel(tabPath, String(updated.CLUB_ABREGE ?? '').trim() || String(clubId));
      dispatchDirty(tabPath, false);
      setSnackbar({ severity: 'success', message: 'Club mis a jour.' });
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleProfileReset = () => {
    setProfileDraft(createClubProfileDraft(row));
    dispatchDirty(tabPath, false);
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
      dispatchTabLabel(tabPath, nextLabel);
      dispatchDirty(tabPath, false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [clubId, tabPath]);

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

  useEffect(() => {
    const controller = new AbortController();

    void fetchNatio('', controller.signal)
      .then((result) => setNatioRows(result.data ?? []))
      .catch(() => {});

    void reloadRow();
    void reloadHistories();

    return () => {
      controller.abort();
      dispatchDirty(tabPath, false);
    };
  }, [reloadHistories, reloadRow, tabPath]);

  useEffect(() => {
    setClubImageDraft(undefined);
  }, [clubId]);

  useEffect(() => {
    if (loading) return;
    dispatchDirty(tabPath, isProfileDirty);
  }, [isProfileDirty, loading, tabPath]);

  const countryOptions = natioRows
    .map((natio) => ({
      id: String(natio.IDNATIO ?? natio.ID ?? '').trim(),
      label: String(natio.PAYS ?? natio.NOM ?? '').trim(),
    }))
    .filter((rowOption) => rowOption.id.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label));

  const villeDisplay = profileDraft.villeName || profileDraft.villeId;

  const handleVilleSelect = (ville: VilleRow) => {
    const villeId = String(ville.VICLEUNIK ?? '').trim();
    const villeNom = String(ville.NOM ?? '').trim();
    setProfileDraft((prev) => ({ ...prev, villeId, villeName: villeNom }));
    setVilleSelectorOpen(false);
  };

  const selectedNameHistoryId = Number(nameHistorySelection[0] ?? 0);
  const selectedNameHistoryRow = nameHistoryRows.find((historyRow) => Number(historyRow.IDCLUB_NOM) === selectedNameHistoryId);
  const selectedTerrainHistoryId = Number(terrainHistorySelection[0] ?? 0);
  const selectedTerrainHistoryRow = terrainHistoryRows.find((historyRow) => Number(historyRow.CT_CLEUNIK) === selectedTerrainHistoryId);

  const openNameCreateDialog = () => {
    setNameDialogMode('create');
    setNameDialogId(null);
    setNameDialogDraft({
      date: '',
      eventType: '1',
      name: String(profileDraft.name ?? '').trim(),
    });
    setNameDialogOpen(true);
  };

  const openNameEditDialog = (historyRow?: ClubNameHistoryRow) => {
    const rowToEdit = historyRow ?? selectedNameHistoryRow;
    if (!rowToEdit) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un nom de club a modifier.' });
      return;
    }
    const eventType = Number(rowToEdit.CN_ACTION ?? 0);
    setNameDialogMode('edit');
    setNameDialogId(Number(rowToEdit.IDCLUB_NOM));
    setNameDialogDraft({
      date: formatDateForInput(rowToEdit.DATE),
      eventType: eventType >= 1 && eventType <= 3 ? String(eventType) as '1' | '2' | '3' : '2',
      name: String(rowToEdit.CN_NOM ?? ''),
    });
    setNameDialogOpen(true);
  };

  const openNameDeleteConfirm = () => {
    if (!selectedNameHistoryRow) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un nom de club a supprimer.' });
      return;
    }
    setNameDeleteConfirmOpen(true);
  };

  const handleNameDialogSave = async () => {
    const date = formatDateForApi(nameDialogDraft.date);
    const name = String(nameDialogDraft.name ?? '').trim();
    const eventType = nameDialogDraft.eventType;

    if (!name) {
      setSnackbar({ severity: 'error', message: 'Le nom est requis.' });
      return;
    }

    setNameDialogSaving(true);
    try {
      if (nameDialogMode === 'create') {
        await createClubNameHistory(clubId, { date, eventType, name });
      } else {
        if (!nameDialogId) {
          setSnackbar({ severity: 'error', message: 'Nom de club invalide.' });
          return;
        }
        await updateClubNameHistory(clubId, nameDialogId, { date, eventType, name });
      }

      await reloadHistories();
      setNameDialogOpen(false);
      setSnackbar({ severity: 'success', message: 'Historique des noms mis a jour.' });
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
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
    setTerrainDialogMode('create');
    setTerrainDialogId(null);
    setTerrainDialogDraft({ date: '', terrainId: '', terrainName: '' });
    setTerrainDialogOpen(true);
  };

  const openTerrainEditDialog = (historyRow?: ClubTerrainHistoryRow) => {
    const rowToEdit = historyRow ?? selectedTerrainHistoryRow;
    if (!rowToEdit) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un stade a modifier.' });
      return;
    }

    setTerrainDialogMode('edit');
    setTerrainDialogId(Number(rowToEdit.CT_CLEUNIK));
    setTerrainDialogDraft({
      date: formatDateForInput(rowToEdit.DATE),
      terrainId: String(rowToEdit.TECLEUNIK ?? ''),
      terrainName: String(rowToEdit.STADE ?? ''),
    });
    setTerrainDialogOpen(true);
  };

  const openTerrainDeleteConfirm = () => {
    if (!selectedTerrainHistoryRow) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un stade a supprimer.' });
      return;
    }
    setTerrainDeleteConfirmOpen(true);
  };

  const handleTerrainDialogSave = async () => {
    const date = formatDateForApi(terrainDialogDraft.date);
    const terrainId = String(terrainDialogDraft.terrainId ?? '').trim();

    if (!terrainId) {
      setSnackbar({ severity: 'error', message: 'Le stade est requis.' });
      return;
    }

    setTerrainDialogSaving(true);
    try {
      if (terrainDialogMode === 'create') {
        await createClubTerrainHistory(clubId, { date, terrainId });
      } else {
        if (!terrainDialogId) {
          setSnackbar({ severity: 'error', message: 'Stade club invalide.' });
          return;
        }
        await updateClubTerrainHistory(clubId, terrainDialogId, { date, terrainId });
      }

      await reloadHistories();
      setTerrainDialogOpen(false);
      setSnackbar({ severity: 'success', message: 'Historique des stades mis a jour.' });
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
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

  const handleTerrainSelected = (terrain: { id: string; name: string }) => {
    setTerrainDialogDraft((prev) => ({ ...prev, terrainId: terrain.id, terrainName: terrain.name }));
    setTerrainSelectorOpen(false);
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
                  fallback={<SportsSoccerRoundedIcon sx={{ fontSize: 40, color: 'text.disabled' }} />}
                  sx={{ bgcolor: '#f5f5f5' }}
                />

                <Stack spacing={0.5} sx={{ width: 120, flexShrink: 0 }}>
                  <EntityImageFrame
                    width={120}
                    height={150}
                    src={kitVisualSrc}
                    alt="Maillot du club"
                    objectFit="contain"
                    objectPosition="center top"
                    imageSx={{ transform: 'scale(1.2)', transformOrigin: 'center 32%' }}
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
              />

              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TextField
                  label="Ville"
                  value={villeDisplay}
                  size="small"
                  fullWidth
                  slotProps={{ input: { readOnly: true } }}
                />
                <Tooltip title="Selectionner une ville">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setVilleSelectorOpen(true)}
                    startIcon={<LocationCityRoundedIcon fontSize="small" />}
                    sx={{
                      flexShrink: 0,
                      minWidth: 36,
                      px: 1,
                      '.MuiButton-startIcon': { mr: 0 },
                    }}
                    aria-label="Selectionner une ville"
                  >
                    <Box component="span" sx={{ display: 'none' }}>
                      Ville
                    </Box>
                  </Button>
                </Tooltip>
              </Stack>

              <TextField
                select
                label="Pays"
                value={profileDraft.natioId}
                onChange={(event) => setProfileDraft((prev) => ({ ...prev, natioId: event.target.value }))}
                size="small"
                fullWidth
                slotProps={{ inputLabel: { shrink: true }, select: { native: true } }}
              >
                <option value=""></option>
                {countryOptions.map((option) => (
                  <option key={option.id} value={option.id}>{`${option.label} (${option.id})`}</option>
                ))}
              </TextField>
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
                onClick={handleProfileReset}
                disabled={!isProfileDirty || savingProfile}
              >
                Annuler
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => void handleProfileSave()}
                disabled={!isProfileDirty || savingProfile}
              >
                Enregistrer
              </Button>
            </Stack>
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
                label="Nom du stade"
                value={terrainDialogDraft.terrainName}
                size="small"
                fullWidth
                slotProps={{ input: { readOnly: true } }}
              />
              <Tooltip title="Selectionner un stade">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setTerrainSelectorOpen(true)}
                  startIcon={<SportsSoccerRoundedIcon fontSize="small" />}
                  sx={{
                    flexShrink: 0,
                    minWidth: 36,
                    px: 1,
                    '.MuiButton-startIcon': { mr: 0 },
                  }}
                  aria-label="Selectionner un stade"
                >
                  <Box component="span" sx={{ display: 'none' }}>
                    Stade
                  </Box>
                </Button>
              </Tooltip>
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

      <TerrainVilleSelector
        open={villeSelectorOpen}
        onClose={() => setVilleSelectorOpen(false)}
        onSelect={handleVilleSelect}
      />

      <TerrainSelector
        open={terrainSelectorOpen}
        onClose={() => setTerrainSelectorOpen(false)}
        onSelect={handleTerrainSelected}
      />
    </Box>
  );
}
