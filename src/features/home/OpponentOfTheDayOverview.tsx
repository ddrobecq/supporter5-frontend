import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import { Box, Link, Paper, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEntityImage } from '../../lib/useEntityImage';
import { formatHeureDisplay } from '../../components/heureUtils';
import { formatDateShort } from '../../components/DateInputField';
import { entityPath, entityPathForPublicMode } from '../../lib/entityNavigation';
import { fetchClubMatches } from '../club/clubApi';
import { ClubMatchStatsPanel } from '../club/ClubMatchStats';
import type { ClubMatchRow } from '../club/types';

function parseCompactDate(value: string): Date | null {
  const match = String(value ?? '').trim().match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Match "reel" (hors bye/forfait technique ETAT 4/5) programme ou joue aujourd'hui. */
function isTodayMatch(row: ClubMatchRow, now: Date): boolean {
  const etat = Number(row.ETAT);
  if (etat === 4 || etat === 5) return false;
  const date = parseCompactDate(row.DATE);
  return Boolean(date && isSameDay(date, now));
}

function formatMatchScore(row: ClubMatchRow): string {
  const hasPenalties = row.TABDOM > 0 || row.TABEXT > 0;
  if (hasPenalties) {
    return `${row.TABDOM} ${row.BUTDOM}-${row.BUTEXT} ${row.TABEXT}`;
  }
  return `${row.BUTDOM}-${row.BUTEXT}`;
}

function matchDateValue(row: ClubMatchRow): number {
  return parseCompactDate(row.DATE)?.getTime() ?? 0;
}

function ClubCrest({ clubId, size = 40 }: { clubId: string; size?: number }) {
  const { src } = useEntityImage('club', clubId);
  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {src ? (
        <Box component="img" src={src} alt="" sx={{ width: size, height: size, objectFit: 'contain' }} />
      ) : (
        <ShieldRoundedIcon sx={{ fontSize: size * 0.8, color: 'action.disabled' }} />
      )}
    </Box>
  );
}

