import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
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
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useEntityImage } from '../../lib/useEntityImage';
import type { HomePageOutletContext, RecentEntityKind, RecentOpenedRecord } from './types';

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

export function HomePage() {
  const { recentOpenedRecords, reopenRecentRecord } = useOutletContext<HomePageOutletContext>();

  return (
    <Box sx={{ minHeight: '55vh' }}>
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
                  onClick={() => reopenRecentRecord(record)}
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
                  <RecentRecordAvatar record={record} />
                </Link>
                <Box sx={{ minWidth: 0 }}>
                  <Link
                    component="button"
                    underline="hover"
                    onClick={() => reopenRecentRecord(record)}
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
    </Box>
  );
}
