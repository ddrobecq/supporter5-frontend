import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import { Avatar, Box, Card, CardContent, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NatioFlag } from '../../components/NatioFlag';
import { PublicLoadingState, PublicNotFoundState } from '../../components/PublicPageState';
import { StructuredData } from '../../components/StructuredData';
import { entityPathForPublicMode } from '../../lib/entityNavigation';
import { useEntityImage } from '../../lib/useEntityImage';
import { useSeoMeta } from '../../lib/useSeoMeta';
import { useRecentRecordVisit } from '../home/useRecentRecordVisit';
import { fetchSupportedClubContext } from '../system/systemApi';
import { fetchNatio } from '../natio/natioApi';
import type { NatioRow } from '../natio/types';
import { resolveNatioId, resolveNatioLabel } from '../natio/natioUi';
import { ClubHistoryTimeline } from './ClubHistoryTimeline';
import { ClubJerseyVisual } from './ClubJerseyVisual';
import { ClubMatchesTab } from './ClubMatchesTab';
import { fetchClubMatches, fetchClubNameHistory, fetchClubPalmares, fetchClubProfileById, fetchClubTerrainHistory } from './clubApi';
import type { ClubMatchRow, ClubNameHistoryRow, ClubPalmareRow, ClubProfileRow, ClubTerrainHistoryRow } from './types';

function PalmareItem({ row }: { row: ClubPalmareRow }) {
  const { src } = useEntityImage('epreuve', row.IDEPREUVE);
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Avatar src={src ?? undefined} sx={{ bgcolor: 'action.hover' }}>{!src ? <EmojiEventsRoundedIcon /> : null}</Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}><Typography sx={{ fontWeight: 700 }}>{row.EPREUVE}</Typography><Typography variant="body2" color="text.secondary">{row.ANNEES.join(' · ')}</Typography></Box>
      <Typography sx={{ fontWeight: 800 }}>×{row.NB_TITRES}</Typography>
    </Stack>
  );
}

