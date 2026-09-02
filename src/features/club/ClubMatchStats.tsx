import { Box, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import type { ClubMatchRow } from './types';

interface ClubMatchStatsPanelProps {
  matches: ClubMatchRow[];
  clubId: string;
}

/** Tableau "Matchs / V / N / D / BP / BC / Diff" pour un club sur un ensemble de rencontres. Partage entre les fiches Admin et Public. */
export function ClubMatchStatsPanel({ matches, clubId }: ClubMatchStatsPanelProps) {
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
    return { played: completed.length, wins, draws, losses, goalsFor, goalsAgainst, diff: goalsFor - goalsAgainst };
  }, [matches, clubId]);

  const tiles: { label: string; value: number | string }[] = [
    { label: 'Matchs', value: stats.played },
    { label: 'V', value: stats.wins },
    { label: 'N', value: stats.draws },
    { label: 'D', value: stats.losses },
    { label: 'BP', value: stats.goalsFor },
    { label: 'BC', value: stats.goalsAgainst },
    { label: 'Diff', value: stats.diff > 0 ? `+${stats.diff}` : String(stats.diff) },
  ];

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>STATISTIQUES</Typography>
      <Stack direction="row" spacing={0} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {tiles.map((stat) => (
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
  );
}
