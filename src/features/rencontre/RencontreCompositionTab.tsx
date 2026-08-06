import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import SportsIcon from '@mui/icons-material/Sports';
import {
  Avatar,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEntityImage } from '../../lib/useEntityImage';
import { toErrorMessage } from '../../components/useEntityPage';
import { fetchRencontreComposition, fetchRencontreSquad, saveRencontreComposition, fetchArbitreById, upsertRencontreArbitre } from './rencontreApi';
import type { CompositionMap, SquadPlayerRow } from './types';
import { NatioFlag } from '../../components/NatioFlag';
import { JoueurPage } from '../joueur/JoueurPage';
import { ArbitrePage } from '../arbitre/ArbitrePage';

// Position slots on the pitch with their percentage coordinates (x%, y%)
// Pitch is shown top=attack, bottom=goalkeeper
const PITCH_SLOTS: { code: string; label: string; x: number; y: number }[] = [
  { code: 'AVC',  label: 'AVC',  x: 50, y: 7  },
  { code: 'ACD',  label: 'ACD',  x: 66, y: 12 },
  { code: 'ACG',  label: 'ACG',  x: 34, y: 12 },
  { code: 'ALD',  label: 'ALD',  x: 83, y: 17 },
  { code: 'ALG',  label: 'ALG',  x: 17, y: 17 },
  { code: 'MOCC', label: 'MOCC', x: 50, y: 28 },
  { code: 'MOCD', label: 'MOCD', x: 67, y: 30 },
  { code: 'MOCG', label: 'MOCG', x: 33, y: 30 },
  { code: 'MOLD', label: 'MOLD', x: 84, y: 34 },
  { code: 'MOLG', label: 'MOLG', x: 16, y: 34 },
  { code: 'MDCC', label: 'MDCC', x: 50, y: 46 },
  { code: 'MDCD', label: 'MDCD', x: 67, y: 48 },
  { code: 'MDCG', label: 'MDCG', x: 33, y: 48 },
  { code: 'MDLD', label: 'MDLD', x: 84, y: 52 },
  { code: 'MDLG', label: 'MDLG', x: 16, y: 52 },
  { code: 'STO',  label: 'STO',  x: 50, y: 60 },
  { code: 'LIB',  label: 'LIB',  x: 50, y: 66 },
  { code: 'DCD',  label: 'DCD',  x: 65, y: 75 },
  { code: 'DCG',  label: 'DCG',  x: 35, y: 75 },
  { code: 'DLD',  label: 'DLD',  x: 83, y: 78 },
  { code: 'DLG',  label: 'DLG',  x: 17, y: 78 },
  { code: 'GOAL', label: 'GB',   x: 50, y: 93 },
];

const REMP_CODES = ['REMP1','REMP2','REMP3','REMP4','REMP5','REMP6','REMP7','REMP8','REMP9','REMP10','REMP11'] as const;

const AVATAR_SIZE = 38;

// ---------------------------------------------------------------------------

function PlayerAvatar({ playerId, size = AVATAR_SIZE }: { playerId: string; size?: number }) {
  const { src } = useEntityImage('joueurrg', playerId);
  return (
    <Avatar src={src ?? undefined} sx={{ width: size, height: size, bgcolor: 'grey.300' }}>
      {!src && <PersonOutlineRoundedIcon sx={{ fontSize: size * 0.6 }} />}
    </Avatar>
  );
}

