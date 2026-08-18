import { Avatar, Link as MuiLink, Stack, Typography } from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { NatioFlag } from '../../../../components/NatioFlag';
import { JoueurClubIndicator } from '../../../../components/JoueurIdentityDisplay';
import { useEntityImage } from '../../../../lib/useEntityImage';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { fetchButeursParMatch, type ButeurMatchRow } from './buteursMatchApi';

function formatDateDisplay(dateStr: string): string {
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  return `${dateStr.substring(6, 8)}/${dateStr.substring(4, 6)}/${dateStr.substring(0, 4)}`;
}

function valueColumns(metric: 'buts' | 'passes'): GridColDef<ButeurMatchRow>[] {
  return [{
    field: 'BUTS',
    headerName: metric === 'passes' ? 'Passeurs sur un match' : 'Buteurs sur un match',
    flex: 1,
    minWidth: 420,
    sortable: false,
    renderCell: (params) => <ButeurMatchCell row={params.row} metric={metric} />,
  }];
}

function ButeurMatchCell({ row, metric }: { row: ButeurMatchRow; metric: 'buts' | 'passes' }) {
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
        {' avec '}
        {row.BUTS} {metric === 'passes' ? 'passes décisives' : 'buts'} le{' '}
        <MuiLink
          component="button"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            window.dispatchEvent(new CustomEvent('supporter:tab-open', {
              detail: {
                path: `/admin/rencontres/${encodeURIComponent(String(row.RECLEUNIK))}`,
                label: 'Rencontre',
                unique: true,
                uniqueByPath: true,
              },
            }));
          }}
          sx={{ cursor: 'pointer', textDecoration: 'underline', color: 'inherit', font: 'inherit', verticalAlign: 'baseline' }}
        >
          {formatDateDisplay(row.MATCH_DATE)}
        </MuiLink>
      </Typography>
    </Stack>
  );
}

/** Joueur > Buts > Sur un match: best official single-match scoring performance per player. */
export function ButeursMatchGrid({ metric = 'buts' }: { metric?: 'buts' | 'passes' }) {
  const [rows, setRows] = useState<ButeurMatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchButeursParMatch(metric, controller.signal)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric]);

  return (
    <StatPlayerGrid<ButeurMatchRow>
      rows={rows}
      valueColumns={valueColumns(metric)}
      loading={loading}
      hideIdentityColumn
      getRowId={(row) => row.IDJOUEUR}
    />
  );
}
