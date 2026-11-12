import { Stack, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { ClubCell } from '../../components/ClubCell';
import { toErrorMessage } from '../../components/useEntityPage';
import { formatDateFr } from '../../lib/formatDate';
import { MatchEtat } from '../../lib/matchStatus';
import { emitTabOpen } from '../../lib/useTabMetaEvents';
import { IncompletsView } from './IncompletsView';
import {
  RENCONTRE_INCOMPLETE_CATEGORIES,
  fetchRencontresIncompletes,
  type RencontreIncompleteRow,
} from './incompletsApi';

function matchLabel(row: RencontreIncompleteRow): string {
  const domicile = row.DOMICILE_NOM?.trim() || row.DOMICILE || '?';
  const exterieur = row.EXTERIEUR_NOM?.trim() || row.EXTERIEUR || '?';
  return `${domicile} - ${exterieur}`;
}

function openRencontreTab(row: RencontreIncompleteRow): void {
  if (row.RECLEUNIK == null) return;
  emitTabOpen(`/admin/rencontres/${encodeURIComponent(String(row.RECLEUNIK))}`, matchLabel(row));
}

/** Outils > Fiches incompletes > Rencontres incompletes. */
export function RencontresIncompletesPage() {
  const [rows, setRows] = useState<RencontreIncompleteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void fetchRencontresIncompletes(controller.signal)
      .then(setRows)
      .catch((error) => {
        if (!controller.signal.aborted) setErrorMessage(toErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const leadingColumns: GridColDef<RencontreIncompleteRow>[] = useMemo(() => [
    {
      field: 'DATE',
      headerName: 'Date',
      width: 100,
      valueGetter: (_value, row) => formatDateFr(row.DATE) || `#${row.MACLEUNIK ?? ''}`,
    },
    {
      field: 'rencontre',
      headerName: 'Rencontre',
      flex: 1,
      minWidth: 300,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%', minWidth: 0 }}>
          <ClubCell clubId={params.row.DOMICILE ?? ''} clubName={params.row.DOMICILE_NOM?.trim() || params.row.DOMICILE || '?'} />
          <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
            {Number(params.row.ETAT) === MatchEtat.Terminee ? `${params.row.BUTDOM ?? 0} - ${params.row.BUTEXT ?? 0}` : 'vs'}
          </Typography>
          <ClubCell clubId={params.row.EXTERIEUR ?? ''} clubName={params.row.EXTERIEUR_NOM?.trim() || params.row.EXTERIEUR || '?'} />
        </Stack>
      ),
    },
    {
      field: 'COMPET_NOM',
      headerName: 'Compétition',
      width: 190,
      valueGetter: (_value, row) => row.COMPET_NOM?.trim() || 'Amical',
    },
  ], []);

  return (
    <IncompletsView<RencontreIncompleteRow>
      stateKey="rencontres"
      title="Rencontres incomplètes"
      rows={rows}
      loading={loading}
      errorMessage={errorMessage}
      categories={RENCONTRE_INCOMPLETE_CATEGORIES}
      getRowId={(row) => row.ROW_KEY}
      leadingColumns={leadingColumns}
      onRowOpen={openRencontreTab}
      countLabel={(count) => `${count} rencontre(s)`}
    />
  );
}