function playerLabel(p: SquadPlayerRow): string {
  if (p.SURNOM?.trim()) return p.SURNOM.trim();
  const nom = p.NOM?.trim() ?? '';
  return nom || p.IDJOUEUR;
}

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
    <Box
      sx={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: 60,
        cursor: player ? 'default' : 'pointer',
        userSelect: 'none',
      }}
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
        <>
          <Box
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('playerId', player.IDJOUEUR);
              e.dataTransfer.setData('source', code);
              setDragSource(code);
            }}
            sx={{
              borderRadius: '50%',
              border: over ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.8)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
              cursor: 'grab',
            }}
          >
            <PlayerAvatar playerId={player.IDJOUEUR} />
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontSize: 9,
              lineHeight: 1.1,
              fontWeight: 700,
              color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              textAlign: 'center',
              mt: 0.25,
              maxWidth: 58,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {playerLabel(player)}
          </Typography>
        </>
      ) : (
        <Box
          sx={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: '50%',
            border: over
              ? '2px solid #FFD700'
              : '2px solid rgba(255,255,255,0.1)',
            bgcolor: over ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
        />
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------

function ArbitreInlineDisplay({ idarbitre, data }: { idarbitre: string; data: { NOM: string; PRENOM: string; IDNATIO: string } | null }) {
  const { src } = useEntityImage('arbitre', idarbitre);
  const nom = data?.NOM?.trim() ? data.NOM.toUpperCase() : idarbitre;
  const prenom = data?.PRENOM?.trim() ?? '';
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Avatar src={src ?? undefined} sx={{ width: 30, height: 30, bgcolor: 'grey.300', flexShrink: 0 }}>
        {!src && <SportsIcon sx={{ fontSize: 18 }} />}
      </Avatar>
      <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600 }}>
        {nom}{prenom ? ` ${prenom}` : ''}
      </Typography>
      {data?.IDNATIO ? <NatioFlag idnatio={data.IDNATIO} /> : null}
    </Stack>
  );
}

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
  onDirtyChange?: (dirty: boolean) => void;
  actionsRef?: React.MutableRefObject<CompositionTabActions | null>;
}

