import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { ClubIdentityInline } from '../../components/ClubIdentityInline';
import { toErrorMessage } from '../../components/useEntityPage';
import { formatDateFr } from '../../lib/formatDate';
import { ClubSelectionDialog } from '../competition/ClubSelectionDialog';
import type { ClubGridRow } from '../club/types';
import { fetchImportAssociations, importRencontres, saveImportAssociation } from './importApi';
import { rencontreImportStore, type ImportDraftRow } from './rencontreImportStore';

interface PendingAssociation {
  label: string;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function isRowReady(row: ImportDraftRow, resolve: (label: string) => string): boolean {
  const domicile = resolve(row.DOMICILE_LABEL);
  const exterieur = resolve(row.EXTERIEUR_LABEL);
  return Boolean(row.DATE) && Boolean(domicile) && Boolean(exterieur) && domicile !== exterieur;
}

/** Outils > Rencontres > Importer : grille temporaire de preparation avant insertion en base. */
export function RencontreImportPage() {
  const session = rencontreImportStore((state) => state.session);
  const clearSession = rencontreImportStore((state) => state.clear);

  const [associations, setAssociations] = useState<Map<string, { clubId: string; clubName: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pending, setPending] = useState<PendingAssociation | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchImportAssociations(controller.signal)
      .then((rows) => {
        setAssociations(new Map(rows
          .filter((row) => row.IMP_IDCLUB)
          .map((row) => [normalizeKey(row.IMP_NomClub), { clubId: row.IMP_IDCLUB, clubName: row.CLUB ?? row.IMP_IDCLUB }])));
      })
      .catch((error) => {
        if (!controller.signal.aborted) setErrorMessage(toErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const resolveClubId = useMemo(
    () => (label: string) => associations.get(normalizeKey(label))?.clubId ?? '',
    [associations],
  );

  const rows = session?.rows ?? [];
  const unresolvedLabels = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      [row.DOMICILE_LABEL, row.EXTERIEUR_LABEL].forEach((label) => {
        if (label && !resolveClubId(label)) set.add(label);
      });
    });
    return set;
  }, [rows, resolveClubId]);

  const readyCount = rows.filter((row) => isRowReady(row, resolveClubId)).length;
  const canImport = rows.length > 0 && readyCount === rows.length && !importing;

