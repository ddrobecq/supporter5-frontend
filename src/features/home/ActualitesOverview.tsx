import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { Box, Chip, Link, Paper, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { fetchActualites, type Actualite, type ActualiteCategorie } from './actualitesApi';

const CATEGORY_COLORS: Record<ActualiteCategorie, 'default' | 'primary' | 'error' | 'success' | 'warning'> = {
  Transferts: 'success',
  Infirmerie: 'error',
  Competitions: 'primary',
  Groupe: 'warning',
  Club: 'default',
};

function parisDateKey(date: Date): string {
  return date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
}

function formatPublicationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const dateKey = parisDateKey(date);
  if (dateKey === parisDateKey(now)) {
    return date.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dateKey === parisDateKey(yesterday)) return 'Hier';
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (dateKey === parisDateKey(tomorrow)) return 'Demain';
  return date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: 'short' }).replace('.', '');
}

function ActualiteRow({ actualite }: { actualite: Actualite }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: actualite.imageUrl ? '112px minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 1.25, py: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
      {actualite.imageUrl ? (
        <Box component="img" src={actualite.imageUrl} alt="" sx={{ width: 112, height: 82, objectFit: 'cover', borderRadius: 1, bgcolor: 'action.hover' }} />
      ) : null}
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.55, minWidth: 0 }}>
          <Chip size="small" label={actualite.categorie} color={CATEGORY_COLORS[actualite.categorie]} sx={{ height: 21, fontSize: 11, fontWeight: 700, flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {formatPublicationDate(actualite.publieLe)} · {actualite.source}
          </Typography>
        </Stack>
        <Link
          href={actualite.lien}
          target="_blank"
          rel="noreferrer"
          underline="hover"
          color="text.primary"
          sx={{ display: 'inline-flex', alignItems: 'flex-start', gap: 0.5, fontWeight: 800, lineHeight: 1.3 }}
        >
          <span>{actualite.titre}</span>
          <OpenInNewRoundedIcon sx={{ fontSize: 15, mt: 0.15, flexShrink: 0 }} />
        </Link>
        {actualite.extrait ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45, lineHeight: 1.45 }}>{actualite.extrait}</Typography> : null}
      </Box>
    </Box>
  );
}

export function ActualitesOverview() {
  const [actualites, setActualites] = useState<Actualite[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchActualites(controller.signal)
      .then(setActualites)
      .catch(() => setActualites([]))
      .finally(() => setLoaded(true));
    return () => controller.abort();
  }, []);

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: { xs: 1.5, md: 2 }, width: '100%', bgcolor: 'background.paper' }}>
      <Stack spacing={0.4}>
        <Typography variant="h6" sx={{ fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          <ArticleRoundedIcon sx={{ fontSize: 20 }} />
          Actualités
        </Typography>
        {!loaded ? <Typography variant="body2" color="text.secondary">Chargement des actualités...</Typography> : null}
        {loaded && actualites.length === 0 ? <Typography variant="body2" color="text.secondary">Aucune actualité récente concernant le club.</Typography> : null}
        {actualites.map((actualite) => <ActualiteRow key={actualite.id} actualite={actualite} />)}
      </Stack>
    </Paper>
  );
}