export function RencontreCompositionTab({ rencontreId, active, season, onDirtyChange, actionsRef }: RencontreCompositionTabProps) {
  const [squad, setSquad] = useState<SquadPlayerRow[]>([]);
  const [composition, setComposition] = useState<CompositionMap>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coachPickerOpen, setCoachPickerOpen] = useState(false);
  const [arbitrePickerOpen, setArbitrePickerOpen] = useState(false);
  const [arbitreData, setArbitreData] = useState<{ NOM: string; PRENOM: string; IDNATIO: string } | null>(null);
  const dragSourceRef = useRef<string>('');
  const initialCompositionRef = useRef<CompositionMap>({});
  const savingRef = useRef(false);

  // Load data when tab becomes active
  useEffect(() => {
    if (!active) return;
    setLoading(true);
    setError(null);
    void Promise.all([
      fetchRencontreSquad(rencontreId),
      fetchRencontreComposition(rencontreId),
    ]).then(([squadData, compoData]) => {
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

  const idarbitreId = String(composition['IDARBITRE'] ?? '').trim() || null;

  const handleCoachSelect = useCallback((rowId: string | number) => {
    const id = String(rowId);
    setComposition((prev) => ({ ...prev, ENTRAINEUR: id }));
    setSquad((prev) => {
      if (prev.some((p) => p.IDJOUEUR === id)) return prev;
      return [...prev, { IDJOUEUR: id, NOM: id, PRENOM: '', SURNOM: null, POSTE: 5, POS_TYPE: 2 }];
    });
    setCoachPickerOpen(false);
  }, []);

  const handleArbitreSelect = useCallback(async (rowId: string | number) => {
    const id = String(rowId).trim();
    setArbitrePickerOpen(false);
    try {
      await upsertRencontreArbitre(rencontreId, id);
      setComposition((prev) => ({ ...prev, IDARBITRE: id }));
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }, [rencontreId]);

  // ---------------------------------------------------------------------------
  // Dirty tracking
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!idarbitreId) { setArbitreData(null); return; }
    void fetchArbitreById(idarbitreId).then((arbitre) => {
      if (arbitre) setArbitreData({ NOM: String(arbitre.NOM ?? '').trim(), PRENOM: String(arbitre.PRENOM ?? '').trim(), IDNATIO: String(arbitre.IDNATIO ?? '').trim() });
    });
  }, [idarbitreId]);

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
    } catch (err) {
      setError(toErrorMessage(err));
      throw err;
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const handleReset = useCallback(() => {
    setComposition(initialCompositionRef.current);
  }, []);

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

      <Box sx={{ display: 'grid', gridTemplateColumns: '200px 1fr 160px', gap: 1.5, alignItems: 'start' }}>
        {/* ── Left: available players list ── */}
        <Stack spacing={0.5}>
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

        {/* ── Center: pitch ── */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Terrain</Typography>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              paddingTop: '150%',
              bgcolor: '#2d8a4e',
              borderRadius: 2,
              border: '3px solid #fff',
              overflow: 'hidden',
            }}
          >
            {/* SVG pitch markings — viewBox 70×105 matches CSS paddingTop:150% exactly */}
            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              viewBox="0 0 70 105"
              preserveAspectRatio="none"
            >
              {/* Center line */}
              <line x1="0" y1="52.5" x2="70" y2="52.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
              {/* Center circle */}
              <circle cx="35" cy="52.5" r="9.15" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none" />
              {/* Center spot */}
              <circle cx="35" cy="52.5" r="0.6" fill="rgba(255,255,255,0.5)" />

              {/* Top penalty area (16.5m deep, 40.32m wide) */}
              <rect x="14.84" y="0" width="40.32" height="16.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none" />
              {/* Top 6-yard box (5.5m deep, 18.32m wide) */}
              <rect x="25.84" y="0" width="18.32" height="5.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none" />
              {/* Top penalty spot at 11m */}
              <circle cx="35" cy="11" r="0.6" fill="rgba(255,255,255,0.5)" />
              {/* Top penalty arc — center (35,11) r=9.15, intersects y=16.5 at x=35±7.31 */}
              <path d="M 27.69 16.5 A 9.15 9.15 0 0 0 42.31 16.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none" />

              {/* Bottom penalty area (16.5m deep, 40.32m wide) */}
              <rect x="14.84" y="88.5" width="40.32" height="16.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none" />
              {/* Bottom 6-yard box (5.5m deep, 18.32m wide) */}
              <rect x="25.84" y="99.5" width="18.32" height="5.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none" />
              {/* Bottom penalty spot at 11m from bottom */}
              <circle cx="35" cy="94" r="0.6" fill="rgba(255,255,255,0.5)" />
              {/* Bottom penalty arc — center (35,94) r=9.15, intersects y=88.5 at x=35±7.31 */}
              <path d="M 27.69 88.5 A 9.15 9.15 0 0 1 42.31 88.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none" />
            </svg>

            {/* Position slots */}
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
          </Box>
        </Box>

        {/* ── Right: bench + coach ── */}
        <Stack spacing={0.5}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Remplaçants</Typography>

          <Stack spacing={0.5}>
            {REMP_CODES.map((code) => {
              const pid = (composition[code] as string | null | undefined) ?? null;
              const player = pid ? (playerById.get(pid) ?? null) : null;
              return (
                <Box
                  key={code}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    height: 38,
                    px: 0.75,
                    borderRadius: 1,
                    border: '1.5px dashed',
                    borderColor: 'divider',
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
                      <Typography variant="caption" sx={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {playerLabel(player)}
                      </Typography>
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
                  <>
                    <PlayerAvatar playerId={coachPlayer.IDJOUEUR} size={30} />
                    <Typography variant="body2" sx={{ fontSize: 11 }}>
                      {playerLabel(coachPlayer)}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                    Cliquer pour sélectionner
                  </Typography>
                )}
              </Box>
            </Tooltip>
          </Box>

          {/* Arbitre slot */}
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Arbitre</Typography>
            <Tooltip title="Cliquer pour sélectionner l'arbitre">
              <Box
                onClick={() => setArbitrePickerOpen(true)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75,
                  height: 44, px: 1, borderRadius: 1,
                  border: '1.5px dashed', borderColor: idarbitreId ? 'secondary.main' : 'divider',
                  bgcolor: 'background.default',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                {idarbitreId ? (
                  <ArbitreInlineDisplay idarbitre={idarbitreId} data={arbitreData} />
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                    Cliquer pour sélectionner
                  </Typography>
                )}
              </Box>
            </Tooltip>
          </Box>

          {saving ? (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">Enregistrement...</Typography>
            </Box>
          ) : null}
        </Stack>
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

      {/* Arbitre picker modal */}
      <Dialog
        open={arbitrePickerOpen}
        onClose={() => setArbitrePickerOpen(false)}
        fullWidth
        maxWidth="xl"
        slotProps={{ paper: { sx: { height: '80vh' } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SportsIcon />
          Sélectionner l'arbitre
          <IconButton
            aria-label="Fermer"
            onClick={() => setArbitrePickerOpen(false)}
            sx={{ ml: 'auto' }}
          >
            ×
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          <ArbitrePage
            variant="modalPicker"
            onOpenInTab={({ rowId }) => void handleArbitreSelect(rowId)}
          />
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
