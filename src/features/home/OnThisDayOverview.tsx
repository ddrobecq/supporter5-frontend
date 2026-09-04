import CakeRoundedIcon from '@mui/icons-material/CakeRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import { Box, Link, Paper, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEntityImage } from '../../lib/useEntityImage';
import { formatHeureDisplay } from '../../components/heureUtils';
import { entityPath, entityPathForPublicMode } from '../../lib/entityNavigation';
import { fetchOnThisDayMatch } from '../rencontre/rencontreApi';
import type { OnThisDayMatchRow } from '../rencontre/types';

function parseCompactDate(value: string): Date | null {
  const match = String(value ?? '').trim().match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMatchScore(match: OnThisDayMatchRow): string {
  const hasPenalties = match.TABDOM > 0 || match.TABEXT > 0;
  if (hasPenalties) {
    return `${match.TABDOM} ${match.BUTDOM}-${match.BUTEXT} ${match.TABEXT}`;
  }
  return `${match.BUTDOM}-${match.BUTEXT}`;
}

function formatAnniversaryLabel(match: OnThisDayMatchRow): string {
  const years = match.YEARS_AGO;
  const suffix = years <= 1 ? 'an' : 'ans';
  const label = `Il y a ${years} ${suffix}`;
  return match.DAYS_OFFSET === 0 ? `${label}, jour pour jour` : label;
}

function ClubCrest({ clubId }: { clubId: string }) {
  const { src } = useEntityImage('club', clubId);
  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {src ? (
        <Box component="img" src={src} alt="" sx={{ width: 40, height: 40, objectFit: 'contain' }} />
      ) : (
        <ShieldRoundedIcon sx={{ fontSize: 32, color: 'action.disabled' }} />
      )}
    </Box>
  );
}

function openOnThisDayMatch(match: OnThisDayMatchRow, publicMode: boolean, navigate: (path: string) => void): void {
  const path = publicMode
    ? entityPathForPublicMode('rencontre', match.RECLEUNIK)
    : entityPath('rencontre', match.RECLEUNIK, '/admin/home');

  if (publicMode) {
    navigate(path);
    return;
  }

  window.dispatchEvent(new CustomEvent('supporter:tab-open', {
    detail: {
      path,
      label: `${match.DOMICILE_NOM} - ${match.EXTERIEUR_NOM}`,
      unique: true,
      uniqueByPath: true,
    },
  }));
}

/** Accueil : match du club soutenu ayant été joué le même jour (dd/mm) dans le passé. */
export function OnThisDayOverview({ publicMode = false }: { publicMode?: boolean }) {
  const navigate = useNavigate();
  const [match, setMatch] = useState<OnThisDayMatchRow | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchOnThisDayMatch(controller.signal)
      .then(setMatch)
      .catch(() => setMatch(null))
      .finally(() => setLoaded(true));
    return () => controller.abort();
  }, []);

  if (!loaded || !match) return null;

  const matchDate = parseCompactDate(match.DATE);
  const dateLabel = matchDate
    ? matchDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';
  const infoParts = [dateLabel, formatHeureDisplay(match.HEURE), match.TERRAIN_NOM].filter(Boolean);

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
        onClick={() => openOnThisDayMatch(match, publicMode, navigate)}
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
              <CakeRoundedIcon sx={{ fontSize: 20 }} />
              Zoom sur...
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {formatAnniversaryLabel(match)}
            </Typography>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            {match.CIRC_COMPLET}
          </Typography>

          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', justifyContent: 'center' }}>
            <ClubCrest clubId={match.DOMICILE} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, textAlign: 'right', minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {match.DOMICILE_NOM}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, flexShrink: 0, px: 0.5 }}>
              {formatMatchScore(match)}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, textAlign: 'left', minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {match.EXTERIEUR_NOM}
            </Typography>
            <ClubCrest clubId={match.EXTERIEUR} />
          </Stack>

          {infoParts.length > 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              {infoParts.join(' · ')}
            </Typography>
          ) : null}

          {match.RESUME ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 0.5,
                lineHeight: 1.45,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {match.RESUME}
            </Typography>
          ) : null}
        </Stack>
      </Link>
    </Paper>
  );
}