  const handleAssociate = async (clubIdInput: string, club?: ClubGridRow) => {
    if (!pending) return;
    const clubId = String(clubIdInput ?? '').trim();
    const clubName = String(club?.CLUB_ABREGE ?? '').trim() || clubId;
    try {
      await saveImportAssociation(pending.label, clubId);
      setAssociations((prev) => new Map(prev).set(normalizeKey(pending.label), { clubId, clubName }));
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const handleImport = async () => {
    if (!session) return;
    setImporting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const result = await importRencontres(session.tourId, session.saison, rows.map((row) => ({
        DATE: row.DATE,
        HEURE: row.HEURE,
        IDCIRC: row.IDCIRC,
        DOMICILE: resolveClubId(row.DOMICILE_LABEL),
        EXTERIEUR: resolveClubId(row.EXTERIEUR_LABEL),
        BUTDOM: row.BUTDOM,
        BUTEXT: row.BUTEXT,
        TABDOM: row.TABDOM,
        TABEXT: row.TABEXT,
        GROUPE: row.GROUPE,
      })));
      setSuccessMessage(`${result.imported} rencontre(s) importée(s), classement du tour recalculé.`);
      clearSession();
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    } finally {
      setImporting(false);
    }
  };

  const clubColumn = (field: 'DOMICILE_LABEL' | 'EXTERIEUR_LABEL', headerName: string): GridColDef<ImportDraftRow> => ({
    field,
    headerName,
    flex: 1,
    minWidth: 230,
    sortable: false,
    renderCell: (params) => {
      const label = params.row[field];
      const association = associations.get(normalizeKey(label));
      return (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0, width: '100%' }}>
          <Typography variant="body2" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label || '—'}
          </Typography>
          {association ? (
            <>
              <ClubIdentityInline
                clubId={association.clubId}
                clubName={association.clubName}
                size={20}
                sx={{ pointerEvents: 'none' }}
              />
              <Tooltip title={`Modifier l'association (actuellement ${association.clubName})`}>
                <IconButton
                  size="small"
                  color="primary"
                  aria-label={`Modifier l'association de ${label}`}
                  onClick={() => setPending({ label })}
                  sx={{ flexShrink: 0, p: 0.25 }}
                >
                  <LinkRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <Tooltip title="Associer ce nom à un club de la base">
              <Chip
                size="small"
                color="warning"
                icon={<LinkOffRoundedIcon />}
                label="Associer"
                onClick={() => setPending({ label })}
                disabled={!label}
              />
            </Tooltip>
          )}
        </Stack>
      );
    },
  });

  const columns: GridColDef<ImportDraftRow>[] = useMemo(() => [
    {
      field: 'DATE',
      headerName: 'Date',
      width: 105,
      valueGetter: (_value, row) => formatDateFr(row.DATE),
      renderCell: (params) => (
        <Typography variant="body2" color={params.row.DATE ? 'text.primary' : 'error.main'}>
          {params.row.DATE ? formatDateFr(params.row.DATE) : 'Date invalide'}
        </Typography>
      ),
    },
    { field: 'HEURE', headerName: 'Heure', width: 75 },
    { field: 'IDCIRC', headerName: 'Circonstance', width: 110 },
    clubColumn('DOMICILE_LABEL', 'Domicile'),
    clubColumn('EXTERIEUR_LABEL', 'Extérieur'),
    { field: 'BUTDOM', headerName: 'ButDom', width: 80, align: 'center', headerAlign: 'center' },
    { field: 'BUTEXT', headerName: 'ButExt', width: 80, align: 'center', headerAlign: 'center' },
    { field: 'TABDOM', headerName: 'TabDom', width: 80, align: 'center', headerAlign: 'center' },
    { field: 'TABEXT', headerName: 'TabExt', width: 80, align: 'center', headerAlign: 'center' },
    { field: 'GROUPE', headerName: 'Groupe', width: 110 },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [associations]);

  if (!session) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="info">
          {successMessage || 'Aucun import en cours. Utilisez Outils > Rencontres > Importer... pour démarrer.'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700 }}>Import de rencontres</Typography>
        <Typography variant="body2" color="text.secondary">
          {`${session.competitionLabel} · ${session.tourLabel} · ${session.fileName}`}
        </Typography>
      </Stack>

      {unresolvedLabels.size > 0 ? (
        <Alert severity="warning">
          {`${unresolvedLabels.size} nom(s) de club du fichier ne sont pas encore associés à un club de la base.`}
        </Alert>
      ) : null}
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

      <Box sx={{ height: 'calc(100vh - 300px)', minHeight: 380 }}>
        <DataGrid<ImportDraftRow>
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          density="compact"
          initialState={{ pagination: { paginationModel: { pageSize: 50, page: 0 } } }}
          pageSizeOptions={[25, 50, 100]}
          getRowClassName={(params) => (isRowReady(params.row, resolveClubId) ? '' : 'import-row-incomplete')}
          sx={{
            '& .import-row-incomplete': { bgcolor: 'warning.light', opacity: 0.85 },
            '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
          }}
        />
      </Box>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
        <Typography variant="body2" color={canImport ? 'success.main' : 'text.secondary'}>
          {`${readyCount} / ${rows.length} ligne(s) prête(s)`}
        </Typography>
        <Button variant="contained" onClick={handleImport} disabled={!canImport}>
          Importer
        </Button>
      </Stack>

      <ClubSelectionDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onSelect={(clubId, club) => void handleAssociate(clubId, club)}
      />
    </Box>
  );
}
