import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { http } from '../../lib/http';
import { toErrorMessage } from '../../components/useEntityPage';
import { fetchRencontreComposition, fetchRencontreSquad, saveRencontreComposition } from './rencontreApi';
import type { CompositionMap, SquadPlayerRow } from './types';
import { NatioFlag } from '../../components/NatioFlag';
import {
  PITCH_AVATAR_SIZE,
  PITCH_SLOTS,
  PitchField,
  PitchPlayerAvatar as PlayerAvatar,
  PitchPlayerMarker,
  PitchSlotShell,
  pitchPlayerLabel as playerLabel,
} from '../../components/PitchField';
import { JoueurPage } from '../joueur/JoueurPage';

const REMP_CODES = ['REMP1','REMP2','REMP3','REMP4','REMP5','REMP6','REMP7','REMP8','REMP9','REMP10','REMP11'] as const;

// ---------------------------------------------------------------------------

interface PitchSlotProps {
  code: string;
  label: string;
  x: number;
  y: number;
  player: SquadPlayerRow | null;
  onDrop: (code: string, playerId: string, source: string) => void;
  onRemove: (code: string) => void;
  setDragSource: (src: string) => void;
}

function PitchSlot({ code, label, x, y, player, onDrop, onRemove, setDragSource }: PitchSlotProps) {
  const [over, setOver] = useState(false);

  return (
    <PitchSlotShell
      x={x}
      y={y}
      sx={{ cursor: player ? 'default' : 'pointer' }}
      title={label}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const playerId = e.dataTransfer.getData('playerId');
        const source = e.dataTransfer.getData('source');
        if (playerId) onDrop(code, playerId, source);
      }}
      onDoubleClick={() => { if (player) onRemove(code); }}
    >
      {player ? (
        <PitchPlayerMarker
          player={player}
          highlighted={over}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('playerId', player.IDJOUEUR);
            e.dataTransfer.setData('source', code);
            setDragSource(code);
          }}
          avatarSx={{ cursor: 'grab' }}
        />
      ) : (
        <Box
          sx={{
            width: PITCH_AVATAR_SIZE,
            height: PITCH_AVATAR_SIZE,
            borderRadius: '50%',
            border: over
              ? '2px solid #FFD700'
              : '2px solid',
            borderColor: over ? '#FFD700' : 'divider',
            bgcolor: over ? 'rgba(255,215,0,0.15)' : 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
        />
      )}
    </PitchSlotShell>
  );
}

// ---------------------------------------------------------------------------

function CoachInlineDisplay({ player, href }: { player: SquadPlayerRow; href?: string }) {
  const nom = player.NOM?.trim() ? player.NOM.toUpperCase() : player.IDJOUEUR;
  const prenom = player.PRENOM?.trim() ?? '';
  const [idnatio, setIdnatio] = useState<string | null>(() => player.IDNATIO?.trim() || null);

  // Fetch IDNATIO if missing (happens when coach was added manually without full squad data)
  useEffect(() => {
    if (idnatio || !player.IDJOUEUR) return;
    void http.get<Record<string, unknown>>(`/api/joueurs/${encodeURIComponent(player.IDJOUEUR)}`)
      .then(({ data }) => {
        const natio = String(data?.IDNATIO ?? '').trim();
        if (natio) setIdnatio(natio);
      })
      .catch(() => { /* noop */ });
  }, [player.IDJOUEUR, idnatio]);

  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
      <PlayerAvatar playerId={player.IDJOUEUR} size={30} />
      <Typography
        variant="body2"
        {...(href ? { component: RouterLink, to: href } : {})}
        sx={{ fontSize: 11, fontWeight: 600, ...(href ? { color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } } : {}) }}
      >
        {nom}{prenom ? ` ${prenom}` : ''}
      </Typography>
      {idnatio ? <NatioFlag idnatio={idnatio} /> : null}
    </Stack>
  );
}

/** Cadre d'un poste de banc, partage entre la compo admin et la compo publique. */
export const BENCH_SLOT_SX = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.75,
  height: 38,
  px: 0.75,
  borderRadius: 1,
  border: '1.5px dashed',
  borderColor: 'divider',
} as const;

export function BenchPlayerLabel({ player, href }: { player: SquadPlayerRow; href?: string }) {
  return (
    <Typography
      variant="caption"
      {...(href ? { component: RouterLink, to: href } : {})}
      sx={{
        fontSize: 10,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...(href ? { color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } } : {}),
      }}
    >
      {playerLabel(player)}
    </Typography>
  );
}

export { CoachInlineDisplay };

// ---------------------------------------------------------------------------

