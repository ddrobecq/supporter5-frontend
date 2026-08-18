import { Avatar, Stack, Typography } from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { NatioFlag } from '../../../../components/NatioFlag';
import { JoueurClubIndicator } from '../../../../components/JoueurIdentityDisplay';
import { useEntityImage } from '../../../../lib/useEntityImage';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { fetchSeriesButeurs, type SerieButeurRow } from './seriesApi';

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function valueColumns(metric: 'buts' | 'passes'): GridColDef<SerieButeurRow>[] {
  return [{
    field: 'SERIE',
    headerName: metric === 'passes' ? 'Série de passes' : 'Série de buts',
    flex: 1,
    minWidth: 420,
    type: 'number',
    sortable: false,
    renderCell: (params) => <SerieCell row={params.row} metric={metric} />,
  }];
}

function SerieCell({ row, metric }: { row: SerieButeurRow; metric: 'buts' | 'passes' }) {
  const { src } = useEntityImage('joueurrg', row.IDJOUEUR);
  const surnom = row.SURNOM?.trim();
  const nom = row.NOM?.trim() ? row.NOM.toUpperCase() : '';
  const prenom = row.PRENOM?.trim() ?? '';
  const nomJoueur = surnom || `${nom}${prenom ? ` ${prenom}` : ''}` || row.IDJOUEUR;

  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Avatar src={src ?? undefined} sx={{ width: 30, height: 30, bgcolor: 'grey.300', flexShrink: 0 }}>
        {!src && <PersonRoundedIcon sx={{ fontSize: 17 }} />}
      </Avatar>
      {row.IDNATIO ? <NatioFlag idnatio={row.IDNATIO} /> : null}
      <Typography variant="body2" sx={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <b>{nomJoueur}</b>
        {row.EN_CLUB ? <JoueurClubIndicator /> : null}
        {` : série de ${row.SERIE} ${metric === 'passes' ? 'passes décisives' : 'buts'} du ${formatDateDisplay(row.SERIE_DEBUT)} au ${formatDateDisplay(row.SERIE_FIN)}${row.EN_COURS ? ' (série en cours)' : ''}`}
      </Typography>
    </Stack>
  );
}

/** Joueur > Buts > Serie: longest run of scored matches, ignoring matches not played. */
export function SeriesGrid({ metric = 'buts' }: { metric?: 'buts' | 'passes' }) {
  const [rows, setRows] = useState<SerieButeurRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchSeriesButeurs(metric, controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric]);

  return (
    <StatPlayerGrid<SerieButeurRow>
      rows={rows}
      valueColumns={valueColumns(metric)}
      loading={loading}
      hideIdentityColumn
      initialState={{ sorting: { sortModel: [{ field: 'SERIE', sort: 'desc' }] } }}
    />
  );
}
