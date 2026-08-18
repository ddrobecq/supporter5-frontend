import { Avatar, Stack, Typography } from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { NatioFlag } from '../../../../components/NatioFlag';
import { JoueurClubIndicator } from '../../../../components/JoueurIdentityDisplay';
import { useEntityImage } from '../../../../lib/useEntityImage';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { fetchSeriesInviolabilite, type SerieInviolabiliteRow } from './seriesInviolabiliteApi';

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

const VALUE_COLUMNS: GridColDef<SerieInviolabiliteRow>[] = [{
  field: 'SERIE',
  headerName: "Série d'inviolabilité",
  flex: 1,
  minWidth: 460,
  type: 'number',
  sortable: false,
  renderCell: (params) => <SerieInviolabiliteCell row={params.row} />,
}];

function SerieInviolabiliteCell({ row }: { row: SerieInviolabiliteRow }) {
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
        {` : série de ${row.SERIE} matchs sans encaisser du ${formatDateDisplay(row.SERIE_DEBUT)} au ${formatDateDisplay(row.SERIE_FIN)}${row.EN_COURS ? ' (série en cours)' : ''}`}
      </Typography>
    </Stack>
  );
}

export function SerieInviolabiliteGrid() {
  const [rows, setRows] = useState<SerieInviolabiliteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchSeriesInviolabilite(controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <StatPlayerGrid<SerieInviolabiliteRow>
      rows={rows}
      valueColumns={VALUE_COLUMNS}
      loading={loading}
      hideIdentityColumn
      initialState={{ sorting: { sortModel: [{ field: 'SERIE', sort: 'desc' }] } }}
    />
  );
}
