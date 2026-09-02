import CakeRoundedIcon from '@mui/icons-material/CakeRounded';
import HeightRoundedIcon from '@mui/icons-material/HeightRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ScaleRoundedIcon from '@mui/icons-material/ScaleRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import { Box, Card, CardContent, Stack, Tab, Tabs, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EntityImageFrame } from '../../components/EntityImageFrame';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { NatioFlag } from '../../components/NatioFlag';
import { PublicLoadingState, PublicNotFoundState } from '../../components/PublicPageState';
import { StructuredData } from '../../components/StructuredData';
import { useEntityImage } from '../../lib/useEntityImage';
import { useSeoMeta } from '../../lib/useSeoMeta';
import { useRecentRecordVisit } from '../home/useRecentRecordVisit';
import { fetchNatio } from '../natio/natioApi';
import { resolveNatioId, resolveNatioLabel } from '../natio/natioUi';
import { fetchVilleById } from '../ville/villeApi';
import { JoueurContractsTimeline } from './JoueurContractsTimeline';
import { JoueurMatchesTab } from './JoueurMatchesTab';
import { fetchJoueurById, fetchJoueurHistory, fetchJoueurPostes, fetchJoueurTransactions } from './joueurApi';
import type { JoueurHistoryRow, JoueurRow, JoueurTransactionRow, PosteOption } from './types';
import type { NatioRow } from '../natio/types';

function displayDate(value: unknown): string {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{4})(?:-(\d{2})-(\d{2})|(\d{2})(\d{2}))$/);
  if (!match) return text || 'date inconnue';
  const month = Number(match[2] ?? match[4]);
  const day = Number(match[3] ?? match[5]);
  return new Date(Number(match[1]), month - 1, day).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function resolvePlayerName(row: JoueurRow): { title: string; subtitle: string } {
  const surnom = normalizeText(row.SURNOM);
  const nom = normalizeText(row.NOM);
  const prenom = normalizeText(row.PRENOM);
  return {
    title: surnom || nom || prenom || 'Joueur',
    subtitle: surnom ? [nom, prenom].filter(Boolean).join(' ') : prenom,
  };
}

function buildHistoryColumns(): GridColDef<JoueurHistoryRow>[] {
  return [
    { field: 'SAISON', headerName: 'Saison', minWidth: 120, flex: 0.8 },
    { field: 'POSTE_NOM', headerName: 'Poste', minWidth: 150, flex: 1 },
    { field: 'TITULAIRETOTAL', headerName: 'Titulaire', type: 'number', minWidth: 100, flex: 0.6 },
    { field: 'REMPTOTAL', headerName: 'Remplaçant', type: 'number', minWidth: 110, flex: 0.7 },
    { field: 'BUTTOTAL', headerName: 'Buts', type: 'number', minWidth: 85, flex: 0.5 },
    { field: 'PASSETOTAL', headerName: 'Passes', type: 'number', minWidth: 85, flex: 0.5 },
    { field: 'JAUNETOTAL', headerName: 'Avert.', type: 'number', minWidth: 90, flex: 0.5 },
    { field: 'ROUGETOTAL', headerName: 'Exclu.', type: 'number', minWidth: 85, flex: 0.5 },
  ];
}

