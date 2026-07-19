import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import {
  Alert,
  Box,
  Card,
  CardContent,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useEntityImage } from '../../lib/useEntityImage';
import { fetchCalendarByDate } from './calendrierApi';
import type { CalendrierRow } from './types';

function formatInputDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDate(date: string, deltaDays: number): string {
  const [year, month, day] = date.split('-').map((part) => Number(part));
  const base = new Date(year, month - 1, day);
  base.setDate(base.getDate() + deltaDays);
  return formatInputDate(base);
}

function mapStatus(etat: number): string {
  switch (Number(etat)) {
    case 1:
      return 'En attente';
    case 2:
      return 'En cours';
    case 3:
      return 'Terminée';
    case 4:
      return 'Non jouée';
    case 5:
      return 'Programmée';
    default:
      return `État ${etat}`;
  }
}

function formatScore(row: CalendrierRow): string {
  const tabDom = Number(row.TABDOM ?? 0);
  const butDom = Number(row.BUTDOM ?? 0);
  const butExt = Number(row.BUTEXT ?? 0);
  const tabExt = Number(row.TABEXT ?? 0);

  const hasPenalties = tabDom > 0 || tabExt > 0;
  if (hasPenalties) {
    return `${tabDom} (${butDom} - ${butExt}) ${tabExt}`;
  }
  return `${butDom} - ${butExt}`;
}

function formatHeure(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const raw = String(value ?? '').trim();
  if (!raw || raw.toLowerCase() === 'null' || raw.toLowerCase() === 'undefined') return '';

  const parts = raw.split(':');
  const hh = parts[0] ?? '';
  const mm = parts[1] ?? '';

  if (hh.length === 0 || mm.length === 0) {
    return raw;
  }

  const hh2 = hh.padStart(2, '0').slice(-2);
  const mm2 = mm.padStart(2, '0').slice(0, 2);
  return `${hh2}h${mm2}`;
}

function ClubCell({
  clubId,
  clubName,
  alignRight = false,
}: {
  clubId: string;
  clubName: string;
  alignRight?: boolean;
}) {
  const { src } = useEntityImage('club', clubId);

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: alignRight ? 'flex-end' : 'flex-start' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        {alignRight ? (
          <>
            <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{clubName}</Box>
            <Box
              sx={{
                width: 22,
                height: 22,
                minWidth: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {src ? (
                <Box
                  component="img"
                  src={src}
                  alt={clubName}
                  sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <ShieldOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              )}
            </Box>
          </>
        ) : (
          <>
            <Box
              sx={{
                width: 22,
                height: 22,
                minWidth: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {src ? (
                <Box
                  component="img"
                  src={src}
                  alt={clubName}
                  sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <ShieldOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              )}
            </Box>
            <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clubName}</Box>
          </>
        )}
      </Stack>
    </Box>
  );
}

export function CalendrierPage() {
  const [date, setDate] = useState<string>(() => formatInputDate(new Date()));
  const [rows, setRows] = useState<CalendrierRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void fetchCalendarByDate(date, controller.signal)
      .then((data) => setRows(data))
      .catch((err: unknown) => {
        if ((err as { code?: string })?.code === 'ERR_CANCELED') return;
        setError('Impossible de charger le calendrier.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [date]);

  const columns = useMemo<GridColDef<CalendrierRow>[]>(() => [
    {
      field: 'ETAT',
      headerName: 'Statut',
      width: 90,
      sortable: false,
      renderCell: (params) => mapStatus(Number(params.row.ETAT)),
    },
    {
      field: 'HEURE',
      headerName: 'Heure',
      width: 70,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => formatHeure(params.row.HEURE),
    },
    {
      field: 'DOMICILE_NOM',
      headerName: 'Domicile',
      minWidth: 120,
      flex: 1,
      sortable: false,
      renderCell: (params) => (
        <ClubCell
          clubId={String(params.row.DOMICILE ?? '')}
          clubName={String(params.row.DOMICILE_NOM ?? '')}
          alignRight
        />
      ),
    },
    {
      field: 'SCORE',
      headerName: 'Score',
      width: 160,
      sortable: false,
      renderCell: (params) => formatScore(params.row),
    },
    {
      field: 'EXTERIEUR_NOM',
      headerName: 'Extérieur',
      minWidth: 120,
      flex: 1,
      sortable: false,
      renderCell: (params) => (
        <ClubCell clubId={String(params.row.EXTERIEUR ?? '')} clubName={String(params.row.EXTERIEUR_NOM ?? '')} />
      ),
    },
  ], []);

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', width: '100%', flexWrap: 'nowrap' }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>Calendrier</Typography>

        <Box
          sx={{
            ml: 'auto',
            flex: 1,
            minWidth: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '1px', flexWrap: 'nowrap' }}>
            <IconButton
              color="primary"
              aria-label="Précédent"
              onClick={() => setDate((current) => shiftDate(current, -1))}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flex: '0 0 auto' }}
            >
              <ChevronLeftRoundedIcon />
            </IconButton>

            <TextField
              inputRef={dateInputRef}
              type="date"
              size="small"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              sx={{ width: { xs: '42vw', sm: 160 }, minWidth: 120, maxWidth: 170, flex: '0 0 auto' }}
            />

            <IconButton
              color="primary"
              aria-label="Suivant"
              onClick={() => setDate((current) => shiftDate(current, 1))}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flex: '0 0 auto' }}
            >
              <ChevronRightRoundedIcon />
            </IconButton>
          </Box>
        </Box>
      </Stack>

      <Card>
        <CardContent>
          {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}

          <Box sx={{ mt: 2, height: 'calc(100vh - 270px)', minHeight: 420 }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              getRowId={(row) => row.RECLEUNIK}
              disableRowSelectionOnClick
              disableColumnMenu
              density="compact"
              pageSizeOptions={[25, 50, 100]}
              sx={{ '& .MuiDataGrid-cell': { cursor: 'default' } }}
            />
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}