import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EastRoundedIcon from '@mui/icons-material/EastRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import HealingRoundedIcon from '@mui/icons-material/HealingRounded';
import ReportRoundedIcon from '@mui/icons-material/ReportRounded';
import SquareRoundedIcon from '@mui/icons-material/SquareRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import { Autocomplete, Box, CircularProgress, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { formatDateShort } from '../../components/DateInputField';
import { MatchDataGrid } from '../../components/MatchDataGrid';
import { buildMatchGridColumns } from '../../components/matchGridColumns';
import { useEntityImage } from '../../lib/useEntityImage';
import { fetchJoueurMatches, fetchJoueurSeasonsByPlayedMatches } from './joueurApi';
import type { JoueurMatchEvent, JoueurMatchRow } from './types';

interface JoueurMatchesTabProps {
  joueurId: string;
  active: boolean;
}

const EVENT_ICONS: Record<JoueurMatchEvent['type'], { icon: React.ReactElement; label: string }> = {
  but:     { icon: <SportsSoccerRoundedIcon sx={{ fontSize: 16, color: 'success.dark' }} />,  label: 'But' },
  passe:   { icon: <SportsSoccerRoundedIcon sx={{ fontSize: 16, color: 'info.main' }} />,     label: 'Passe decisive' },
  entree:  { icon: <EastRoundedIcon sx={{ fontSize: 16, color: 'success.main' }} />,           label: 'Entree' },
  sortie:  { icon: <ArrowBackRoundedIcon sx={{ fontSize: 16, color: 'error.main' }} />,        label: 'Sortie' },
  avertissement: { icon: <SquareRoundedIcon sx={{ fontSize: 16, color: 'warning.main' }} />, label: 'Carton jaune' },
  'second-avertissement': { icon: <ReportRoundedIcon sx={{ fontSize: 16, color: 'warning.dark' }} />, label: 'Second carton jaune' },
  exclusion: { icon: <SquareRoundedIcon sx={{ fontSize: 16, color: 'error.dark' }} />,          label: 'Exclusion' },
  blessure:{ icon: <HealingRoundedIcon sx={{ fontSize: 16, color: 'error.main' }} />,         label: 'Blessure' },
};

function EventIconsCell({ events }: { events: JoueurMatchEvent[] }) {
  if (!events || events.length === 0) return null;
  return (
    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
      {events.map((ev, i) => {
        const cfg = EVENT_ICONS[ev.type];
        if (!cfg) return null;
        const label = cfg.label + (ev.minute > 0 ? ' (' + ev.minute + "')" : '');
        return (
          <Tooltip key={i} title={label} arrow>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'default', lineHeight: 1 }}>
              {cfg.icon}
              {ev.minute > 0 && (
                <Typography sx={{ fontSize: 9, lineHeight: 1, color: 'text.secondary' }}>{ev.minute}&apos;</Typography>
              )}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

function CompetLogoCell({ cocleunik, competNom }: { cocleunik: number; competNom: string }) {
  const { src } = useEntityImage('competition', cocleunik > 0 ? cocleunik : undefined);
  return (
    <Tooltip title={competNom} arrow>
      <Box sx={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {src
          ? <Box component="img" src={src} alt={competNom} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          : <EmojiEventsRoundedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />}
      </Box>
    </Tooltip>
  );
}

export function JoueurMatchesTab({ joueurId, active }: JoueurMatchesTabProps) {
  const [seasons, setSeasons] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [matches, setMatches] = useState<JoueurMatchRow[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const columns = useMemo(() => [
    ...buildMatchGridColumns<JoueurMatchRow>({
      date: {
        enabled: true,
        renderCell: (row) => formatDateShort(row.DATE),
      },
      score: { mode: 'readonly' },
    }),
    {
      field: 'COCLEUNIK',
      headerName: '',
      width: 56,
      minWidth: 56,
      maxWidth: 56,
      align: 'center' as const,
      headerAlign: 'center' as const,
      sortable: false,
      renderCell: (params: { row: JoueurMatchRow }) => (
        <CompetLogoCell cocleunik={params.row.COCLEUNIK} competNom={params.row.COMPET_NOM} />
      ),
    },
    {
      field: 'events',
      headerName: 'Participation',
      flex: 1,
      minWidth: 120,
      sortable: false,
      renderCell: (params: { row: JoueurMatchRow }) => (
        <EventIconsCell events={params.row.events ?? []} />
      ),
    },
  ], []);

  useEffect(() => {
    if (!active) return;
    const loadSeasons = async () => {
      setLoadingSeasons(true);
      try {
        const data = await fetchJoueurSeasonsByPlayedMatches(joueurId);
        setSeasons(data);
        setSelectedSeason((prev) => prev ?? (data[0] ?? null));
      } catch (error) {
        console.error('Erreur chargement saisons:', error);
      } finally {
        setLoadingSeasons(false);
      }
    };
    void loadSeasons();
  }, [joueurId, active]);

  useEffect(() => {
    if (!selectedSeason) { setMatches([]); return; }
    const loadMatches = async () => {
      setLoadingMatches(true);
      try {
        const data = await fetchJoueurMatches(joueurId, selectedSeason);
        setMatches(data);
      } catch (error) {
        console.error('Erreur chargement matches:', error);
        setMatches([]);
      } finally {
        setLoadingMatches(false);
      }
    };
    void loadMatches();
  }, [joueurId, selectedSeason]);

  return (
    <Box sx={{ display: active ? 'block' : 'none' }}>
      <Stack spacing={2}>
        <Autocomplete
          options={seasons}
          value={selectedSeason}
          onChange={(_, value) => setSelectedSeason(value)}
          loading={loadingSeasons}
          size="small"
          renderInput={(params) => <TextField {...params} label="Saison" size="small" />}
        />
        {loadingMatches ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">Chargement des matches...</Typography>
          </Box>
        ) : matches.length === 0 ? (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {selectedSeason ? 'Aucun match trouve pour cette saison.' : 'Selectionnez une saison.'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ height: 400, width: '100%' }}>
            <MatchDataGrid
              rows={matches}
              columns={columns}
              getRowId={(row) => row.RECLEUNIK}
              loading={loadingMatches}
              openMatchOnDoubleClick
              disableRowSelectionOnClick
              density="compact"
              pageSizeOptions={[25, 50]}
            />
          </Box>
        )}
      </Stack>
    </Box>
  );
}