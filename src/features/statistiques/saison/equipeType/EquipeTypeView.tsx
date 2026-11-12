import { Box, Chip, MenuItem, Stack, TextField, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { NatioFlag } from '../../../../components/NatioFlag';
import {
  PitchField,
  PitchPlayerAvatar,
  PitchPlayerMarker,
  PitchSlotShell,
} from '../../../../components/PitchField';
import { PITCH_SLOTS, pitchPlayerLabel as joueurLabel } from '../../../../components/pitchSlots';
import { fetchSaisons } from '../classements/saisonClassementApi';
import { fetchEquipeType, fetchEquipeTypeHistorique, type EquipeTypeJoueur, type EquipeTypeResult } from './equipeTypeApi';
import { emitTabOpen } from '../../../../lib/useTabMetaEvents';
import { containerButtonResetSx } from '../../../../theme/buttonResetSx';
import { useDepsChanged } from '../../../../lib/useDepsChanged';

function openJoueurTab(joueur: EquipeTypeJoueur): void {
  emitTabOpen(`/admin/joueurs/${encodeURIComponent(joueur.IDJOUEUR)}`, joueurLabel(joueur));
}

/** Nom complet (prenom + nom) pour l'affichage de l'entraineur. */
function entraineurLabel(joueur: EquipeTypeJoueur): string {
  return [joueur.PRENOM?.trim(), joueur.NOM?.trim()].filter(Boolean).join(' ') || joueurLabel(joueur);
}

function EntraineurCard({ joueur, sx }: { joueur: EquipeTypeJoueur; sx?: object }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', ...sx }}>
      <Tooltip title={`${joueur.TITULARISATIONS} matchs`}>
        <Stack
          direction="row"
          spacing={1}
          component="button"
          type="button"
          onClick={() => openJoueurTab(joueur)}
          sx={{ ...containerButtonResetSx, alignItems: 'center', p: 1, border: '1.5px solid', borderColor: 'divider', borderRadius: 1.5, cursor: 'pointer', flex: 1, minWidth: 0 }}
        >
          <PitchPlayerAvatar playerId={joueur.IDJOUEUR} size={34} />
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, minWidth: 0, flex: 1 }}>
            {entraineurLabel(joueur)}
          </Typography>
          {joueur.IDNATIO?.trim() ? <NatioFlag idnatio={joueur.IDNATIO} /> : null}
        </Stack>
      </Tooltip>
    </Stack>
  );
}

function PitchPlayer({ joueur, label, x, y }: { joueur: EquipeTypeJoueur; label: string; x: number; y: number }) {
  return (
    <Tooltip title={`${label} · ${joueur.TITULARISATIONS} titularisations`}>
      <PitchSlotShell component="button" {...{ type: 'button' }} x={x} y={y} sx={{ ...containerButtonResetSx, cursor: 'pointer' }} onClick={() => openJoueurTab(joueur)}>
        <PitchPlayerMarker player={joueur} />
      </PitchSlotShell>
    </Tooltip>
  );
}

/** Saison > Equipe type: formation la plus utilisee et joueur type de chaque poste. */
export function EquipeTypeView({ historique = false }: { historique?: boolean } = {}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [saisons, setSaisons] = useState<string[]>([]);
  const [saison, setSaison] = useState('');
  const [data, setData] = useState<EquipeTypeResult | null>(null);
  const [loading, setLoading] = useState(true);

  // A (re)load starts: flag it while rendering, on the same dependencies as the fetch effect below.
  const loadDepsChanged = useDepsChanged([historique, saison]);
  if (loadDepsChanged && (historique || saison) && !loading) {
    setLoading(true);
  }

  useEffect(() => {
    if (historique) return;
    const controller = new AbortController();
    fetchSaisons(controller.signal)
      .then((list) => {
        setSaisons(list);
        setSaison((current) => current || list[0] || '');
      })
      .catch(() => setSaisons([]));
    return () => controller.abort();
  }, [historique]);

  useEffect(() => {
    if (historique) {
      const controller = new AbortController();
      fetchEquipeTypeHistorique(controller.signal)
        .then(setData)
        .catch(() => setData(null))
        .finally(() => setLoading(false));
      return () => controller.abort();
    }
    if (!saison) return;
    const controller = new AbortController();
    fetchEquipeType(saison, controller.signal)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [historique, saison]);

  const joueurParPoste = useMemo(
    () => new Map((data?.POSTES ?? []).map((joueur) => [joueur.CODE, joueur])),
    [data],
  );

  return (
    <Stack spacing={1.5} sx={{ height: '100%', minHeight: 0 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        {historique ? null : (
          <TextField
            select
            size="small"
            label="Saison"
            value={saison}
            onChange={(event) => setSaison(event.target.value)}
            sx={{ minWidth: 160 }}
          >
            {saisons.map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>
        )}
        {data && data.FORMATION ? (
          <>
            <Typography variant="body2" color="text.secondary">
              Schéma le plus utilisé :
            </Typography>
            <Chip size="small" color="primary" label={data.FORMATION} sx={{ fontWeight: 700 }} />
          </>
        ) : null}
      </Stack>

      {!loading && data && data.POSTES.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {historique ? 'Aucune composition disponible.' : 'Aucune composition disponible pour cette saison.'}
        </Typography>
      ) : null}

      <Stack
        direction="column"
        spacing={2}
        sx={{ alignItems: 'stretch', flex: 1, minHeight: 0, overflow: 'auto' }}
      >
        {data?.ENTRAINEUR ? (
          <EntraineurCard joueur={data.ENTRAINEUR} sx={{ width: '100%', maxWidth: isMobile ? 'none' : 420 }} />
        ) : null}

        <Box sx={{ maxWidth: isMobile ? 'none' : 420, width: '100%' }}>
          <PitchField>
            {PITCH_SLOTS.filter((slot) => joueurParPoste.has(slot.code)).map((slot) => (
              <PitchPlayer
                key={slot.code}
                joueur={joueurParPoste.get(slot.code)!}
                label={slot.label}
                x={slot.x}
                y={slot.y}
              />
            ))}
          </PitchField>
        </Box>
      </Stack>
    </Stack>
  );
}
