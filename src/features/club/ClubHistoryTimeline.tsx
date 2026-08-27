import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import StadiumRoundedIcon from '@mui/icons-material/StadiumRounded';
import { Typography } from '@mui/material';
import { Timeline, TimelineConnector, TimelineContent, TimelineDot, TimelineItem, TimelineSeparator } from '@mui/lab';
import type { ClubNameHistoryRow, ClubTerrainHistoryRow } from './types';

interface TimelineEvent {
  id: string;
  date: string | null;
  prefix: string;
  name: string;
  kind: 'create' | 'rename' | 'delete' | 'terrain';
}

function formatDate(value: string | null): string {
  if (!value) return 'Date inconnue';
  const match = value.match(/^(\d{4})(?:-(\d{2})-(\d{2})|(\d{2})(\d{2}))$/);
  if (!match) return value;
  const month = Number(match[2] ?? match[4]);
  const day = Number(match[3] ?? match[5]);
  return new Date(Number(match[1]), month - 1, day).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).replace('.', '');
}

function dateKey(value: string | null): string {
  if (!value) return '';
  const match = value.match(/^(\d{4})(?:-(\d{2})-(\d{2})|(\d{2})(\d{2}))$/);
  if (!match) return value;
  return `${match[1]}${match[2] ?? match[4]}${match[3] ?? match[5]}`;
}

export function ClubHistoryTimeline({ names, terrains }: { names: ClubNameHistoryRow[]; terrains: ClubTerrainHistoryRow[] }) {
  const events: TimelineEvent[] = [
    ...names.map((row) => ({
      id: `name-${row.IDCLUB_NOM}`,
      date: row.DATE,
      prefix: Number(row.CN_ACTION) === 3
        ? 'Suppression du nom '
        : Number(row.CN_ACTION) === 2
          ? 'Modification du nom pour '
          : 'Création du club sous le nom de ',
      name: row.CN_NOM,
      kind: Number(row.CN_ACTION) === 3 ? 'delete' as const : Number(row.CN_ACTION) === 2 ? 'rename' as const : 'create' as const,
    })),
    ...terrains.map((row) => ({
      id: `terrain-${row.CT_CLEUNIK}`,
      date: row.DATE,
      prefix: 'Installation au ',
      name: row.STADE,
      kind: 'terrain' as const,
    })),
  ];
  const creation = events.find((event) => event.kind === 'create');
  const hasOlderStadium = Boolean(creation && terrains.some((terrain) => {
    const stadiumDate = dateKey(terrain.DATE);
    const creationDate = dateKey(creation.date);
    return Boolean(stadiumDate && creationDate && stadiumDate < creationDate);
  }));
  events.sort((left, right) => {
    if (!left.date) return 1;
    if (!right.date) return -1;
    return dateKey(right.date).localeCompare(dateKey(left.date));
  });
  if (creation && !hasOlderStadium) {
    const creationIndex = events.indexOf(creation);
    if (creationIndex >= 0) events.push(...events.splice(creationIndex, 1));
  }

  if (events.length === 0) {
    return <Typography color="text.secondary">Aucun historique disponible.</Typography>;
  }

  return (
    <Timeline position="right" sx={{ width: '100%', p: 0, m: 0, textAlign: 'left', [`& .MuiTimelineItem-root`]: { display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', alignItems: 'stretch' }, [`& .MuiTimelineItem-root::before`]: { display: 'none' } }}>
      {events.map((event, index) => (
        <TimelineItem key={event.id}>
          <TimelineSeparator sx={{ gridColumn: 1, gridRow: 1 }}>
            <TimelineDot color={event.kind === 'terrain' ? 'success' : 'primary'}>
            {event.kind === 'create' ? <AddCircleOutlineRoundedIcon sx={{ fontSize: 16 }} /> : null}
            {event.kind === 'rename' ? <EditOutlinedIcon sx={{ fontSize: 16 }} /> : null}
            {event.kind === 'delete' ? <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} /> : null}
            {event.kind === 'terrain' ? <StadiumRoundedIcon sx={{ fontSize: 16 }} /> : null}
            </TimelineDot>
            {index < events.length - 1 ? <TimelineConnector /> : null}
          </TimelineSeparator>
          <TimelineContent sx={{ gridColumn: 2, gridRow: 1, py: 1.25, px: 2, textAlign: 'left' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{formatDate(event.date)}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 400 }}>{event.prefix}<strong style={{ fontWeight: 700 }}>{event.name}</strong></Typography>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
