import { Box, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PieChart } from '@mui/x-charts/PieChart';
import { useMemo } from 'react';
import type { ClubMatchRow } from './types';

interface ClubMatchStatsPanelProps {
  matches: ClubMatchRow[];
  clubId: string;
}

function GoalBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const widthPct = max > 0 ? Math.max(value > 0 ? 4 : 0, (value / max) * 100) : 0;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Typography variant="caption" color="text.secondary" sx={{ width: 96, flexShrink: 0 }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: 10, borderRadius: 5, bgcolor: 'action.hover', overflow: 'hidden' }}>
        <Box sx={{ width: `${widthPct}%`, height: '100%', bgcolor: color, borderRadius: 5 }} />
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 700, width: 24, textAlign: 'right', flexShrink: 0 }}>
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * Stats "Matchs / V / N / D / BP / BC / Diff" pour un club sur un ensemble de rencontres,
 * sous forme de donut V/N/D + barres buts marques/encaisses. Partage entre les fiches
 * Admin et Public (onglet Matches de la fiche Club) et le bloc Accueil "Adversaire du jour".
 */
export function ClubMatchStatsPanel({ matches, clubId }: ClubMatchStatsPanelProps) {
  const theme = useTheme();

  const stats = useMemo(() => {
    const completed = matches.filter((row) => row.ETAT === 2 || row.ETAT === 3);
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    for (const row of completed) {
      const isHome = row.DOMICILE === clubId;
      const gf = isHome ? (row.BUTDOM ?? 0) : (row.BUTEXT ?? 0);
      const gc = isHome ? (row.BUTEXT ?? 0) : (row.BUTDOM ?? 0);
      goalsFor += gf;
      goalsAgainst += gc;
      if (gf > gc) wins += 1;
      else if (gf === gc) draws += 1;
      else losses += 1;
    }
    return { played: completed.length, wins, draws, losses, goalsFor, goalsAgainst };
  }, [matches, clubId]);

  if (stats.played === 0) {
    return (
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
          STATISTIQUES
        </Typography>
        <Typography variant="body2" color="text.secondary">Aucun match joué.</Typography>
      </Box>
    );
  }

  const donutData = [
    { id: 'wins', label: 'Victoires', value: stats.wins, color: theme.palette.success.main },
    { id: 'draws', label: 'Nuls', value: stats.draws, color: theme.palette.grey[500] },
    { id: 'losses', label: 'Défaites', value: stats.losses, color: theme.palette.error.main },
  ].filter((item) => item.value > 0);

  const maxGoals = Math.max(stats.goalsFor, stats.goalsAgainst, 1);
  const diff = stats.goalsFor - stats.goalsAgainst;
  const diffColor = diff > 0 ? 'success.main' : diff < 0 ? 'error.main' : 'text.secondary';

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
        STATISTIQUES
      </Typography>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Box sx={{ position: 'relative', width: 92, height: 92, flexShrink: 0 }}>
          <PieChart
            series={[{
              data: donutData,
              innerRadius: 27,
              outerRadius: 42,
              paddingAngle: 2,
              cornerRadius: 3,
              cx: 46,
              cy: 46,
            }]}
            width={92}
            height={92}
            hideLegend
            slotProps={{ tooltip: { trigger: 'item' } }}
          />
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              {stats.played}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9, lineHeight: 1 }}>
              matchs
            </Typography>
          </Box>
        </Box>

        <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
          {donutData.map((item) => (
            <Stack key={item.id} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                {item.label}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {item.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>

      <Stack spacing={0.75} sx={{ mt: 1.5 }}>
        <GoalBar label="Buts marqués" value={stats.goalsFor} max={maxGoals} color={theme.palette.success.main} />
        <GoalBar label="Buts encaissés" value={stats.goalsAgainst} max={maxGoals} color={theme.palette.error.main} />
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
          <Typography variant="caption" color="text.secondary">Différence</Typography>
          <Typography variant="caption" sx={{ fontWeight: 800, color: diffColor }}>
            {diff > 0 ? `+${diff}` : diff}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
