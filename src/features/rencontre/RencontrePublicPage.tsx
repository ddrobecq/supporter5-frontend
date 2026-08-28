import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import SportsIcon from '@mui/icons-material/Sports';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import { Alert, Box, Card, CardContent, Stack, Tab, Tabs, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArbitreIdentityDisplay } from '../../components/ArbitreIdentityDisplay';
import { formatDateShort } from '../../components/DateInputField';
import { MatchDataGrid } from '../../components/MatchDataGrid';
import { buildMatchGridColumns } from '../../components/matchGridColumns';
import { PitchField, PitchPlayerAvatar, PitchPlayerMarker, PitchSlotShell, PITCH_SLOTS } from '../../components/PitchField';
import { PublicLoadingState } from '../../components/PublicPageState';
import { StructuredData } from '../../components/StructuredData';
import { useEntityImage } from '../../lib/useEntityImage';
import { useSeoMeta } from '../../lib/useSeoMeta';
import { formatInteger } from '../../lib/formatNumber';
import { http } from '../../lib/http';
import { env } from '../../config/env';
import { entityPathForPublicMode } from '../../lib/entityNavigation';
import type { TourParticipantRow } from '../competition/types';
import { BENCH_SLOT_SX, BenchPlayerLabel, CoachInlineDisplay } from './RencontreCompositionTab';
import { RencontreHighlightsTimeline } from './RencontreHighlightsTimeline';
import { fetchRencontreComposition, fetchRencontreDetailById, fetchRencontreHighlightsById, fetchRencontreSquad, fetchRencontreTourMatches } from './rencontreApi';
import type { CompositionMap, RencontreDetailRow, RencontreHighlightsRow, SquadPlayerRow, TourMatchWithNamesRow } from './types';

const REMP_CODES = ['REMP1', 'REMP2', 'REMP3', 'REMP4', 'REMP5', 'REMP6', 'REMP7', 'REMP8', 'REMP9', 'REMP10', 'REMP11'] as const;

function formatTime(value: string | null): string {
  const text = String(value ?? '').trim();
  const digits = text.replace(/\D/g, '');
  return /^\d{4}$/.test(digits) ? `${digits.slice(0, 2)}h${digits.slice(2)}` : text;
}

function formatScore(detail: RencontreDetailRow): string {
  if ([1, 5].includes(Number(detail.ETAT))) return '-vs-';
  if (Number(detail.ETAT) === 4) return 'Non jouée';
  const penalties = Number(detail.TABDOM ?? 0) > 0 || Number(detail.TABEXT ?? 0) > 0;
  return penalties ? `${detail.TABDOM} ${detail.BUTDOM} - ${detail.BUTEXT} ${detail.TABEXT}` : `${detail.BUTDOM} - ${detail.BUTEXT}`;
}

/** "1ere journee de Ligue 1" quand la circonstance est connue, sinon le seul nom du tour. */
function formatCompetitionLabel(detail: RencontreDetailRow): string {
  if (Number(detail.TUCLEUNIK) === 0) return 'Match Amical';
  const tour = String(detail.TOUR_NOM ?? '').trim() || 'Rencontre';
  const circ = String(detail.CIRC ?? '').trim();
  return circ ? `${circ} de ${tour}` : tour;
}