export function ClubPublicPage() {
  const { clubId = '' } = useParams<{ clubId?: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ClubProfileRow | null>(null);
  const [names, setNames] = useState<ClubNameHistoryRow[]>([]);
  const [terrains, setTerrains] = useState<ClubTerrainHistoryRow[]>([]);
  const [matches, setMatches] = useState<ClubMatchRow[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [palmares, setPalmares] = useState<ClubPalmareRow[]>([]);
  const [palmaresLoading, setPalmaresLoading] = useState(false);
  const [palmaresLoaded, setPalmaresLoaded] = useState(false);
  const [countries, setCountries] = useState<NatioRow[]>([]);
  const [tab, setTab] = useState<'info' | 'matches' | 'palmares'>('info');
  const [loading, setLoading] = useState(true);
  const [matchFilterClubId, setMatchFilterClubId] = useState(() => '0001');
  const [matchFilterClubName, setMatchFilterClubName] = useState('');
  const clubImage = useEntityImage('club', clubId);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setMatches([]); setMatchesLoaded(false);
    setPalmares([]); setPalmaresLoaded(false);
    void Promise.all([
      fetchClubProfileById(clubId, controller.signal), fetchClubNameHistory(clubId, controller.signal),
      fetchClubTerrainHistory(clubId, controller.signal), fetchNatio('', controller.signal),
    ]).then(([nextProfile, nextNames, nextTerrains, nextCountries]) => {
      setProfile(nextProfile); setNames(nextNames); setTerrains(nextTerrains); setCountries(nextCountries.data ?? []);
    }).catch(() => setProfile(null)).finally(() => setLoading(false));
    return () => controller.abort();
  }, [clubId]);

  // Onglet Matches: charge a la demande (clic sur l'onglet) pour ne pas ralentir l'affichage initial de la fiche.
  useEffect(() => {
    if (tab !== 'matches' || matchesLoaded) return;
    const controller = new AbortController();
    setMatchesLoading(true);
    fetchClubMatches(clubId, controller.signal)
      .then((rows) => { setMatches(rows); setMatchesLoaded(true); })
      .catch(() => undefined)
      .finally(() => setMatchesLoading(false));
    return () => controller.abort();
  }, [tab, clubId, matchesLoaded]);

  // Palmares: requete lourde, precalculee en silence des que la fiche est affichee
  // (sans bloquer l'affichage initial) plutot qu'attendre le clic sur l'onglet.
  useEffect(() => {
    if (loading || !profile || palmaresLoaded) return;
    const controller = new AbortController();
    setPalmaresLoading(true);
    fetchClubPalmares(clubId, controller.signal)
      .then((rows) => { setPalmares(rows); setPalmaresLoaded(true); })
      .catch(() => undefined)
      .finally(() => setPalmaresLoading(false));
    return () => controller.abort();
  }, [loading, profile, clubId, palmaresLoaded]);

  useEffect(() => {
    void fetchSupportedClubContext()
      .then((context) => {
        setMatchFilterClubId(context.clubId || '0001');
        setMatchFilterClubName(context.clubName);
      })
      .catch(() => undefined);
  }, []);

  const country = countries.find((item) => String(resolveNatioId(item) ?? '').trim() === String(profile?.IDNATIO ?? '').trim());
  const clubName = String(profile?.CLUB_ABREGE ?? '').trim();
  const countryName = country ? resolveNatioLabel(country) : '';
  useSeoMeta(
    profile ? `${clubName} - Résultats, calendrier et palmarès | Supporter` : 'Fiche club | Supporter',
    profile ? `Découvrez les résultats, le calendrier, l'histoire et le palmarès de ${clubName}.` : 'Fiche publique d’un club de football.',
  );
  useRecentRecordVisit('club', clubId, clubName, Boolean(profile));
  const structuredData = useMemo<Record<string, unknown> | null>(() => profile ? ({
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: clubName,
    url: `${window.location.origin}/clubs/${encodeURIComponent(clubId)}`,
    ...(clubImage.src ? { logo: clubImage.src } : {}),
    ...(profile.VILLE_NOM ? { location: { '@type': 'Place', name: profile.VILLE_NOM } } : {}),
  }) : null, [clubId, clubImage.src, clubName, profile]);

  if (loading) return <PublicLoadingState />;
  if (!profile) return <PublicNotFoundState entity="Club" />;

  return (
    <Stack spacing={2}>
      <StructuredData data={structuredData} />
      <Card><CardContent><Stack spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '150px minmax(220px, auto) 132px' }, gridTemplateRows: { xs: '150px auto', sm: '150px' }, columnGap: { xs: 1, sm: 3 }, rowGap: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <Box sx={{ width: 150, height: 150, display: 'grid', placeItems: 'center', justifySelf: 'center', gridArea: { xs: '1 / 1', sm: '1 / 1' } }}>{clubImage.src ? <Box component="img" src={clubImage.src} alt={`Écusson ${clubName}`} sx={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }} /> : <ShieldRoundedIcon sx={{ fontSize: 96, color: 'text.disabled' }} />}</Box>
          <Stack spacing={0.5} sx={{ alignItems: 'center', textAlign: 'center', minWidth: { sm: 220 }, gridArea: { xs: '2 / 1 / 3 / 3', sm: '1 / 2' } }}>
            <Typography variant="h3" sx={{ fontWeight: 900, lineHeight: 1.05 }}>{clubName}</Typography>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <LocationOnRoundedIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>{profile.VILLE_NOM || 'Ville non renseignée'}</Typography>
              {profile.IDNATIO ? <NatioFlag idnatio={profile.IDNATIO} name={countryName} showLocal /> : null}
            </Stack>
          </Stack>
          <ClubJerseyVisual
            fond={profile.FOND}
            texte={profile.TEXTE}
            clubName={clubName}
            sx={{ justifySelf: 'center', gridArea: { xs: '1 / 2', sm: '1 / 3' } }}
          />
        </Box>
        <Tabs value={tab} onChange={(_event, value: 'info' | 'matches' | 'palmares') => setTab(value)}><Tab value="info" label="HISTOIRE" /><Tab value="matches" label="MATCHES" /><Tab value="palmares" label="PALMARÈS" /></Tabs>
      </Stack></CardContent></Card>
      {tab === 'info' ? <Card><CardContent><ClubHistoryTimeline names={names} terrains={terrains} /></CardContent></Card> : null}
      {(tab === 'matches' || matchesLoaded) ? (
        // Reste dans le DOM (juste masque) une fois visite, pour eviter de reconstruire
        // la grille (des milliers de lignes) a chaque changement d'onglet.
        <Box sx={{ display: tab === 'matches' ? 'block' : 'none' }}>
          <Card><CardContent>
            {matchesLoading && !matchesLoaded ? <PublicLoadingState /> : (
              <ClubMatchesTab
                clubId={clubId}
                matches={matches}
                filterClubId={matchFilterClubId}
                filterClubName={matchFilterClubName}
                onFilterChange={({ clubId: nextId, clubName: nextName }) => { setMatchFilterClubId(nextId); setMatchFilterClubName(nextName); }}
                publicMode
                onNavigateToClub={(id) => navigate(entityPathForPublicMode('club', id))}
              />
            )}
          </CardContent></Card>
        </Box>
      ) : null}
      {tab === 'palmares' ? (
        <Card><CardContent>
          {palmaresLoading && !palmaresLoaded ? <PublicLoadingState /> : (
            palmares.length ? palmares.map((row) => <PalmareItem key={row.IDEPREUVE} row={row} />) : <Typography color="text.secondary">Aucun titre remporté.</Typography>
          )}
        </CardContent></Card>
      ) : null}
    </Stack>
  );
}