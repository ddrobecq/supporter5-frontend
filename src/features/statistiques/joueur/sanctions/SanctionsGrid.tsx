import { Avatar, Link as MuiLink, Stack, Typography } from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { NatioFlag } from '../../../../components/NatioFlag';
import { JoueurClubIndicator } from '../../../../components/JoueurIdentityDisplay';
import { useEntityImage } from '../../../../lib/useEntityImage';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { fetchExclusionsRapides, fetchSanctions, fetchSanctionsParSaison, type ExclusionRapideRow, type SanctionRow, type SanctionSaisonRow } from './sanctionsApi';

type SanctionMetric = 'avertissements' | 'exclusions';

interface SanctionsGridProps {
  metric: SanctionMetric;
}

function label(metric: SanctionMetric): string {
  return metric === 'exclusions' ? 'Exclusions' : 'Avertissements';
}

export function SanctionsGrid({ metric }: SanctionsGridProps) {
  const [rows, setRows] = useState<SanctionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchSanctions(metric, controller.signal).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric]);

  const columns: GridColDef<SanctionRow>[] = [{
    field: 'BUTS', headerName: label(metric), width: 150, type: 'number', align: 'right', headerAlign: 'right',
  }];

  return <StatPlayerGrid<SanctionRow> rows={rows} valueColumns={columns} loading={loading} initialState={{ sorting: { sortModel: [{ field: 'BUTS', sort: 'desc' }] } }} />;
}

export function SanctionsParSaisonGrid({ metric }: SanctionsGridProps) {
  const [rows, setRows] = useState<SanctionSaisonRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchSanctionsParSaison(metric, controller.signal).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
    return () => controller.abort();
  }, [metric]);

  const columns: GridColDef<SanctionSaisonRow>[] = [
    { field: 'SAISON', headerName: 'Saison', width: 120 },
    { field: 'BUTS', headerName: label(metric), width: 150, type: 'number', align: 'right', headerAlign: 'right' },
  ];

  return (
    <StatPlayerGrid<SanctionSaisonRow>
      rows={rows}
      valueColumns={columns}
      loading={loading}
      getRowId={(row) => `${row.IDJOUEUR}-${row.SAISON}`}
      initialState={{ sorting: { sortModel: [{ field: 'BUTS', sort: 'desc' }] } }}
    />
  );
}

export function ExclusionsRapidesGrid() {
  const [rows, setRows] = useState<ExclusionRapideRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchExclusionsRapides(controller.signal).then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const columns: GridColDef<ExclusionRapideRow>[] = [{
    field: 'MINUTE',
    headerName: 'Exclusions les plus rapides',
    flex: 1,
    minWidth: 420,
    sortable: false,
    renderCell: (params) => <ExclusionRapideCell row={params.row} />,
  }];

  return <StatPlayerGrid<ExclusionRapideRow> rows={rows} valueColumns={columns} loading={loading} hideIdentityColumn initialState={{ sorting: { sortModel: [{ field: 'MINUTE', sort: 'asc' }] } }} />;
}

function ExclusionRapideCell({ row }: { row: ExclusionRapideRow }) {
  const { src } = useEntityImage('joueurrg', row.IDJOUEUR);
  const surnom = row.SURNOM?.trim();
  const nom = row.NOM?.trim() ? row.NOM.toUpperCase() : '';
  const prenom = row.PRENOM?.trim() ?? '';
  const nomJoueur = surnom || `${nom}${prenom ? ` ${prenom}` : ''}` || row.IDJOUEUR;
  const [year, month, day] = row.MATCH_DATE.split('-');
  const dateDisplay = `${day}/${month}/${year}`;

  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Avatar src={src ?? undefined} sx={{ width: 30, height: 30, bgcolor: 'grey.300', flexShrink: 0 }}>
        {!src && <PersonRoundedIcon sx={{ fontSize: 17 }} />}
      </Avatar>
      {row.IDNATIO ? <NatioFlag idnatio={row.IDNATIO} /> : null}
      <Typography variant="body2" sx={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <b>{nomJoueur}</b>
        {row.EN_CLUB ? <JoueurClubIndicator /> : null}
        {` exclu à la ${row.MINUTE}e minute le `}
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
          {dateDisplay}
        </MuiLink>
      </Typography>
    </Stack>
  );
}