export interface CompositionTabActions {
  save: () => Promise<void>;
  reset: () => void;
  isSaving: () => boolean;
}

interface RencontreCompositionTabProps {
  rencontreId: string;
  active: boolean;
  season?: string;
  supportedClubName?: string;
  opponentClubName?: string;
  onDirtyChange?: (dirty: boolean) => void;
  actionsRef?: React.MutableRefObject<CompositionTabActions | null>;
}

// Module-level caches survive component unmount/remount (main-tab switches, hot-reload, etc.)
const _compositionCache = new Map<string, CompositionMap>();
const _squadCache = new Map<string, SquadPlayerRow[]>();
const _initialCompositionCache = new Map<string, CompositionMap>();

export function RencontreCompositionTab({
  rencontreId,
  active,
  season,
  supportedClubName,
  opponentClubName,
  onDirtyChange,
  actionsRef,
}: RencontreCompositionTabProps) {
  const theme = useTheme();
  const isNarrowViewport = useMediaQuery(theme.breakpoints.down('md'));
  const [squad, setSquad] = useState<SquadPlayerRow[]>(() => _squadCache.get(rencontreId) ?? []);
  const [composition, setComposition] = useState<CompositionMap>(() => _compositionCache.get(rencontreId) ?? {});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOpponentCompositionOnMobile, setShowOpponentCompositionOnMobile] = useState(false);
  const [coachPickerOpen, setCoachPickerOpen] = useState(false);
  const dragSourceRef = useRef<string>('');
  const initialCompositionRef = useRef<CompositionMap>(_initialCompositionCache.get(rencontreId) ?? {});
  const savingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // Reset load guard when rencontreId changes so fresh data is fetched for a new match.
  useEffect(() => {
    hasLoadedRef.current = !!_compositionCache.get(rencontreId);
    setShowOpponentCompositionOnMobile(false);
  }, [rencontreId]);

  // Load data only once per rencontreId — never reload on tab switch to preserve unsaved changes.
  useEffect(() => {
    if (!active || hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    setLoading(true);
    setError(null);
    void Promise.all([
      fetchRencontreSquad(rencontreId),
      fetchRencontreComposition(rencontreId),
    ]).then(([squadData, compoData]) => {
      _squadCache.set(rencontreId, squadData);
      _compositionCache.set(rencontreId, compoData);
      _initialCompositionCache.set(rencontreId, compoData);
      setSquad(squadData);
      setComposition(compoData);
      initialCompositionRef.current = compoData;
    }).catch((err) => setError(toErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [active, rencontreId]);

  // Map playerId → SquadPlayerRow for quick lookup
  const playerById = useMemo<Map<string, SquadPlayerRow>>(() => {
    const map = new Map<string, SquadPlayerRow>();
    squad.forEach((p) => map.set(p.IDJOUEUR, p));
    return map;
  }, [squad]);

  // All player IDs currently in the composition (pitch + bench + coach)
  const assignedIds = useMemo<Set<string>>(() => {
    const ids = new Set<string>();
    for (const val of Object.values(composition)) {
      if (val) ids.add(val);
    }
    return ids;
  }, [composition]);

  // Players available in the list: only POS_TYPE=1 (players), not yet assigned
  const availablePlayers = useMemo(
    () => squad.filter((p) => p.POS_TYPE === 1 && !assignedIds.has(p.IDJOUEUR)),
    [squad, assignedIds],
  );

  // ---------------------------------------------------------------------------
  // Drag & drop handlers
  // ---------------------------------------------------------------------------

  const handleDrop = useCallback((targetCode: string, playerId: string, source: string) => {
    setComposition((prev) => {
      const next = { ...prev };
      // Remove from source if it was on pitch/bench
      if (source !== 'list') {
        next[source] = null;
      }
      // If target is already occupied, the existing player goes back to list (set to null)
      next[targetCode] = playerId;
      return next;
    });
  }, []);

  const handleRemoveFromSlot = useCallback((code: string) => {
    setComposition((prev) => ({ ...prev, [code]: null }));
  }, []);

  // Drop on the available players zone (unassign from pitch/bench)
  const handleDropToList = (e: React.DragEvent) => {
    e.preventDefault();
    const source = e.dataTransfer.getData('source');
    if (source && source !== 'list') {
      handleRemoveFromSlot(source);
    }
  };

  // ---------------------------------------------------------------------------
  // Coach
  // ---------------------------------------------------------------------------

  const coachId = (composition['ENTRAINEUR'] as string | null | undefined) ?? null;
  const coachPlayer = coachId ? playerById.get(coachId) : null;
  const opponentComposition = String(composition['MACOMPOADVERSAIRE'] ?? '');
  const normalizedSupportedClubName = String(supportedClubName ?? '').trim() || 'le club supporte';
  const normalizedOpponentClubName = String(opponentClubName ?? '').trim() || 'l adversaire';
  const showSupportedComposition = !isNarrowViewport || !showOpponentCompositionOnMobile;
  const showOpponentComposition = !isNarrowViewport || showOpponentCompositionOnMobile;
  const mobileSwitchTargetClubName = showOpponentCompositionOnMobile ? normalizedSupportedClubName : normalizedOpponentClubName;

  const handleOpponentCompositionChange = useCallback((value: string) => {
    setComposition((prev) => ({ ...prev, MACOMPOADVERSAIRE: value }));
  }, []);

  const handleCoachSelect = useCallback((rowId: string | number) => {
    const id = String(rowId);
    setComposition((prev) => ({ ...prev, ENTRAINEUR: id }));
    setSquad((prev) => {
      if (prev.some((p) => p.IDJOUEUR === id)) return prev;
      return [...prev, { IDJOUEUR: id, NOM: id, PRENOM: '', SURNOM: null, POSTE: 5, POS_TYPE: 2 }];
    });
    setCoachPickerOpen(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Dirty tracking
  // ---------------------------------------------------------------------------

  const isCompositionDirty = JSON.stringify(composition) !== JSON.stringify(initialCompositionRef.current);

  useEffect(() => {
    onDirtyChange?.(isCompositionDirty);
  }, [isCompositionDirty, onDirtyChange]);

  // ---------------------------------------------------------------------------
  // Save / Reset
  // ---------------------------------------------------------------------------

  const handleSave = async () => {
    setSaving(true);
    savingRef.current = true;
    setError(null);
    try {
      await saveRencontreComposition(rencontreId, composition);
      initialCompositionRef.current = { ...composition };
      _compositionCache.set(rencontreId, { ...composition });
      _initialCompositionCache.set(rencontreId, { ...composition });
    } catch (err) {
      setError(toErrorMessage(err));
      throw err;
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const handleReset = useCallback(() => {
    const initial = initialCompositionRef.current;
    setComposition(initial);
    _compositionCache.set(rencontreId, initial);
  }, [rencontreId]);

  // Keep module cache in sync with every local change so remounts restore the latest draft.
  useEffect(() => {
    if (Object.keys(composition).length > 0) {
      _compositionCache.set(rencontreId, composition);
    }
  }, [composition, rencontreId]);

  useEffect(() => {
    if (!actionsRef) return;
    actionsRef.current = { save: handleSave, reset: handleReset, isSaving: () => savingRef.current };
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Box sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={18} />
        <Typography variant="body2" color="text.secondary">Chargement de la composition...</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {error ? <Typography variant="body2" color="error.main">{error}</Typography> : null}

      {isNarrowViewport ? (
        <FormControlLabel
          control={(
            <Switch
              checked={showOpponentCompositionOnMobile}
              onChange={(event) => setShowOpponentCompositionOnMobile(event.target.checked)}
            />
          )}
          label={`Voir la composition de ${mobileSwitchTargetClubName}`}
        />
      ) : null}

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          flexWrap: { md: 'wrap' },
          gap: 1.5,
          alignItems: { xs: 'stretch', md: 'flex-start' },
        }}
      >
        {showSupportedComposition ? (
          <Box
            sx={{
              minWidth: { xs: 0, md: 634 },
              flex: { md: '1 1 634px' },
            }}
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '170px minmax(0, 1fr)', md: '170px auto' }, gap: 1.5, alignItems: 'start', justifyContent: 'start' }}>
        {/* ── Left: available players list ── */}
          <Stack spacing={0.5} sx={{ width: '100%', maxWidth: 170 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Joueurs disponibles</Typography>
          <Box
            sx={{
              height: 480,
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              overflowY: 'auto',
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropToList}
          >
            {availablePlayers.map((p) => (
              <Box
                key={p.IDJOUEUR}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('playerId', p.IDJOUEUR);
                  e.dataTransfer.setData('source', 'list');
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1,
                  py: 0.5,
                  cursor: 'grab',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.hover' },
                  userSelect: 'none',
                }}
              >
                <PlayerAvatar playerId={p.IDJOUEUR} size={28} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 11, lineHeight: 1.2 }}>
                    {playerLabel(p)}
                  </Typography>
                  {!p.SURNOM?.trim() && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, display: 'block' }}>
                      {p.PRENOM}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
            {availablePlayers.length === 0 && (
              <Typography variant="caption" color="text.disabled" sx={{ p: 1, display: 'block', textAlign: 'center' }}>
                Tous les joueurs sont placés
              </Typography>
            )}
          </Box>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(280px, 420px) 160px' },
            columnGap: 1.5,
            rowGap: 1,
            alignItems: 'start',
            width: { xs: '100%', md: 'min(100%, 592px)' },
            justifySelf: 'start',
          }}
        >
        {/* ── Center: pitch ── */}
        <Box sx={{ maxWidth: 420, width: '100%', justifySelf: 'start' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Terrain</Typography>
          <PitchField>
            {PITCH_SLOTS.map((slot) => (
              <PitchSlot
                key={slot.code}
                {...slot}
                player={composition[slot.code] ? (playerById.get(composition[slot.code] as string) ?? null) : null}
                onDrop={handleDrop}
                onRemove={handleRemoveFromSlot}
                setDragSource={(src) => { dragSourceRef.current = src; }}
              />
            ))}
          </PitchField>
        </Box>

        {/* ── Right: bench + coach ── */}
        <Stack
          spacing={0.5}
          sx={{
            gridColumn: { xs: '1 / -1', md: 'auto' },
            alignSelf: 'start',
          }}
        >
          {/* Coach slot */}
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Entraîneur</Typography>
            <Tooltip title="Cliquer pour sélectionner l'entraîneur">
              <Box
                onClick={() => setCoachPickerOpen(true)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75,
                  height: 44, px: 1, borderRadius: 1,
                  border: '1.5px dashed', borderColor: coachPlayer ? 'primary.main' : 'divider',
                  bgcolor: coachPlayer ? 'primary.50' : 'background.default',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                {coachPlayer ? (
                  <CoachInlineDisplay player={coachPlayer} />
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                    Cliquer pour sélectionner
                  </Typography>
                )}
              </Box>
            </Tooltip>
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1 }}>Remplaçants</Typography>

          <Stack spacing={0.5}>
            {REMP_CODES.map((code) => {
              const pid = (composition[code] as string | null | undefined) ?? null;
              const player = pid ? (playerById.get(pid) ?? null) : null;
              return (
                <Box
                  key={code}
                  sx={{
                    ...BENCH_SLOT_SX,
                    bgcolor: player ? 'action.hover' : 'background.default',
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const playerId = e.dataTransfer.getData('playerId');
                    const source = e.dataTransfer.getData('source');
                    if (playerId) handleDrop(code, playerId, source);
                  }}
                  onDoubleClick={() => { if (player) handleRemoveFromSlot(code); }}
                >
                  {player ? (
                    <>
                      <Box
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('playerId', player.IDJOUEUR);
                          e.dataTransfer.setData('source', code);
                        }}
                        sx={{ cursor: 'grab', flexShrink: 0 }}
                      >
                        <PlayerAvatar playerId={player.IDJOUEUR} size={28} />
                      </Box>
                      <BenchPlayerLabel player={player} />
                    </>
                  ) : (
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
                      {code}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Stack>

          {saving ? (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">Enregistrement...</Typography>
            </Box>
          ) : null}
        </Stack>
        </Box>
            </Box>
          </Box>
        ) : null}

        {showOpponentComposition ? (
          <Stack
            spacing={0.5}
            sx={{
              width: { xs: '100%', md: 'clamp(10ch, 26vw, 360px)' },
              minWidth: { md: '10ch' },
              flex: { md: '0 1 360px' },
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Composition de {normalizedOpponentClubName}</Typography>
            <TextField
              value={opponentComposition}
              onChange={(event) => handleOpponentCompositionChange(event.target.value)}
              multiline
              minRows={isNarrowViewport ? 14 : 24}
              placeholder="Saisir la composition de l'adversaire"
              fullWidth
            />
          </Stack>
        ) : null}
      </Box>

      {/* Coach picker modal */}
      <Dialog
        open={coachPickerOpen}
        onClose={() => setCoachPickerOpen(false)}
        fullWidth
        maxWidth="xl"
        slotProps={{ paper: { sx: { height: '80vh' } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SportsSoccerRoundedIcon />
          Sélectionner l'entraîneur
          <IconButton
            aria-label="Fermer"
            onClick={() => setCoachPickerOpen(false)}
            sx={{ ml: 'auto' }}
          >
            ×
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          <JoueurPage
            variant="modalPicker"
            filterPosteType={2}
            initialSeason={season}
            onOpenInTab={({ rowId }) => handleCoachSelect(rowId)}
          />
        </DialogContent>
      </Dialog>

    </Stack>
  );
}