function CompetitionLogo({ competitionId, size = 18 }: { competitionId: number | null | undefined; size?: number }) {
  const { src } = useEntityImage('competition', competitionId ?? null);
  if (!src) return null;
  return <Box component="img" src={src} alt="" sx={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />;
}

function openOpponentClub(opponentId: string, opponentName: string, publicMode: boolean, navigate: (path: string) => void): void {
  const path = publicMode
    ? entityPathForPublicMode('club', opponentId)
    : entityPath('club', opponentId, '/admin/home');

  if (publicMode) {
    navigate(path);
    return;
  }

  window.dispatchEvent(new CustomEvent('supporter:tab-open', {
    detail: {
      path,
      label: opponentName,
      unique: true,
      uniqueByPath: true,
    },
  }));
}

function openMatch(row: ClubMatchRow, publicMode: boolean, navigate: (path: string) => void): void {
  const path = publicMode
    ? entityPathForPublicMode('rencontre', row.RECLEUNIK)
    : entityPath('rencontre', row.RECLEUNIK, '/admin/home');

  if (publicMode) {
    navigate(path);
    return;
  }

  window.dispatchEvent(new CustomEvent('supporter:tab-open', {
    detail: {
      path,
      label: `${row.DOMICILE_NOM} - ${row.EXTERIEUR_NOM}`,
      unique: true,
      uniqueByPath: true,
    },
  }));
}

function ConfrontationRow({ row, publicMode, navigate }: { row: ClubMatchRow; publicMode: boolean; navigate: (path: string) => void }) {
  return (
    <Link
      component="button"
      underline="none"
      onClick={() => openMatch(row, publicMode, navigate)}
      sx={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        color: 'text.primary',
        borderRadius: 1,
        px: 0.5,
        py: 0.25,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '82px 20px 44px 20px minmax(0, 1fr)',
          alignItems: 'center',
          columnGap: 0.75,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {formatDateShort(row.DATE)}
        </Typography>
        <ClubCrest clubId={row.DOMICILE} size={20} />
        <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>
          {formatMatchScore(row)}
        </Typography>
        <ClubCrest clubId={row.EXTERIEUR} size={20} />
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <CompetitionLogo competitionId={row.COCLEUNIK} size={14} />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {row.CIRC_COMPLET}
          </Typography>
        </Stack>
      </Box>
    </Link>
  );
}

/**
 * Accueil : match du club soutenu ayant lieu (ou ayant eu lieu) aujourd'hui, avec les stats des
 * confrontations historiques face a cet adversaire. Le bloc n'apparait que les jours de match et
 * pointe entierement vers la fiche du club adverse.
 */
export function OpponentOfTheDayOverview({ clubId, publicMode = false }: { clubId: string; publicMode?: boolean }) {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<ClubMatchRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!clubId) return;

    const controller = new AbortController();
    fetchClubMatches(clubId, controller.signal)
      .then(setMatches)
      .catch(() => setMatches([]))
      .finally(() => setLoaded(true));
    return () => controller.abort();
  }, [clubId]);

  const todayMatch = useMemo(() => {
    const now = new Date();
    return matches.find((row) => isTodayMatch(row, now)) ?? null;
  }, [matches]);

  const opponent = useMemo(() => {
    if (!todayMatch) return null;
    const isHome = todayMatch.DOMICILE === clubId;
    return {
      id: isHome ? todayMatch.EXTERIEUR : todayMatch.DOMICILE,
      name: isHome ? todayMatch.EXTERIEUR_NOM : todayMatch.DOMICILE_NOM,
    };
  }, [todayMatch, clubId]);

  const headToHeadMatches = useMemo(() => {
    if (!opponent) return [];
    return matches.filter((row) => row.DOMICILE === opponent.id || row.EXTERIEUR === opponent.id);
  }, [matches, opponent]);

  const lastConfrontations = useMemo(() => {
    if (!todayMatch) return [];
    return headToHeadMatches
      .filter((row) => (row.ETAT === 2 || row.ETAT === 3) && row.RECLEUNIK !== todayMatch.RECLEUNIK)
      .sort((a, b) => matchDateValue(b) - matchDateValue(a))
      .slice(0, 4);
  }, [headToHeadMatches, todayMatch]);

  if (!loaded || !todayMatch || !opponent) return null;

  const played = todayMatch.ETAT === 2 || todayMatch.ETAT === 3;
  const infoParts = [formatHeureDisplay(todayMatch.HEURE), todayMatch.TERRAIN_NOM].filter(Boolean);

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        width: '100%',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Link
        component="button"
        underline="none"
        onClick={() => openOpponentClub(opponent.id, opponent.name, publicMode, navigate)}
        sx={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          color: 'text.primary',
          p: { xs: 1.5, md: 2 },
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Stack spacing={1}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <SportsSoccerRoundedIcon sx={{ fontSize: 20 }} />
              Adversaire du jour
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              Aujourd&apos;hui
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
            <CompetitionLogo competitionId={todayMatch.COCLEUNIK} size={16} />
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              {todayMatch.CIRC_COMPLET}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', justifyContent: 'center' }}>
            <ClubCrest clubId={todayMatch.DOMICILE} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, textAlign: 'right', minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {todayMatch.DOMICILE_NOM}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, flexShrink: 0, px: 0.5 }}>
              {played ? formatMatchScore(todayMatch) : '-vs-'}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, textAlign: 'left', minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {todayMatch.EXTERIEUR_NOM}
            </Typography>
            <ClubCrest clubId={todayMatch.EXTERIEUR} />
          </Stack>

          {infoParts.length > 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              {infoParts.join(' · ')}
            </Typography>
          ) : null}

          <Box sx={{ pt: 0.5 }}>
            <ClubMatchStatsPanel matches={headToHeadMatches} clubId={clubId} />
          </Box>
        </Stack>
      </Link>

      {lastConfrontations.length > 0 ? (
        <Box sx={{ px: { xs: 1.5, md: 2 }, pb: { xs: 1.5, md: 2 } }}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              DERNIÈRES CONFRONTATIONS
            </Typography>
            <Stack spacing={0.25}>
              {lastConfrontations.map((row) => (
                <ConfrontationRow key={row.RECLEUNIK} row={row} publicMode={publicMode} navigate={navigate} />
              ))}
            </Stack>
          </Box>
        </Box>
      ) : null}
    </Paper>
  );
}
