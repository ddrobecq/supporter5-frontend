import { Alert, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import type { GridColDef, GridRowClassNameParams, GridRowId } from '@mui/x-data-grid';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { toErrorMessage } from '../../components/useEntityPage';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { fetchJoueursGrid, fetchSaisons } from './joueurApi';
import type { JoueurGridRow, SaisonRow } from './types';

function useCompactButtonsFallback() {
  const actionButtonsRowRef = useRef<HTMLDivElement | null>(null);
  return { actionButtonsRowRef, compactActionButtons: false };
}

export function JoueurPage() {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { actionButtonsRowRef, compactActionButtons } = useCompactButtonsFallback();
  const [rows, setRows] = useState<JoueurGridRow[]>([]);
  const [seasons, setSeasons] = useState<SaisonRow[]>([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const columns = useMemo<GridColDef<JoueurGridRow>[]>(() => [
    {
      field: 'JOUEUR_NOM',
      headerName: 'Joueur',
      flex: 1,
      minWidth: 260,
      sortable: true,
    },
    {
      field: 'POSTE_NOM',
      headerName: 'Poste',
      minWidth: 180,
      flex: 0.45,
      sortable: true,
    },
  ], []);

  const getRowClassName = (params: GridRowClassNameParams<JoueurGridRow>): string => {
    if (params.row.LAST_TRANSAC_SAISON !== selectedSeason) {
      return '';
    }

    const lastStatus = Number(params.row.LAST_TRANSAC_STATUT);
    const lastType = Number(params.row.LAST_TRANSAC_TYPE);

    if (lastStatus === 1) {
      return lastType === 3 ? 'joueur-sortie-pret' : 'joueur-sortie';
    }

    if (lastStatus === 2) {
      return lastType === 3 ? 'joueur-arrivee-pret' : 'joueur-arrivee';
    }

    return '';
  };

  useEffect(() => {
    const controller = new AbortController();

    void fetchSaisons(controller.signal)
      .then((data) => {
        setSeasons(data);
        if (!selectedSeason && data.length > 0) {
          setSelectedSeason(String(data[0].SAISON ?? ''));
        }
      })
      .catch((error: unknown) => {
        if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') {
          return;
        }
        setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedSeason) {
      setRows([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      void fetchJoueursGrid(selectedSeason, search.trim(), controller.signal)
        .then((data) => {
          setRows(data);
          setSelection([]);
        })
        .catch((error: unknown) => {
          if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') {
            return;
          }
          setSnackbar({ severity: 'error', message: toErrorMessage(error) });
        })
        .finally(() => setLoading(false));
    }, 320);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [search, selectedSeason]);

  const headerExtra = (
    <FormControl size="small" sx={{ width: { xs: 132, md: 170 }, flexShrink: 0 }}>
      <InputLabel id="joueurs-saison-label">Saison</InputLabel>
      <Select
        labelId="joueurs-saison-label"
        label="Saison"
        value={selectedSeason}
        onChange={(event) => setSelectedSeason(String(event.target.value))}
      >
        {seasons.map((season) => (
          <MenuItem key={season.SAISON} value={season.SAISON}>
            {season.SAISON}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <>
      <EntityPageLayout
        title="Joueurs"
        searchLabel="Rechercher un joueur"
        search={search}
        onSearchChange={setSearch}
        searchInputRef={searchInputRef}
        headerExtra={headerExtra}
        onNew={() => undefined}
        onOpen={() => undefined}
        onDelete={() => undefined}
        actionButtonsRowRef={actionButtonsRowRef}
        compactActionButtons={compactActionButtons}
        showActions={false}
        rows={rows}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.JOCLEUNIK}
        selection={selection}
        onSelectionChange={setSelection}
        onRowDoubleClick={() => undefined}
        getRowClassName={getRowClassName}
        confirmDeleteOpen={false}
        deleteConstraints={[]}
        entityDescription="ce joueur"
        onConfirmDelete={() => undefined}
        onCloseDeleteConfirm={() => undefined}
        formDialog={null}
        snackbar={snackbar}
        onCloseSnackbar={() => setSnackbar(null)}
        
      />
      {!selectedSeason && seasons.length === 0 ? <Alert severity="info">Aucune saison disponible.</Alert> : null}
      <style>
        {`
          .MuiDataGrid-row.joueur-sortie .MuiDataGrid-cell {
            color: #9e9e9e;
          }

          .MuiDataGrid-row.joueur-sortie-pret .MuiDataGrid-cell {
            color: #ef6c00;
          }

          .MuiDataGrid-row.joueur-arrivee .MuiDataGrid-cell {
            color: #1565c0;
          }

          .MuiDataGrid-row.joueur-arrivee-pret .MuiDataGrid-cell {
            color: #42a5f5;
          }
        `}
      </style>
    </>
  );
}
