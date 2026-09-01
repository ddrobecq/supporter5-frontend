import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import HealingRoundedIcon from '@mui/icons-material/HealingRounded';
import ReportRoundedIcon from '@mui/icons-material/ReportRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import SquareRoundedIcon from '@mui/icons-material/SquareRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import TimerRoundedIcon from '@mui/icons-material/TimerRounded';
import { Box, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import type { RencontreHighlightEventRow } from './types';

function formatEventMinute(eventRow: RencontreHighlightEventRow): string {
  const minute = Number(eventRow.MINUTE ?? 0);
  if (!Number.isFinite(minute) || minute <= 0) {
    return '';
  }
  return `${Math.trunc(minute)}'`;
}

function getEventVisual(typeEvent: number): { icon: ReactElement; color: string; backgroundColor: string } {
  if (typeEvent === 1) {
    return {
      icon: <SportsSoccerRoundedIcon fontSize="inherit" />,
      color: '#0f766e',
      backgroundColor: '#ccfbf1',
    };
  }
  if (typeEvent === 2) {
    return {
      icon: <AutorenewRoundedIcon fontSize="inherit" />,
      color: '#1d4ed8',
      backgroundColor: '#dbeafe',
    };
  }
  if (typeEvent === 3) {
    return {
      icon: <SquareRoundedIcon fontSize="inherit" />,
      color: '#eab308',
      backgroundColor: '#fefce8',
    };
  }
  if (typeEvent === 4) {
    return {
      icon: <ReportRoundedIcon fontSize="inherit" />,
      color: '#ea580c',
      backgroundColor: '#ffedd5',
    };
  }
  if (typeEvent === 5) {
    return {
      icon: <SquareRoundedIcon fontSize="inherit" />,
      color: '#dc2626',
      backgroundColor: '#fee2e2',
    };
  }
  if (typeEvent === 6) {
    return {
      icon: <FlagRoundedIcon fontSize="inherit" />,
      color: '#7c3aed',
      backgroundColor: '#ede9fe',
    };
  }
  if (typeEvent === 7) {
    return {
      icon: <TaskAltRoundedIcon fontSize="inherit" />,
      color: '#16a34a',
      backgroundColor: '#dcfce7',
    };
  }
  if (typeEvent === 8) {
    return {
      icon: <CancelRoundedIcon fontSize="inherit" />,
      color: '#b91c1c',
      backgroundColor: '#fee2e2',
    };
  }
  if (typeEvent === 9) {
    return {
      icon: <HealingRoundedIcon fontSize="inherit" />,
      color: '#be185d',
      backgroundColor: '#fce7f3',
    };
  }
  if (typeEvent === 10) {
    return {
      icon: <TimerRoundedIcon fontSize="inherit" />,
      color: '#475569',
      backgroundColor: '#e2e8f0',
    };
  }
  return {
    icon: <FlagRoundedIcon fontSize="inherit" />,
    color: '#4b5563',
    backgroundColor: 'action.hover',
  };
}

function buildEventCardSx(align: 'left' | 'right'): SxProps<Theme> {
  return {
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
    px: 0.75,
    py: 0.5,
    maxWidth: '100%',
    minHeight: 32,
    textAlign: align,
  };
}

export function sortHighlightEvents(events: RencontreHighlightEventRow[]): RencontreHighlightEventRow[] {
  return [...events].sort((a, b) => {
    const minuteA = Number(a.MINUTE ?? 0);
    const minuteB = Number(b.MINUTE ?? 0);
    if (minuteA !== minuteB) {
      return minuteA - minuteB;
    }
    return Number(a.EVCLEUNIK ?? 0) - Number(b.EVCLEUNIK ?? 0);
  });
}

interface BannerChipProps {
  icon: ReactElement;
  color: string;
  backgroundColor: string;
  text: string;
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  /** Trait horizontal de part et d'autre du chip (utilisé pour les marqueurs de période, pas pour le temps additionnel). */
  showDivider?: boolean;
}

/** Bandeau centré pleine largeur (chronomètre) : utilisé pour le temps additionnel et les marqueurs de période. */
function BannerChip({ icon, color, backgroundColor, text, interactive = false, selected = false, onClick, onDoubleClick, showDivider = true }: BannerChipProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }} onClick={onClick} onDoubleClick={onDoubleClick}>
      {showDivider ? <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} /> : null}
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: 'center',
          px: 1.25,
          py: 0.25,
          borderRadius: 999,
          bgcolor: backgroundColor,
          color,
          cursor: interactive ? 'pointer' : 'default',
          outline: selected ? '2px solid' : 'none',
          outlineColor: 'primary.main',
        }}
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', fontSize: 14 }}>{icon}</Box>
        <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{text}</Typography>
      </Stack>
      {showDivider ? <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} /> : null}
    </Box>
  );
}

type TimelineNode =
  | { kind: 'event'; row: RencontreHighlightEventRow }
  | { kind: 'marker'; key: string; label: string };

/**
 * Insere les marqueurs de changement de periode (affichage seul, aucun impact stats) entre les
 * evenements reels, regroupes par PERIODE. Les periodes 3/4 (prolongation) ne sont annoncees par
 * un marqueur que si matchHasExtraTime ; leurs evenements reels restent affiches meme sinon, pour
 * ne jamais faire disparaitre une donnee existante si le match n'est pas correctement renseigne.
 */
