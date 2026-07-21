import { Alert, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import type { GridColDef, GridRowClassNameParams, GridRowId } from '@mui/x-data-grid';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { toErrorMessage } from '../../components/useEntityPage';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { fetchNatio } from '../natio/natioApi';
import type { NatioRow } from '../natio/types';
import {
  canDeleteJoueur,
  createJoueur,
  deleteJoueur,
  fetchJoueurById,
  fetchJoueurPostes,
  fetchJoueursGrid,
  fetchSaisons,
  updateJoueur,
} from './joueurApi';
import { JoueurFormDialog } from './JoueurFormDialog';
import type { IntegrityConstraint, JoueurGridRow, JoueurRow, PosteOption, SaisonRow } from './types';

function detectSelectedRow(rows: JoueurGridRow[], selection: GridRowId[]): JoueurGridRow | undefined {
  const selected = selection.at(0);
  if (selected === undefined || selected === null) {
    return undefined;
  }
  return rows.find((row) => row.JOCLEUNIK === selected);
}

export function JoueurPage() {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const actionButtonsRowRef = useRef<HTMLDivElement | null>(null);
  const [compactActionButtons, setCompactActionButtons] = useState(false);

  const [rows, setRows] = useState<JoueurGridRow[]>([]);
  const [seasons, setSeasons] = useState<SaisonRow[]>([]);
  const [natioDatas, setNatioDatas] = useState<NatioRow[]>([]);
  const [posteOptions, setPosteOptions] = useState<PosteOption[]>([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [activeRow, setActiveRow] = useState<JoueurRow | undefined>(undefined);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteConstraints, setDeleteConstraints] = useState<IntegrityConstraint[]>([]);

  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const selectedGridRow = useMemo(() => detectSelectedRow(rows, selection), [rows, selection]);

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
    const row = actionButtonsRowRef.current;
    if (!row) return;

    const update = () => {
      const widthPerButton = (row.clientWidth - 16) / 3;
      setCompactActionButtons(widthPerButton < 120);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(row);

    return () => observer.disconnect();
  }, []);

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

    void fetchNatio('', controller.signal)
      .then((result) => setNatioDatas(result.data ?? []))
      .catch(() => {});

    void fetchJoueurPostes(controller.signal)
      .then((result) => setPosteOptions(result))
      .catch(() => {});

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

  const openCreateDialog = () => {
    setDialogMode('create');
    setActiveRow(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = async (rowId?: GridRowId) => {
    const selectedId = rowId ?? selection.at(0);
    if (selectedId === undefined || selectedId === null) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un joueur a ouvrir.' });
      return;
    }

    const row = rows.find((item) => item.JOCLEUNIK === selectedId);
    if (!row) {
      setSnackbar({ severity: 'error', message: 'Joueur introuvable dans la grille.' });
      return;
    }

    try {
      const details = await fetchJoueurById(row.IDJOUEUR);
      setDialogMode('edit');
      setActiveRow(details);
      setSelection([selectedId]);
      setDialogOpen(true);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  const reloadGrid = async () => {
    if (!selectedSeason) return;
    setLoading(true);
    try {
      const data = await fetchJoueursGrid(selectedSeason, search.trim());
      setRows(data);
      setSelection([]);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (payload: JoueurRow) => {
    try {
      if (dialogMode === 'create') {
        await createJoueur(payload);
        setSnackbar({ severity: 'success', message: 'Joueur cree.' });
      } else {
        const row = selectedGridRow;
        if (!row) {
          setSnackbar({ severity: 'error', message: 'Aucun joueur selectionne.' });
          return;
        }
        await updateJoueur(row.IDJOUEUR, payload);
        setSnackbar({ severity: 'success', message: 'Joueur mis a jour.' });
      }

      setDialogOpen(false);
      await reloadGrid();
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  const handleOpenDeleteConfirm = async () => {
    const row = selectedGridRow;
    if (!row) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un joueur a supprimer.' });
      return;
    }

    try {
      const result = await canDeleteJoueur(row.IDJOUEUR);
      setDeleteConstraints(result.constraints);
      setConfirmDeleteOpen(true);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  const handleDelete = async () => {
    const row = selectedGridRow;
    if (!row) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un joueur a supprimer.' });
      return;
    }

    try {
      await deleteJoueur(row.IDJOUEUR);
      setSnackbar({ severity: 'success', message: 'Joueur supprime.' });
      setConfirmDeleteOpen(false);
      setDeleteConstraints([]);
      await reloadGrid();
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      setConfirmDeleteOpen(false);
      setDeleteConstraints([]);
    }
  };

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
        onNew={openCreateDialog}
        onOpen={() => void openEditDialog()}
        onDelete={() => void handleOpenDeleteConfirm()}
        actionButtonsRowRef={actionButtonsRowRef}
        compactActionButtons={compactActionButtons}
        showActions
        rows={rows}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.JOCLEUNIK}
        selection={selection}
        onSelectionChange={setSelection}
        onRowDoubleClick={(rowId) => void openEditDialog(rowId)}
        getRowClassName={getRowClassName}
        confirmDeleteOpen={confirmDeleteOpen}
        deleteConstraints={deleteConstraints}
        entityDescription="ce joueur"
        onConfirmDelete={() => void handleDelete()}
        onCloseDeleteConfirm={() => {
          setConfirmDeleteOpen(false);
          setDeleteConstraints([]);
        }}
        formDialog={
          <JoueurFormDialog
            open={dialogOpen}
            mode={dialogMode}
            initialData={activeRow}
            natioDatas={natioDatas}
            posteOptions={posteOptions}
            onClose={() => setDialogOpen(false)}
            onSubmit={handleFormSubmit}
          />
        }
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
