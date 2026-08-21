import { Box, Chip, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import {
  PITCH_SLOTS,
  PitchField,
  PitchPlayerAvatar,
  PitchPlayerMarker,
  PitchSlotShell,
  pitchPlayerLabel as joueurLabel,
} from '../../../../components/PitchField';
import { fetchSaisons } from '../classements/saisonClassementApi';
import { fetchEquipeType, fetchEquipeTypeHistorique, type EquipeTypeJoueur, type EquipeTypeResult } from './equipeTypeApi';

function openJoueurTab(joueur: EquipeTypeJoueur): void {
  window.dispatchEvent(new CustomEvent('supporter:tab-open', {
    detail: {
      path: `/admin/joueurs/${encodeURIComponent(joueur.IDJOUEUR)}`,
      label: joueurLabel(joueur),
      unique: true,
      uniqueByPath: true,
    },
  }));
}

function PitchPlayer({ joueur, label, x, y }: { joueur: EquipeTypeJoueur; label: string; x: number; y: number }) {
  return (
    <Tooltip title={`${label} · ${joueur.TITULARISATIONS} titularisations`}>
      <PitchSlotShell x={x} y={y} sx={{ cursor: 'pointer' }} onClick={() => openJoueurTab(joueur)}>
        <PitchPlayerMarker player={joueur} />
      </PitchSlotShell>
    </Tooltip>
  );
}

/** Saison > Equipe type: formation la plus utilisee et joueur type de chaque poste. */
export function EquipeTypeView({ historique = false }: { historique?: boolean } = {}) {
  const [saisons, setSaisons] = useState<string[]>([]);
  const [saison, setSaison] = useState('');
  const [data, setData] = useState<EquipeTypeResult | null>(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(true);
      fetchEquipeTypeHistorique(controller.signal)
        .then(setData)
        .catch(() => setData(null))
        .finally(() => setLoading(false));
      return () => controller.abort();
    }
    if (!saison) return;
    const controller = new AbortController();
    setLoading(true);
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

      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Box sx={{ maxWidth: 420, width: '100%' }}>
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

        {data?.ENTRAINEUR ? (
          <Box sx={{ minWidth: 160 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Entraîneur</Typography>
            <Tooltip title={`${data.ENTRAINEUR.TITULARISATIONS} matchs`}>
              <Stack
                direction="row"
                spacing={1}
                onClick={() => openJoueurTab(data.ENTRAINEUR!)}
                sx={{ alignItems: 'center', p: 1, border: '1.5px solid', borderColor: 'divider', borderRadius: 1.5, cursor: 'pointer' }}
              >
                <PitchPlayerAvatar playerId={data.ENTRAINEUR.IDJOUEUR} size={34} />
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12, minWidth: 0 }}>
                  {joueurLabel(data.ENTRAINEUR)}
                </Typography>
              </Stack>
            </Tooltip>
          </Box>
        ) : null}
      </Stack>
    </Stack>
  );
}