function ClubHeader({ id, name, align, onClick }: { id: string; name: string; align: 'left' | 'right'; onClick?: () => void }) {
  const { src } = useEntityImage('club', id);
  return <Stack component={onClick ? 'button' : 'div'} type={onClick ? 'button' : undefined} onClick={onClick} spacing={0.75} sx={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start', minWidth: 0, flex: 1, border: 0, p: 0, bgcolor: 'transparent', color: 'inherit', cursor: onClick ? 'pointer' : 'default', '&:hover': onClick ? { textDecoration: 'underline' } : undefined }}><Box sx={{ width: 84, height: 84, display: 'grid', placeItems: 'center' }}>{src ? <Box component="img" src={src} alt={name} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <SportsSoccerRoundedIcon sx={{ fontSize: 56, color: 'text.disabled' }} />}</Box><Typography variant="h6" sx={{ fontWeight: 800, textAlign: align }}>{name}</Typography></Stack>;
}

interface ReadonlyCompositionProps {
  composition: CompositionMap;
  squad: SquadPlayerRow[];
  homeName: string;
  awayName: string;
  supportedSide: 'home' | 'away' | 'none';
}

function ReadonlyComposition({ composition, squad, homeName, awayName, supportedSide }: ReadonlyCompositionProps) {
  const [side, setSide] = useState<'home' | 'away'>(supportedSide === 'away' ? 'away' : 'home');
  const players = useMemo(() => new Map(squad.map((player) => [player.IDJOUEUR, player])), [squad]);

  const showsSupportedClub = supportedSide !== 'none' && side === supportedSide;
  const coachId = (composition['ENTRAINEUR'] as string | null | undefined) ?? null;
  const coach = coachId ? players.get(coachId) ?? null : null;
  const opponentComposition = String(composition['MACOMPOADVERSAIRE'] ?? '').trim();
  const substitutes = REMP_CODES
    .map((code) => (composition[code] as string | null | undefined) ?? null)
    .map((playerId) => (playerId ? players.get(playerId) ?? null : null))
    .filter((player): player is SquadPlayerRow => player !== null);

  return (
    <Stack spacing={1.5}>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={side}
        onChange={(_event, nextSide: 'home' | 'away' | null) => { if (nextSide) setSide(nextSide); }}
      >
        <ToggleButton value="home">{homeName}</ToggleButton>
        <ToggleButton value="away">{awayName}</ToggleButton>
      </ToggleButtonGroup>

      {showsSupportedClub ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(280px, 420px) 160px' }, columnGap: 1.5, rowGap: 1, alignItems: 'start' }}>
          <Stack spacing={1}>
            {coach ? (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Entraîneur</Typography>
                <CoachInlineDisplay player={coach} href={entityPathForPublicMode('joueur', coach.IDJOUEUR)} />
              </Box>
            ) : null}

            <Box sx={{ maxWidth: 420, width: '100%' }}>
              <PitchField>
                {PITCH_SLOTS.map((slot) => {
                  const playerId = composition[slot.code];
                  const player = playerId ? players.get(playerId) ?? null : null;
                  return player ? (
                    <PitchSlotShell key={slot.code} x={slot.x} y={slot.y}>
                      <PitchPlayerMarker player={player} nameHref={entityPathForPublicMode('joueur', player.IDJOUEUR)} />
                    </PitchSlotShell>
                  ) : null;
                })}
              </PitchField>
            </Box>
          </Stack>

          <Stack spacing={0.5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Remplaçants</Typography>
            {substitutes.length ? substitutes.map((player) => (
              <Box key={player.IDJOUEUR} sx={{ ...BENCH_SLOT_SX, bgcolor: 'action.hover' }}>
                <PitchPlayerAvatar playerId={player.IDJOUEUR} size={28} />
                <BenchPlayerLabel player={player} href={entityPathForPublicMode('joueur', player.IDJOUEUR)} />
              </Box>
            )) : (
              <Typography variant="caption" color="text.disabled">Aucun remplaçant renseigné.</Typography>
            )}
          </Stack>
        </Box>
      ) : (
        <Typography sx={{ whiteSpace: 'pre-wrap' }} color={opponentComposition ? 'text.primary' : 'text.secondary'}>
          {opponentComposition || `Aucune composition renseignée pour ${side === 'home' ? homeName : awayName}.`}
        </Typography>
      )}
    </Stack>
  );
}

export function RencontrePublicPage() {
  const { rencontreId = '' } = useParams<{ rencontreId?: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<RencontreDetailRow | null>(null);
  const [highlights, setHighlights] = useState<RencontreHighlightsRow | null>(null);
  const [composition, setComposition] = useState<CompositionMap>({});
  const [squad, setSquad] = useState<SquadPlayerRow[]>([]);
  const [programme, setProgramme] = useState<TourMatchWithNamesRow[]>([]);
  const [participants, setParticipants] = useState<TourParticipantRow[]>([]);
  const [tab, setTab] = useState<'info' | 'highlights' | 'composition' | 'resume' | 'programme'>('info');
  const [loading, setLoading] = useState(true);
  const competitionLogo = useEntityImage('competition', detail?.COCLEUNIK ?? null);

  useEffect(() => {
    void Promise.all([
      fetchRencontreDetailById(rencontreId),
      fetchRencontreHighlightsById(rencontreId),
      fetchRencontreComposition(rencontreId),
      fetchRencontreSquad(rencontreId),
      fetchRencontreTourMatches(rencontreId),
    ]).then(async ([nextDetail, nextHighlights, nextComposition, nextSquad, nextProgramme]) => {
      setDetail(nextDetail); setHighlights(nextHighlights); setComposition(nextComposition); setSquad(nextSquad); setProgramme(nextProgramme);
      const tourId = Number(nextDetail.TUCLEUNIK ?? 0);
      if (tourId > 0) {
        const { data: payload } = await http.get<{ data?: TourParticipantRow[] }>(
          `${env.tourPublicResource}/${encodeURIComponent(String(tourId))}/participants`,
        );
        setParticipants(payload.data ?? []);
      }
    }).catch(() => setDetail(null)).finally(() => setLoading(false));
  }, [rencontreId]);

  const seoHomeName = detail?.DOMICILE_NOM_EFFECTIF || detail?.DOMICILE_ABREGE || 'Équipe à domicile';
  const seoAwayName = detail?.EXTERIEUR_NOM_EFFECTIF || detail?.EXTERIEUR_ABREGE || 'équipe à l’extérieur';
  useSeoMeta(
    detail ? `${seoHomeName} - ${seoAwayName} | Supporter` : 'Fiche rencontre | Supporter',
    detail ? `Score, date et informations de la rencontre ${seoHomeName} contre ${seoAwayName}.` : 'Fiche publique d’une rencontre de football.',
  );

  const matchColumns = useMemo<GridColDef<TourMatchWithNamesRow>[]>(() => buildMatchGridColumns<TourMatchWithNamesRow>({
    date: { enabled: true, width: 110, sortable: true, renderCell: (row) => formatDateShort(row.DATE) },
    score: { mode: 'readonly' },
    onClubClick: (id) => navigate(entityPathForPublicMode('club', id)),
  }), [navigate]);

  if (loading) return <PublicLoadingState />;
  if (!detail || Number(detail.IS_SUPPORTED_CLUB_MATCH ?? 0) !== 1) return <Alert severity="info">Cette rencontre n'est pas disponible dans la partie publique.</Alert>;

  const homeName = detail.DOMICILE_NOM_EFFECTIF || detail.DOMICILE_ABREGE;
  const awayName = detail.EXTERIEUR_NOM_EFFECTIF || detail.EXTERIEUR_ABREGE;
  const competitionIcon = competitionLogo.src
    ? <Box component="img" src={competitionLogo.src} alt="" sx={{ width: 24, height: 24, objectFit: 'contain' }} />
    : <EmojiEventsRoundedIcon color="primary" />;
  const dateLabel = formatDateShort(detail.DATE);
  const dateDisplay = ['Auj.', 'Hier', 'Demain'].includes(dateLabel) ? dateLabel : `le ${dateLabel}`;
  const spectatorsCount = Number(detail.NBSPECT ?? -1);
  const competitionLabel = formatCompetitionLabel(detail);
  const structuredData = useMemo<Record<string, unknown>>(() => ({
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${homeName} contre ${awayName}`,
    url: `${window.location.origin}/rencontres/${encodeURIComponent(rencontreId)}`,
    ...(detail.DATE ? { startDate: detail.DATE } : {}),
    ...(detail.TERRAIN_DISPLAY ? { location: { '@type': 'Place', name: detail.TERRAIN_DISPLAY } } : {}),
    homeTeam: { '@type': 'SportsTeam', name: homeName },
    awayTeam: { '@type': 'SportsTeam', name: awayName },
    ...(competitionLabel ? { description: competitionLabel } : {}),
    ...(Number(detail.ETAT) !== 1 && Number(detail.ETAT) !== 4 && Number(detail.ETAT) !== 5 ? {
      homeTeamScore: detail.BUTDOM,
      awayTeamScore: detail.BUTEXT,
    } : {}),
  }), [awayName, competitionLabel, detail, homeName, rencontreId]);

  return <Stack spacing={2}>
    <StructuredData data={structuredData} />
    <Card><CardContent><Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}><ClubHeader id={detail.DOMICILE} name={homeName} align="right" onClick={() => navigate(entityPathForPublicMode('club', detail.DOMICILE))} /><Stack spacing={0.5} sx={{ alignItems: 'center', minWidth: 120 }}><Typography variant="h3" sx={{ fontWeight: 900, whiteSpace: 'nowrap' }}>{formatScore(detail)}</Typography><Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>{competitionLogo.src ? <Box component="img" src={competitionLogo.src} alt="" sx={{ width: 24, height: 24, objectFit: 'contain' }} /> : <EmojiEventsRoundedIcon sx={{ fontSize: 20 }} />}<Typography variant="caption" color="text.secondary">{competitionLabel}</Typography></Stack></Stack><ClubHeader id={detail.EXTERIEUR} name={awayName} align="left" onClick={() => navigate(entityPathForPublicMode('club', detail.EXTERIEUR))} /></Stack>
      <Tabs value={tab} onChange={(_event, value: 'info' | 'highlights' | 'composition' | 'resume' | 'programme') => setTab(value)} variant="scrollable" scrollButtons="auto"><Tab value="info" label="Information" /><Tab value="highlights" label="Faits Marquants" /><Tab value="composition" label="Composition" /><Tab value="resume" label="Résumé" /><Tab value="programme" label="Programme" /></Tabs>
    </Stack></CardContent></Card>

    {tab === 'info' ? <Card><CardContent><Stack spacing={1.25}>
      <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{competitionIcon}<strong>{competitionLabel}</strong></Typography>
      <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CalendarMonthRoundedIcon color="primary" />{dateDisplay} à <strong>{formatTime(detail.HEURE)}</strong></Typography>
      {detail.TERRAIN_DISPLAY ? <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><LocationOnRoundedIcon color="primary" />au <strong>{detail.TERRAIN_DISPLAY}</strong></Typography> : null}
      {Number.isFinite(spectatorsCount) && spectatorsCount > 0 ? <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><GroupsRoundedIcon color="primary" />devant <strong>{formatInteger(detail.NBSPECT)}</strong> spectateurs</Typography> : null}
      {detail.IDARBITRE ? <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><SportsIcon color="primary" /><Typography>arbitré par</Typography><ArbitreIdentityDisplay arbitreId={detail.IDARBITRE} inField /></Stack> : null}
    </Stack></CardContent></Card> : null}

    {tab === 'highlights' ? <Card><CardContent><RencontreHighlightsTimeline events={highlights?.EVENTS ?? []} /></CardContent></Card> : null}

    {tab === 'composition' ? <Card><CardContent><ReadonlyComposition composition={composition} squad={squad} homeName={homeName} awayName={awayName} supportedSide={detail.SUPPORTED_CLUB_SIDE} /></CardContent></Card> : null}

    {tab === 'resume' ? <Card><CardContent><Typography sx={{ whiteSpace: 'pre-wrap' }} color={detail.COMMENT ? 'text.primary' : 'text.secondary'}>{detail.COMMENT || 'Aucun résumé pour cette rencontre.'}</Typography></CardContent></Card> : null}

    {tab === 'programme' ? <Card><CardContent><Box sx={{ height: 420 }}><MatchDataGrid rows={programme} columns={matchColumns} getRowId={(row) => row.RECLEUNIK} disableRowSelectionOnClick disableColumnMenu density="compact" pageSizeOptions={[10, 25, 50]} /></Box>{participants.length ? <Typography variant="caption" color="text.secondary">{participants.length} participants au tour</Typography> : null}</CardContent></Card> : null}
  </Stack>;
}
