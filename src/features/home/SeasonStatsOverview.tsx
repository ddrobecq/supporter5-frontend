import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import HandshakeRoundedIcon from '@mui/icons-material/HandshakeRounded';
import { Box, Button, Chip, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { useEffect, useState, type ReactNode } from 'react';
import {
  PITCH_SLOTS,
  PitchField,
  PitchPlayerAvatar,
  PitchPlayerMarker,
  PitchSlotShell,
  pitchPlayerLabel,
} from '../../components/PitchField';
import { fetchSaisonClassement, fetchSaisons, type SaisonClassementRow } from '../statistiques/saison/classements/saisonClassementApi';
import { fetchEquipeType, type EquipeTypeResult } from '../statistiques/saison/equipeType/equipeTypeApi';

const TOP_COUNT = 3;

function openStatTab(selection: string): void {
  window.dispatchEvent(new CustomEvent('supporter:tab-open', {
    detail: {
      path: `/admin/statistiques?${selection}`,
      label: 'Statistiques',
      unique: true,
      uniqueByPath: true,
    },
  }));
}

function openJoueurTab(row: { IDJOUEUR: string; NOM?: string | null; SURNOM?: string | null }): void {
  window.dispatchEvent(new CustomEvent('supporter:tab-open', {
    detail: {
      path: `/admin/joueurs/${encodeURIComponent(row.IDJOUEUR)}`,
      label: pitchPlayerLabel(row),
      unique: true,
      uniqueByPath: true,
    },
  }));
}

function TopList({ title, icon, rows, unit, onOpenMore }: {
  title: string;
  icon: ReactNode;
  rows: SaisonClassementRow[];
  unit: string;
  onOpenMore: () => void;
}) {
  return (
    <Stack spacing={0.75} sx={{ minWidth: 160, flex: 1 }}>
      <Typography
        variant="subtitle2"
        onClick={onOpenMore}
        sx={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
      >
        {icon}
        {title}
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="caption" color="text.secondary">Aucune donnée.</Typography>
      ) : rows.map((row, index) => (
        <Stack
          key={row.IDJOUEUR}
          direction="row"
          spacing={1}
          onClick={() => openJoueurTab(row)}
          sx={{ alignItems: 'center', cursor: 'pointer', borderRadius: 1, p: 0.4, '&:hover': { bgcolor: 'action.hover' } }}
        >
          <Typography variant="caption" sx={{ fontWeight: 800, width: 14, color: 'text.secondary' }}>
            {index + 1}
          </Typography>
          <PitchPlayerAvatar playerId={row.IDJOUEUR} size={26} />
          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pitchPlayerLabel(row)}
          </Typography>
          <Chip size="small" label={`${row.VALEUR} ${unit}`} sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
          <Box sx={{ flex: 1 }} />
        </Stack>
      ))}
    </Stack>
  );
}

/** Accueil: apercu des stats de la derniere saison (top buteurs/passeurs + equipe type). */
export function SeasonStatsOverview() {
  const [saison, setSaison] = useState('');
  const [buteurs, setButeurs] = useState<SaisonClassementRow[]>([]);
  const [passeurs, setPasseurs] = useState<SaisonClassementRow[]>([]);
  const [equipeType, setEquipeType] = useState<EquipeTypeResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchSaisons(controller.signal)
      .then((list) => setSaison(list[0] ?? ''))
      .catch(() => setSaison(''));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!saison) return;
    const controller = new AbortController();
    void Promise.all([
      fetchSaisonClassement('buts', saison, controller.signal).then(setButeurs).catch(() => setButeurs([])),
      fetchSaisonClassement('passes', saison, controller.signal).then(setPasseurs).catch(() => setPasseurs([])),
      fetchEquipeType(saison, controller.signal).then(setEquipeType).catch(() => setEquipeType(null)),
    ]);
    return () => controller.abort();
  }, [saison]);

  if (!saison) return null;

  const joueurParPoste = new Map((equipeType?.POSTES ?? []).map((joueur) => [joueur.CODE, joueur]));

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: { xs: 1.5, md: 2 },
        maxWidth: 820,
        bgcolor: '#ffffff',
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <BarChartRoundedIcon sx={{ fontSize: 20 }} />
            Statistiques {saison}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<BarChartRoundedIcon />}
            onClick={() => openStatTab('d=saison&t=temps&s=temps')}
          >
            Détail
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
            <TopList
              title="Meilleurs buteurs"
              icon={<SportsSoccerRoundedIcon sx={{ fontSize: 16 }} />}
              rows={buteurs.slice(0, TOP_COUNT)}
              unit="buts"
              onOpenMore={() => openStatTab('d=saison&t=buts&s=buts')}
            />
            <TopList
              title="Meilleurs passeurs"
              icon={<HandshakeRoundedIcon sx={{ fontSize: 16 }} />}
              rows={passeurs.slice(0, TOP_COUNT)}
              unit="passes"
              onOpenMore={() => openStatTab('d=saison&t=passes&s=passes')}
            />
          </Stack>

          <Stack spacing={0.5} sx={{ width: 390, flexShrink: 0 }}>
            <Stack
              direction="row"
              spacing={0.75}
              onClick={() => openStatTab('d=saison&t=equipe-type&s=equipe-type')}
              sx={{ alignItems: 'center', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Équipe type</Typography>
              {equipeType?.FORMATION ? (
                <Chip size="small" color="primary" label={equipeType.FORMATION} sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
              ) : null}
            </Stack>
            <Box onClick={() => openStatTab('d=saison&t=equipe-type&s=equipe-type')} sx={{ cursor: 'pointer' }}>
              <PitchField>
                {PITCH_SLOTS.filter((slot) => joueurParPoste.has(slot.code)).map((slot) => {
                  const joueur = joueurParPoste.get(slot.code)!;
                  return (
                    <Tooltip key={slot.code} title={`${slot.label} · ${pitchPlayerLabel(joueur)}`}>
                      <PitchSlotShell x={slot.x} y={slot.y} width={68}>
                        <PitchPlayerMarker player={joueur} avatarSize={30} showFlag={false} />
                      </PitchSlotShell>
                    </Tooltip>
                  );
                })}
              </PitchField>
            </Box>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
