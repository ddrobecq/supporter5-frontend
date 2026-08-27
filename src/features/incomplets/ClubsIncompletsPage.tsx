import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import { Avatar, Stack, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { NatioFlag } from '../../components/NatioFlag';
import { toErrorMessage } from '../../components/useEntityPage';
import { useEntityImage } from '../../lib/useEntityImage';
import { IncompletsView } from './IncompletsView';
import { CLUB_INCOMPLET_CATEGORIES, fetchClubsIncomplets, type ClubIncompletRow } from './incompletsApi';

function ClubIdentityCell({ row }: { row: ClubIncompletRow }) {
  const { src } = useEntityImage('club', row.IDCLUB);
  const natio = row.IDNATIO?.trim();

  return (
    <Stack direction="row" spacing={0.9} sx={{ alignItems: 'center', minWidth: 0, height: '100%' }}>
      <Avatar src={src ?? undefined} sx={{ width: 26, height: 26, bgcolor: 'action.hover', flexShrink: 0 }}>
        {!src ? <ShieldRoundedIcon sx={{ fontSize: 16 }} /> : null}
      </Avatar>
      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {row.CLUB?.trim() || row.IDCLUB}
      </Typography>
      {natio ? <NatioFlag idnatio={natio} /> : null}
    </Stack>
  );
}

function openClubTab(row: ClubIncompletRow): void {
  window.dispatchEvent(new CustomEvent('supporter:tab-open', {
    detail: {
      path: `/admin/clubs/${encodeURIComponent(row.IDCLUB)}`,
      label: row.CLUB?.trim() || row.IDCLUB,
      unique: true,
      uniqueByPath: true,
    },
  }));
}

/** Outils > Fiches incompletes > Clubs incomplets. */
export function ClubsIncompletsPage() {
  const [rows, setRows] = useState<ClubIncompletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void fetchClubsIncomplets(controller.signal)
      .then(setRows)
      .catch((error) => {
        if (!controller.signal.aborted) setErrorMessage(toErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const leadingColumns: GridColDef<ClubIncompletRow>[] = useMemo(() => [{
    field: 'club',
    headerName: 'Club',
    flex: 1,
    minWidth: 240,
    sortable: false,
    renderCell: (params) => <ClubIdentityCell row={params.row} />,
  }], []);

  return (
    <IncompletsView<ClubIncompletRow>
      title="Clubs incomplets"
      rows={rows}
      loading={loading}
      errorMessage={errorMessage}
      categories={CLUB_INCOMPLET_CATEGORIES}
      getRowId={(row) => row.IDCLUB}
      leadingColumns={leadingColumns}
      onRowOpen={openClubTab}
      countLabel={(count) => `${count} club(s)`}
    />
  );
}