export function JoueurPublicPage() {
  const { joueurId = '' } = useParams<{ joueurId?: string }>();
  const [profile, setProfile] = useState<JoueurRow | null>(null);
  const [history, setHistory] = useState<JoueurHistoryRow[]>([]);
  const [contracts, setContracts] = useState<JoueurTransactionRow[]>([]);
  const [countries, setCountries] = useState<NatioRow[]>([]);
  const [postes, setPostes] = useState<PosteOption[]>([]);
  const [birthCity, setBirthCity] = useState('');
  const [birthCityCountry, setBirthCityCountry] = useState('');
  const [tab, setTab] = useState<'identite' | 'historique' | 'matches' | 'contrat'>('identite');
  const [loading, setLoading] = useState(true);
  const portrait = useEntityImage('joueurrg', joueurId);
  const historyColumns = useMemo(buildHistoryColumns, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void Promise.all([
      fetchJoueurById(joueurId, controller.signal),
      fetchJoueurHistory(joueurId, controller.signal),
      fetchJoueurTransactions(joueurId, controller.signal),
      fetchNatio('', controller.signal),
      fetchJoueurPostes(controller.signal),
    ]).then(([nextProfile, nextHistory, nextContracts, nextCountries, nextPostes]) => {
      setProfile(nextProfile);
      setHistory(nextHistory);
      setContracts(nextContracts);
      setCountries(nextCountries.data ?? []);
      setPostes(nextPostes);
      const cityId = normalizeText(nextProfile.IDVILLE);
      if (cityId && cityId !== '0') {
        void fetchVilleById(cityId).then((city) => {
          setBirthCity(normalizeText(city.NOM));
          setBirthCityCountry(normalizeText(city.IDNATIO));
        }).catch(() => undefined);
      }
    }).catch(() => setProfile(null)).finally(() => setLoading(false));
    return () => controller.abort();
  }, [joueurId]);

  const seoName = profile ? resolvePlayerName(profile).title : 'Joueur';
  useSeoMeta(
    profile ? `${seoName} - Statistiques et fiche joueur | Supporter` : 'Fiche joueur | Supporter',
    profile ? `Découvrez la fiche, les statistiques et l'historique de ${seoName}.` : 'Fiche publique d’un joueur de football.',
  );
  useRecentRecordVisit('joueur', joueurId, seoName, Boolean(profile));

  const name = profile ? resolvePlayerName(profile) : { title: '', subtitle: '' };
  const country = profile ? countries.find((row) => String(resolveNatioId(row) ?? '').trim() === normalizeText(profile.IDNATIO)) : undefined;
  const countryName = country ? resolveNatioLabel(country) : '';
  const poste = profile ? postes.find((row) => Number(row.POS_ID) === Number(profile.POSTE)) : undefined;
  const birthDate = profile ? normalizeText(profile.NAISSANCE) : '';
  const deathDate = profile ? normalizeText(profile.DECES) : '';
  const birthCountryId = birthCityCountry || (profile ? normalizeText(profile.IDNATIO) : '');
  const historyLoading = false;
  const structuredData = useMemo<Record<string, unknown>>(() => ({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: name.title,
    url: `${window.location.origin}/joueurs/${encodeURIComponent(joueurId)}`,
    ...(name.subtitle ? { alternateName: name.subtitle } : {}),
    ...(birthDate ? { birthDate } : {}),
    ...(birthCity ? { birthPlace: { '@type': 'Place', name: birthCity } } : {}),
    ...(countryName ? { nationality: countryName } : {}),
    ...(poste ? { jobTitle: normalizeText(poste.POS_NOM) } : {}),
    ...(portrait.src ? { image: portrait.src } : {}),
    ...(contracts[0]?.CLUB_NOM ? { affiliation: { '@type': 'SportsTeam', name: contracts[0].CLUB_NOM } } : {}),
  }), [birthCity, birthDate, contracts, countryName, joueurId, name.subtitle, name.title, portrait.src, poste]);

  if (loading) return <PublicLoadingState />;
  if (!profile) return <PublicNotFoundState entity="Joueur" />;

  return (
    <Stack spacing={2}>
      <StructuredData data={structuredData} />
      <Card>
        <CardContent>
          <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.5, sm: 3 }} sx={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <EntityImageFrame
                width={120}
                height={150}
                src={portrait.src}
                loading={portrait.loading}
                alt={`Photo de ${name.title}`}
                objectFit="contain"
                editable={false}
                fallback={<Box sx={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', color: 'text.disabled' }}><PersonRoundedIcon sx={{ fontSize: 72 }} /></Box>}
              />
              <Stack spacing={0.5} sx={{ alignItems: 'center', textAlign: 'center', minWidth: { sm: 260 } }}>
                <Typography variant="h3" sx={{ fontWeight: 900, lineHeight: 1.05 }}>{name.title}</Typography>
                {name.subtitle ? <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>{name.subtitle}</Typography> : null}
                {poste ? <Typography variant="body2" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><SportsSoccerRoundedIcon sx={{ fontSize: 17 }} />{normalizeText(poste.POS_NOM)}</Typography> : null}
              </Stack>
            </Stack>
            <Tabs value={tab} onChange={(_event, value: 'identite' | 'historique' | 'matches' | 'contrat') => setTab(value)} variant="scrollable" scrollButtons="auto">
              <Tab value="identite" label="IDENTITÉ" />
              <Tab value="historique" label="HISTORIQUE" />
              <Tab value="matches" label="MATCHES" />
              <Tab value="contrat" label="CONTRAT" />
            </Tabs>
          </Stack>
        </CardContent>
      </Card>

      {tab === 'identite' ? (
        <Card><CardContent><Stack spacing={1.25}>
          {normalizeText(profile.IDNATIO) ? <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><NatioFlag idnatio={normalizeText(profile.IDNATIO)} name={countryName} showLocal />Nationalité : <strong>{countryName}</strong></Typography> : null}
          {birthDate ? <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CakeRoundedIcon color="primary" />né le <strong>{displayDate(birthDate)}</strong>{birthCity ? <> à <strong>{birthCity}</strong></> : null}{birthCountryId ? <NatioFlag idnatio={birthCountryId} showLocal /> : null}</Typography> : null}
          {deathDate ? <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CakeRoundedIcon color="action" />décédé le <strong>{displayDate(deathDate)}</strong></Typography> : null}
          {profile.HAUTEUR ? <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><HeightRoundedIcon color="primary" />taille : <strong>{normalizeText(profile.HAUTEUR)} cm</strong></Typography> : null}
          {profile.POIDS ? <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ScaleRoundedIcon color="primary" />poids : <strong>{normalizeText(profile.POIDS)} kg</strong></Typography> : null}
          {profile.COMMENT ? <Typography color="text.secondary">{normalizeText(profile.COMMENT)}</Typography> : null}
        </Stack></CardContent></Card>
      ) : null}
      {tab === 'historique' ? <Card><CardContent><Box sx={{ height: 420 }}><EntityDataGrid rows={history} columns={historyColumns} loading={historyLoading} selection={[]} onSelectionChange={() => undefined} getRowId={(row) => row.JOCLEUNIK} pageSizeOptions={[10, 25, 50]} /></Box></CardContent></Card> : null}
      {tab === 'matches' ? <Card><CardContent><JoueurMatchesTab joueurId={joueurId} active /></CardContent></Card> : null}
      {tab === 'contrat' ? <Card><CardContent><JoueurContractsTimeline rows={contracts} /></CardContent></Card> : null}
    </Stack>
  );
}
