import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import EuroRoundedIcon from '@mui/icons-material/EuroRounded';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import SportsIcon from '@mui/icons-material/Sports';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import StadiumRoundedIcon from '@mui/icons-material/StadiumRounded';
import {
  Avatar,
  Box,
  IconButton,
  Link,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { fetchClubMatches } from '../club/clubApi';
import type { ClubMatchRow } from '../club/types';
import { supportedClubStore } from '../system/supportedClubStore';
import { fetchRencontreDetailById } from '../rencontre/rencontreApi';
import { useEntityImage } from '../../lib/useEntityImage';
import { formatHeureDisplay } from '../../components/heureUtils';
import { entityPathForPublicMode } from '../../lib/entityNavigation';
import type { HomePageOutletContext, RecentEntityKind, RecentOpenedRecord } from './types';
import { SeasonStatsOverview } from './SeasonStatsOverview';

function resolveEntityIcon(kind: RecentEntityKind): ReactNode {
  switch (kind) {
    case 'joueur':
      return <PersonRoundedIcon sx={{ fontSize: 23 }} />;
    case 'club':
      return <ShieldRoundedIcon sx={{ fontSize: 23 }} />;
    case 'arbitre':
      return <SportsIcon sx={{ fontSize: 23 }} />;
    case 'rencontre':
      return <SportsSoccerRoundedIcon sx={{ fontSize: 23 }} />;
    case 'epreuve':
      return <EmojiEventsIcon sx={{ fontSize: 23 }} />;
    case 'competition':
      return <MilitaryTechIcon sx={{ fontSize: 23 }} />;
    case 'tourdef':
      return <RuleRoundedIcon sx={{ fontSize: 23 }} />;
    case 'natio':
      return <FlagRoundedIcon sx={{ fontSize: 23 }} />;
    case 'ville':
      return <LocationCityRoundedIcon sx={{ fontSize: 23 }} />;
    case 'terrain':
      return <StadiumRoundedIcon sx={{ fontSize: 23 }} />;
    case 'devise':
      return <EuroRoundedIcon sx={{ fontSize: 23 }} />;
    case 'circ':
      return <EventNoteRoundedIcon sx={{ fontSize: 23 }} />;
    default:
      return <CalendarMonthIcon sx={{ fontSize: 23 }} />;
  }
}

function resolveImageEntityType(kind: RecentEntityKind): string | null {
  switch (kind) {
    case 'joueur':
      return 'joueurrg';
    case 'club':
      return 'club';
    case 'arbitre':
      return 'arbitre';
    case 'epreuve':
      return 'epreuve';
    case 'competition':
      return 'competition';
    case 'natio':
      return 'natio';
    default:
      return null;
  }
}

function RecentRecordAvatar({ record }: { record: RecentOpenedRecord }) {
  const imageEntityType = resolveImageEntityType(record.entityKind);
  const { src } = useEntityImage(imageEntityType ?? 'club', imageEntityType ? record.entityId : null);

  return (
    <Avatar
      variant="rounded"
      src={src ?? undefined}
      sx={{
        width: 36,
        height: 36,
        bgcolor: '#e2e8f0',
        color: 'text.secondary',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {!src ? resolveEntityIcon(record.entityKind) : null}
    </Avatar>
  );
}

function resolveDisplayLabel(record: RecentOpenedRecord): string {
  const label = String(record.label ?? '').trim();
  return label || record.entityId;
}

function MatchRecentRecordAvatar({ record }: { record: RecentOpenedRecord }) {
  const [clubIds, setClubIds] = useState<{ domicile: string | null; exterieur: string | null }>({
    domicile: null,
    exterieur: null,
  });
  const { src: domicileLogo } = useEntityImage('club', clubIds.domicile);
  const { src: exterieurLogo } = useEntityImage('club', clubIds.exterieur);

  useEffect(() => {
    let cancelled = false;

    void fetchRencontreDetailById(record.entityId)
      .then((detail) => {
        if (cancelled) return;
        setClubIds({
          domicile: String(detail.DOMICILE ?? '').trim() || null,
          exterieur: String(detail.EXTERIEUR ?? '').trim() || null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setClubIds({ domicile: null, exterieur: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [record.entityId]);

  return (
    <Box
      sx={{
        width: 36,
        height: 36,
        position: 'relative',
      }}
    >
      <Avatar
        src={domicileLogo ?? undefined}
        sx={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: 22,
          height: 22,
          bgcolor: '#e2e8f0',
          color: 'text.secondary',
          border: '1px solid',
          borderColor: 'divider',
          zIndex: 2,
        }}
      >
        {!domicileLogo ? <ShieldRoundedIcon sx={{ fontSize: 14 }} /> : null}
      </Avatar>

      <Avatar
        src={exterieurLogo ?? undefined}
        sx={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 22,
          height: 22,
          bgcolor: '#e2e8f0',
          color: 'text.secondary',
          border: '1px solid',
          borderColor: 'divider',
          zIndex: 1,
        }}
      >
        {!exterieurLogo ? <ShieldRoundedIcon sx={{ fontSize: 14 }} /> : null}
      </Avatar>
    </Box>
  );
}

function parseCompactDate(value: string): Date | null {
  const match = String(value ?? '').trim().match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMatchDate(value: string): string {
  const date = parseCompactDate(value);
  if (!date) return value;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '');
}

function matchTimeValue(row: ClubMatchRow): number {
  const date = parseCompactDate(row.DATE);
  if (!date) return Number.MAX_SAFE_INTEGER;
  const digits = String(row.HEURE ?? '').replace(/\D/g, '');
  const hours = Number(digits.slice(0, 2) || 0);
  const minutes = Number(digits.slice(2, 4) || 0);
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

function isPlayedMatch(row: ClubMatchRow, now: Date): boolean {
  if (Number(row.ETAT) === 3) return true;
  const date = parseCompactDate(row.DATE);
  return Boolean(date && date < new Date(now.getFullYear(), now.getMonth(), now.getDate()) && Number(row.ETAT) !== 5);
}

function openMatch(row: ClubMatchRow, publicMode: boolean, navigate: (path: string) => void): void {
  const path = entityPathForPublicMode('rencontre', row.RECLEUNIK);

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

function ClubCalendarMatchCard({ row, isNext, publicMode }: { row: ClubMatchRow; isNext: boolean; publicMode: boolean }) {
  const navigate = useNavigate();
  const { src: domicileLogo } = useEntityImage('club', row.DOMICILE);
  const { src: exterieurLogo } = useEntityImage('club', row.EXTERIEUR);
  const { src: competitionLogo } = useEntityImage('competition', row.COCLEUNIK);
  const played = isPlayedMatch(row, new Date());
  const circumstanceLabel = [String(row.CIRC ?? '').trim(), String(row.TOUR_NOM ?? '').trim()]
    .filter(Boolean)
    .join(' de ');

  return (
    <Link
      component="button"
      underline="none"
      onClick={() => openMatch(row, publicMode, navigate)}
      sx={{
        flex: '0 0 250px',
        minWidth: 250,
        textAlign: 'left',
        color: 'text.primary',
        border: isNext ? '2px solid' : '1px solid',
        borderColor: isNext ? 'primary.main' : '#cbd5e1',
        borderRadius: 1.25,
        bgcolor: isNext ? '#eef6ff' : '#f8fafc',
        boxShadow: isNext ? '0 2px 8px rgba(37, 99, 235, 0.14)' : '0 1px 3px rgba(15, 23, 42, 0.08)',
        p: 1.25,
        '&:hover': { bgcolor: isNext ? '#e5f0ff' : '#f1f5f9' },
      }}
    >
      <Stack spacing={0.7}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {formatMatchDate(row.DATE)}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            {competitionLogo ? <Box component="img" src={competitionLogo} alt="" sx={{ width: 18, height: 18, objectFit: 'contain' }} /> : null}
            <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.COMPET_NOM}
            </Typography>
          </Stack>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {played
            ? (circumstanceLabel || row.CIRC_COMPLET)
            : `${circumstanceLabel ? `${circumstanceLabel}` : ''}`}
        </Typography>
        <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', justifyContent: 'center' }}>
          <Box component="img" src={domicileLogo ?? undefined} alt="" sx={{ width: 28, height: 28, objectFit: 'contain' }} />
          <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center', minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.DOMICILE_NOM}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 800, flexShrink: 0 }}>
            {played ? `${row.BUTDOM} - ${row.BUTEXT}` : '·'}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center', minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.EXTERIEUR_NOM}
          </Typography>
          <Box component="img" src={exterieurLogo ?? undefined} alt="" sx={{ width: 28, height: 28, objectFit: 'contain' }} />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {played
            ? (circumstanceLabel || row.CIRC_COMPLET)
            : `${formatHeureDisplay(row.HEURE) + ' · ' || ''}${row.TERRAIN_NOM || 'Stade non défini'}`}
        </Typography>
      </Stack>
    </Link>
  );
}

function SupportedClubCalendar({ clubId, clubName, publicMode }: { clubId: string; clubName: string; publicMode: boolean }) {
  const [matches, setMatches] = useState<ClubMatchRow[]>([]);
  const nextMatchRef = useRef<HTMLDivElement | null>(null);
  const calendarScrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchClubMatches(clubId)
      .then((rows) => {
        if (!cancelled) setMatches(rows);
      })
      .catch(() => {
        if (!cancelled) setMatches([]);
      });
    return () => { cancelled = true; };
  }, [clubId]);

  const now = new Date();
  const ordered = [...matches].sort((left, right) => matchTimeValue(left) - matchTimeValue(right));
  const seasonGroups = new Map<string, ClubMatchRow[]>();
  ordered.forEach((match) => {
    const season = String(match.SAISON ?? '').trim() || 'Saison';
    seasonGroups.set(season, [...(seasonGroups.get(season) ?? []), match]);
  });
  const currentSeason = [...seasonGroups.entries()].find(([, rows]) => {
    const first = parseCompactDate(rows[0]?.DATE ?? '');
    const last = parseCompactDate(rows[rows.length - 1]?.DATE ?? '');
    return Boolean(first && last && first <= now && now <= last);
  });
  const currentSeasonKey = currentSeason?.[0] ?? '';
  const seasonRows = currentSeason?.[1] ?? ordered;
  const nextIndex = seasonRows.findIndex((row) => !isPlayedMatch(row, now));
  useEffect(() => {
    if (currentSeasonKey && nextIndex >= 0) {
      window.requestAnimationFrame(() => nextMatchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }));
      return;
    }
  }, [currentSeasonKey, nextIndex, seasonRows.length]);

  const scrollMatches = (direction: -1 | 1) => {
    calendarScrollerRef.current?.scrollBy({ left: direction * 270, behavior: 'smooth' });
  };

  const scrollToNextMatch = () => {
    nextMatchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

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
      <Stack spacing={1}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <CalendarMonthIcon sx={{ fontSize: 20 }} />
            Calendrier de {clubName}
          </Typography>
          <Stack direction="row" spacing={0.1}>
            <Tooltip title="Rencontres précédentes">
              <IconButton size="small" aria-label="Rencontres précédentes" onClick={() => scrollMatches(-1)}>
                <ChevronLeftRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Revenir au prochain match">
              <IconButton size="small" aria-label="Revenir au prochain match" onClick={scrollToNextMatch}>
                <EventAvailableRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Rencontres suivantes">
              <IconButton size="small" aria-label="Rencontres suivantes" onClick={() => scrollMatches(1)}>
                <ChevronRightRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        {seasonRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Aucun match à afficher.</Typography>
        ) : (
          <Box
            ref={calendarScrollerRef}
            onWheel={(event) => {
              if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                event.currentTarget.scrollLeft += event.deltaY;
              }
            }}
            sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', overflowY: 'hidden', pb: 0.75, px: 0.25, '&::-webkit-scrollbar': { height: 8 } }}
          >
            {seasonRows.map((row) => (
              <Box key={row.RECLEUNIK} ref={row.RECLEUNIK === seasonRows[nextIndex]?.RECLEUNIK ? nextMatchRef : undefined} sx={{ display: 'flex', flex: '0 0 250px' }}>
                <ClubCalendarMatchCard row={row} isNext={Boolean(currentSeason && nextIndex >= 0 && row.RECLEUNIK === seasonRows[nextIndex]?.RECLEUNIK)} publicMode={publicMode} />
              </Box>
            ))}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

export function HomePage({ publicMode = false }: { publicMode?: boolean }) {
  const outletContext = useOutletContext<HomePageOutletContext | null>();
  const recentOpenedRecords = outletContext?.recentOpenedRecords ?? [];
  const reopenRecentRecord = outletContext?.reopenRecentRecord;
  const supportedClubId = supportedClubStore((state) => state.clubId);
  const supportedClubName = supportedClubStore((state) => state.clubName);
  const loadSupportedClub = supportedClubStore((state) => state.load);

  useEffect(() => {
    void loadSupportedClub();
  }, [loadSupportedClub]);

  return (
    <Box sx={{ minHeight: '55vh', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {!publicMode ? (
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
        <Stack spacing={0.5}>
          <Typography variant="h6" sx={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <HistoryRoundedIcon sx={{ fontSize: 20 }} />
            Dernieres fiches ouvertes
          </Typography>
        </Stack>

        {recentOpenedRecords.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Aucune fiche ouverte pour le moment.
          </Typography>
        ) : (
          <Stack spacing={0.45} sx={{ mt: 1.25 }}>
            {recentOpenedRecords.slice(0, 10).map((record) => (
              <Box
                key={record.path}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'auto minmax(0, 1fr)',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 0.75,
                  py: 0.45,
                  borderRadius: 1.25,
                  '&:hover': { bgcolor: '#f8fafc' },
                }}
              >
                <Link
                  component="button"
                  underline="none"
                  onClick={() => reopenRecentRecord?.(record)}
                  aria-label={`Rouvrir ${resolveDisplayLabel(record)}`}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 0,
                    minWidth: 0,
                    border: 'none',
                    bgcolor: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {record.entityKind === 'rencontre'
                    ? <MatchRecentRecordAvatar record={record} />
                    : <RecentRecordAvatar record={record} />}
                </Link>
                <Box sx={{ minWidth: 0 }}>
                  <Link
                    component="button"
                    underline="hover"
                    onClick={() => reopenRecentRecord?.(record)}
                    sx={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      lineHeight: 1.2,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: 'text.primary',
                    }}
                  >
                    {resolveDisplayLabel(record)}
                  </Link>
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
      ) : null}
      <SupportedClubCalendar clubId={supportedClubId} clubName={supportedClubName} publicMode={publicMode} />
      <SeasonStatsOverview publicMode={publicMode} />
    </Box>
  );
}
