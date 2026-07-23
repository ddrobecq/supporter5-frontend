import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import FormatColorFillRoundedIcon from '@mui/icons-material/FormatColorFillRounded';
import FormatColorTextRoundedIcon from '@mui/icons-material/FormatColorTextRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import {
  Box,
  Button,
  CircularProgress,
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
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { toErrorMessage } from '../../components/useEntityPage';
import { useEntityImage } from '../../lib/useEntityImage';
import { fetchNatio } from '../natio/natioApi';
import type { NatioRow } from '../natio/types';
import { TerrainVilleSelector } from '../terrain/TerrainVilleSelector';
import type { VilleRow } from '../ville/types';
import { fetchClubNameHistory, fetchClubProfileById, fetchClubTerrainHistory, updateClubProfile } from './clubApi';
import type { ClubNameHistoryRow, ClubProfileRow, ClubTerrainHistoryRow } from './types';

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

function createJerseyVisualDataUri(fondColor: string, texteColor: string): string {
  let svg = jerseySvgSource;
  svg = replaceSvgStyleColor(svg, '#32BEA6', '#eeeeee');
  svg = replaceSvgStyleColor(svg, '#000000', fondColor);
  svg = replaceSvgStyleColor(svg, '#EFCE0F', fondColor);
  svg = replaceSvgStyleColor(svg, '#F2B906', fondColor);
  svg = replaceSvgStyleColor(svg, '#578408', fondColor);
  svg = replaceSvgStyleColor(svg, '#C49F05', texteColor);
  svg = replaceSvgStyleColor(svg, '#487206', texteColor);
  svg = replaceSvgStyleColor(svg, '#8c9183', texteColor);
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
  const fondColorInputRef = useRef<HTMLInputElement | null>(null);
  const texteColorInputRef = useRef<HTMLInputElement | null>(null);
  const profileSignatureRef = useRef('');
  const clubImage = useEntityImage('club', clubId);
  const currentFondColor = profileDraft.fond;
  const currentTexteColor = profileDraft.texte;
  const kitVisualSrc = createJerseyVisualDataUri(currentFondColor, currentTexteColor);

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

  const miniActions = (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title="Ajouter">
        {isMobile ? (
          <IconButton size="small" color="primary" aria-label="Ajouter">
            <AddCircleOutlineRoundedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" variant="outlined" startIcon={<AddCircleOutlineRoundedIcon />} sx={{ minWidth: 0, px: 1.1 }}>
            Ajouter
          </Button>
        )}
      </Tooltip>
      <Tooltip title="Modifier">
        {isMobile ? (
          <IconButton size="small" color="primary" aria-label="Modifier">
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} sx={{ minWidth: 0, px: 1.1 }}>
            Modifier
          </Button>
        )}
      </Tooltip>
      <Tooltip title="Supprimer">
        {isMobile ? (
          <IconButton size="small" color="error" aria-label="Supprimer">
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Button size="small" color="error" variant="outlined" startIcon={<DeleteOutlineRoundedIcon />} sx={{ minWidth: 0, px: 1.1 }}>
            Supprimer
          </Button>
        )}
      </Tooltip>
    </Stack>
  );

  const visualButtons = (
    <Stack
      direction="row"
      spacing={0.25}
      sx={{
        justifyContent: 'center',
        bgcolor: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(2px)',
        borderRadius: 999,
        px: 0.5,
        py: 0.25,
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.18)',
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
                <Box
                  sx={{
                    width: 120,
                    height: 150,
                    flexShrink: 0,
                    border: '2px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    bgcolor: '#f5f5f5',
                  }}
                >
                  {clubImage.loading ? <CircularProgress size={20} /> : clubImage.src ? (
                    <Box component="img" src={clubImage.src} alt="Ecusson du club" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Typography variant="caption" color="text.secondary">ECUSSON</Typography>
                  )}
                </Box>

                <Stack spacing={0.5} sx={{ width: 120, flexShrink: 0 }}>
                  <Box
                    sx={{
                      width: 120,
                      height: 150,
                      border: '2px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      position: 'relative',
                      overflow: 'hidden',
                      bgcolor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Box
                      component="img"
                      src={kitVisualSrc}
                      alt="Maillot du club"
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        objectPosition: 'center top',
                        transform: 'translateY(-8px)',
                      }}
                    />
                    <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 2, display: 'flex', justifyContent: 'center' }}>
                      {visualButtons}
                    </Box>
                  </Box>
                </Stack>

                <TextField
                  label="Identifiant"
                  value={String(row.IDCLUB ?? '')}
                  size="small"
                  sx={{ width: 170, flexShrink: 0 }}
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
                {miniActions}
              </Stack>
              <Box sx={{ height: 220 }}>
                <EntityDataGrid
                  rows={nameHistoryRows}
                  columns={nameHistoryColumns}
                  loading={nameHistoryLoading}
                  getRowId={(historyRow) => historyRow.IDCLUB_NOM}
                  selection={nameHistorySelection}
                  onSelectionChange={setNameHistorySelection}
                  pageSizeOptions={[10, 25, 50]}
                />
              </Box>
            </Stack>

            <Stack spacing={0.75}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Historique des stades</Typography>
                {miniActions}
              </Stack>
              <Box sx={{ height: 220 }}>
                <EntityDataGrid
                  rows={terrainHistoryRows}
                  columns={terrainHistoryColumns}
                  loading={terrainHistoryLoading}
                  getRowId={(historyRow) => historyRow.CT_CLEUNIK}
                  selection={terrainHistorySelection}
                  onSelectionChange={setTerrainHistorySelection}
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

      <AppFeedbackSnackbar value={snackbar} onClose={() => setSnackbar(null)} />

      <TerrainVilleSelector
        open={villeSelectorOpen}
        onClose={() => setVilleSelectorOpen(false)}
        onSelect={handleVilleSelect}
      />
    </Box>
  );
}