function buildTimelineNodes(orderedEvents: RencontreHighlightEventRow[], matchHasExtraTime: boolean): TimelineNode[] {
  const byPeriode = (p: number) => orderedEvents.filter((row) => Number(row.PERIODE ?? 0) === p);
  const nodes: TimelineNode[] = [];
  const pushEvents = (rows: RencontreHighlightEventRow[]) => {
    rows.forEach((row) => nodes.push({ kind: 'event', row }));
  };
  const pushMarker = (key: string, label: string) => {
    nodes.push({ kind: 'marker', key, label });
  };

  pushMarker('marker-debut-match', 'Début du match');
  pushEvents(byPeriode(1));
  pushMarker('marker-mitemps', 'Mi-temps');
  pushEvents(byPeriode(2));

  const prolongEvents = [...byPeriode(3), ...byPeriode(4)];
  if (matchHasExtraTime) {
    pushMarker('marker-fin-reg', 'Fin du temps réglementaire');
    pushEvents(byPeriode(3));
    pushMarker('marker-mitemps-prolong', 'Mi-temps de la prolongation');
    pushEvents(byPeriode(4));
  } else if (prolongEvents.length > 0) {
    pushEvents(prolongEvents);
  }

  pushEvents(byPeriode(5));

  const knownPeriodes = new Set([1, 2, 3, 4, 5]);
  pushEvents(orderedEvents.filter((row) => !knownPeriodes.has(Number(row.PERIODE ?? 0))));

  pushMarker('marker-fin-match', 'Fin du match');
  return nodes;
}

interface RencontreHighlightsTimelineProps {
  events: RencontreHighlightEventRow[];
  loading?: boolean;
  selectedEventId?: number | null;
  onSelectEvent?: (eventId: number | null) => void;
  onEventDoubleClick?: (eventId: number) => void;
  /** Le match a-t-il une prolongation ? Affiche les marqueurs "Fin du temps réglementaire" / "Mi-temps de la prolongation". */
  matchHasExtraTime?: boolean;
}

/** Frise des faits marquants partagee par la fiche rencontre admin et la fiche publique. */
export function RencontreHighlightsTimeline({
  events,
  loading = false,
  selectedEventId = null,
  onSelectEvent,
  onEventDoubleClick,
  matchHasExtraTime = false,
}: RencontreHighlightsTimelineProps) {
  const orderedEvents = sortHighlightEvents(events);
  const interactive = Boolean(onSelectEvent || onEventDoubleClick);

  if (loading) {
    return <Typography variant="body2" color="text.secondary">Chargement des faits marquants...</Typography>;
  }

  if (orderedEvents.length === 0) {
    return <Typography variant="body2" color="text.secondary">Aucun fait marquant pour cette rencontre.</Typography>;
  }

  const nodes = buildTimelineNodes(orderedEvents, matchHasExtraTime);

  return (
    <Stack spacing={0.75}>
      {nodes.map((node) => {
        if (node.kind === 'marker') {
          return (
            <BannerChip
              key={node.key}
              icon={<TimerRoundedIcon fontSize="inherit" />}
              color="#475569"
              backgroundColor="#e2e8f0"
              text={node.label}
            />
          );
        }

        const eventRow = node.row;
        const eventText = eventRow.TEXT || String(eventRow.COMMENT ?? '');
        const visual = getEventVisual(Number(eventRow.TYPE_EVENT ?? 0));
        const minuteText = formatEventMinute(eventRow) || '-';
        const isSelected = selectedEventId === eventRow.EVCLEUNIK;

        // Temps additionnel : fait de match neutre, affiché en bandeau centré plutôt que côté équipe.
        if (Number(eventRow.TYPE_EVENT ?? 0) === 10) {
          return (
            <BannerChip
              key={eventRow.EVCLEUNIK}
              icon={visual.icon}
              color={visual.color}
              backgroundColor={visual.backgroundColor}
              text={eventText}
              interactive={interactive}
              selected={isSelected}
              onClick={() => onSelectEvent?.(isSelected ? null : eventRow.EVCLEUNIK)}
              onDoubleClick={() => onEventDoubleClick?.(eventRow.EVCLEUNIK)}
              showDivider={false}
            />
          );
        }

        const isHomeEvent = eventRow.SIDE === 'home';

        const card = (
          <Box
            sx={{
              ...buildEventCardSx(isHomeEvent ? 'right' : 'left'),
              cursor: interactive ? 'pointer' : 'default',
              outline: isSelected ? '2px solid' : 'none',
              outlineColor: 'primary.main',
            }}
            onClick={() => onSelectEvent?.(isSelected ? null : eventRow.EVCLEUNIK)}
            onDoubleClick={() => onEventDoubleClick?.(eventRow.EVCLEUNIK)}
          >
            <Stack
              direction="row"
              spacing={0.75}
              sx={{
                alignItems: 'center',
                justifyContent: isHomeEvent ? 'flex-end' : 'flex-start',
              }}
            >
              {isHomeEvent ? (
                <>
                  <Typography variant="body2" sx={{ lineHeight: 1.2, overflowWrap: 'anywhere' }}>{eventText}</Typography>
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      minWidth: 18,
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      color: visual.color,
                      bgcolor: visual.backgroundColor,
                    }}
                  >
                    {visual.icon}
                  </Box>
                </>
              ) : (
                <>
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      minWidth: 18,
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      color: visual.color,
                      bgcolor: visual.backgroundColor,
                    }}
                  >
                    {visual.icon}
                  </Box>
                  <Typography variant="body2" sx={{ lineHeight: 1.2, overflowWrap: 'anywhere' }}>{eventText}</Typography>
                </>
              )}
            </Stack>
          </Box>
        );

        return (
          <Box
            key={eventRow.EVCLEUNIK}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0,1fr) 56px minmax(0,1fr)', md: 'minmax(0,1fr) 68px minmax(0,1fr)' },
              columnGap: 0.75,
              alignItems: 'center',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              {isHomeEvent ? card : null}
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {minuteText}
              </Typography>
            </Box>

            <Box sx={{ minWidth: 0 }}>
              {!isHomeEvent ? card : null}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
