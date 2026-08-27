import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import { Avatar, Box, Card, CardContent, Stack, Tab, Tabs, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MatchDataGrid } from '../../components/MatchDataGrid';
import { buildMatchGridColumns } from '../../components/matchGridColumns';
import { ClubSelectField } from '../../components/ClubSelectField';
import { EntityImageFrame } from '../../components/EntityImageFrame';
import { NatioFlag } from '../../components/NatioFlag';
import { PublicLoadingState, PublicNotFoundState } from '../../components/PublicPageState';
import { entityPathForPublicMode } from '../../lib/entityNavigation';
import { useEntityImage } from '../../lib/useEntityImage';
import { fetchSupportedClubContext } from '../system/systemApi';
import { fetchNatio } from '../natio/natioApi';
import type { NatioRow } from '../natio/types';
import { resolveNatioId, resolveNatioLabel } from '../natio/natioUi';
import { ClubHistoryTimeline } from './ClubHistoryTimeline';
import { createJerseyVisualDataUri } from './ClubTabFormPane';
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
  const [palmares, setPalmares] = useState<ClubPalmareRow[]>([]);
  const [countries, setCountries] = useState<NatioRow[]>([]);
  const [tab, setTab] = useState<'info' | 'matches' | 'palmares'>('info');
  const [loading, setLoading] = useState(true);
  const [matchFilterClubId, setMatchFilterClubId] = useState(() => '0001');
  const [matchFilterClubName, setMatchFilterClubName] = useState('');
  const [supportedClubName, setSupportedClubName] = useState('');
  const clubImage = useEntityImage('club', clubId);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void Promise.all([
      fetchClubProfileById(clubId, controller.signal), fetchClubNameHistory(clubId, controller.signal),
      fetchClubTerrainHistory(clubId, controller.signal), fetchClubMatches(clubId, controller.signal),
      fetchClubPalmares(clubId), fetchNatio('', controller.signal),
    ]).then(([nextProfile, nextNames, nextTerrains, nextMatches, nextPalmares, nextCountries]) => {
      setProfile(nextProfile); setNames(nextNames); setTerrains(nextTerrains); setMatches(nextMatches); setPalmares(nextPalmares); setCountries(nextCountries.data ?? []);
    }).catch(() => setProfile(null)).finally(() => setLoading(false));
    return () => controller.abort();
  }, [clubId]);

  useEffect(() => {
    void fetchSupportedClubContext()
      .then((context) => {
        setMatchFilterClubId(context.clubId || '0001');
        setMatchFilterClubName(context.clubName);
        setSupportedClubName(context.clubName);
      })
      .catch(() => undefined);
  }, []);

  const filteredMatches = matches.filter((match) => (
    !matchFilterClubId || match.DOMICILE === matchFilterClubId || match.EXTERIEUR === matchFilterClubId
  ));

  const country = countries.find((item) => String(resolveNatioId(item) ?? '').trim() === String(profile?.IDNATIO ?? '').trim());
  const clubName = String(profile?.CLUB_ABREGE ?? '').trim();
  const countryName = country ? resolveNatioLabel(country) : '';
  const matchColumns = useMemo<GridColDef<ClubMatchRow>[]>(() => buildMatchGridColumns<ClubMatchRow>({
    date: { enabled: true, width: 110, sortable: true, renderCell: (row) => row.DATE },
    circ: { enabled: true, width: 260, sortable: true, field: 'CIRC_COMPLET', headerName: 'Compétition' },
    score: { mode: 'readonly', sortable: false }, domicileHeaderName: 'Domicile', exterieurHeaderName: 'Extérieur',
    onClubClick: (id) => navigate(entityPathForPublicMode('club', id)),
  }), [navigate]);

  if (loading) return <PublicLoadingState />;
  if (!profile) return <PublicNotFoundState entity="Club" />;

  return (
    <Stack spacing={2}>
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
          <EntityImageFrame
            sx={{ bgcolor: '#f5f5f5', justifySelf: 'center', gridArea: { xs: '1 / 2', sm: '1 / 3' } }}
            width={132}
            height={150}
            src={createJerseyVisualDataUri(String(profile.FOND ?? '#2e7d32'), String(profile.TEXTE ?? '#1f1f1f'), clubName)}
            alt={`Maillot ${clubName}`}
            objectFit="contain"
            objectPosition="center top"
            imageSx={{ transform: 'translateY(-10px) scale(1.56)', transformOrigin: 'center 24%' }}
          />
        </Box>
        <Tabs value={tab} onChange={(_event, value: 'info' | 'matches' | 'palmares') => setTab(value)}><Tab value="info" label="HISTOIRE" /><Tab value="matches" label="MATCHES" /><Tab value="palmares" label="PALMARÈS" /></Tabs>
      </Stack></CardContent></Card>
      {tab === 'info' ? <Card><CardContent><ClubHistoryTimeline names={names} terrains={terrains} /></CardContent></Card> : null}
      {tab === 'matches' ? <Card><CardContent><Stack spacing={1.5}><ClubSelectField label="Filtre" clubId={matchFilterClubId} clubName={matchFilterClubName || supportedClubName} onChange={({ clubId: nextId, clubName: nextName }) => { setMatchFilterClubId(nextId); setMatchFilterClubName(nextName); }} clearLabel="Effacer" /><Box sx={{ height: 560 }}><MatchDataGrid rows={filteredMatches} columns={matchColumns} getRowId={(row) => row.RECLEUNIK} disableRowSelectionOnClick disableColumnMenu density="compact" pageSizeOptions={[25, 50, 100]} /></Box></Stack></CardContent></Card> : null}
      {tab === 'palmares' ? <Card><CardContent>{palmares.length ? palmares.map((row) => <PalmareItem key={row.IDEPREUVE} row={row} />) : <Typography color="text.secondary">Aucun titre remporté.</Typography>}</CardContent></Card> : null}
    </Stack>
  );
}