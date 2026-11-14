import { Alert, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import type { GridColDef, GridRowClassNameParams, GridRowId } from '@mui/x-data-grid';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityImageLabelCell } from '../../components/EntityImageLabelCell';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { toErrorMessage } from '../../components/useEntityPage';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { useNatioList } from '../natio/natioStore';
import { usePostesList } from './postesStore';
import { readLastSelectedSeason, writeLastSelectedSeason } from '../saison/lastSelectedSeason';
import { useDepsChanged } from '../../lib/useDepsChanged';
import {
  canDeleteJoueur,
  createJoueurWithWizard,
  deleteJoueur,
  fetchJoueurById,
  fetchJoueursGrid,
  fetchSaisons,
  updateJoueur,
} from './joueurApi';
import { JoueurFormDialog } from './JoueurFormDialog';
import { JoueurCreateWizardDialog } from './JoueurCreateWizardDialog';
import type { IntegrityConstraint, JoueurGridRow, JoueurRow, SaisonRow } from './types';

function detectSelectedRow(rows: JoueurGridRow[], selection: GridRowId[]): JoueurGridRow | undefined {
  const selected = selection.at(0);
  if (selected === undefined || selected === null) {
    return undefined;
  }
  return rows.find((row) => row.JOCLEUNIK === selected);
}

interface JoueurPageProps {
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
  filterPosteType?: number;
  initialSeason?: string;
}

const getJoueurRowId = (row: JoueurGridRow): GridRowId => row.JOCLEUNIK;

export function JoueurPage({ onOpenInTab, filterPosteType, initialSeason }: JoueurPageProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const actionButtonsRowRef = useRef<HTMLDivElement | null>(null);
  const [compactActionButtons, setCompactActionButtons] = useState(false);

  const [rows, setRows] = useState<JoueurGridRow[]>([]);
  const [seasons, setSeasons] = useState<SaisonRow[]>([]);
  const { rows: natioDatas } = useNatioList();
  const { rows: posteOptions } = usePostesList();
  const [selectedSeason, setSelectedSeason] = useState('');
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [activeRow, setActiveRow] = useState<JoueurRow | undefined>(undefined);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteConstraints, setDeleteConstraints] = useState<IntegrityConstraint[]>([]);

  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const selectedGridRow = useMemo(() => detectSelectedRow(rows, selection), [rows, selection]);

  const openInTabFromRowId = (rowId: GridRowId) => {
    if (!onOpenInTab) return;
    const row = rows.find((item) => item.JOCLEUNIK === rowId);
    if (!row) {
      setSnackbar({ severity: 'error', message: 'Joueur introuvable dans la grille.' });
      return;
    }
    const label = String(row.JOUEUR_NOM ?? '').trim() || String(row.IDJOUEUR);
    onOpenInTab({ rowId: row.IDJOUEUR, label });
  };

  const columns = useMemo<GridColDef<JoueurGridRow>[]>(() => [
    {
      field: 'JOUEUR_NOM',
      headerName: 'Joueur',
      flex: 1,
      minWidth: 260,
      sortable: true,
      renderCell: (params) => (
        <EntityImageLabelCell entityType="joueurrg" entityId={params.row.IDJOUEUR} label={String(params.value ?? '')} variant="avatar" />
      ),
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

  // Latest values for the seasons loading below, which runs once on mount only.
  const initialSeasonRef = useRef(initialSeason);
  const selectedSeasonRef = useRef(selectedSeason);
  useEffect(() => {
    initialSeasonRef.current = initialSeason;
    selectedSeasonRef.current = selectedSeason;
  }, [initialSeason, selectedSeason]);

  useEffect(() => {
    const controller = new AbortController();

    void fetchSaisons(controller.signal)
      .then((data) => {
        setSeasons(data);
        if (!selectedSeasonRef.current) {
          const initialSeason = initialSeasonRef.current;
          const isKnownSeason = (season: string) => data.some((s) => String(s.SAISON) === season);
          const storedSeason = readLastSelectedSeason();
          const target = initialSeason && isKnownSeason(initialSeason)
            ? initialSeason
            : storedSeason && isKnownSeason(storedSeason)
              ? storedSeason
              : data.length > 0 ? String(data[0].SAISON ?? '') : '';
          setSelectedSeason(target);
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

  // No season clears the grid while rendering, on the dependencies of the loading effect below.
  const gridDepsChanged = useDepsChanged([search, selectedSeason, filterPosteType]);
  if (gridDepsChanged && !selectedSeason) {
    setRows([]);
  }

  useEffect(() => {
    if (!selectedSeason) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      void fetchJoueursGrid(selectedSeason, search.trim(), controller.signal, filterPosteType)
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
  }, [search, selectedSeason, filterPosteType]);

  const openCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  const openEditDialog = async (rowId?: GridRowId) => {
    if (onOpenInTab) {
      const selectedId = rowId ?? selection.at(0);
      if (selectedId === undefined || selectedId === null) {
        setSnackbar({ severity: 'error', message: 'Sélectionnez un joueur à ouvrir.' });
        return;
      }
      openInTabFromRowId(selectedId);
      return;
    }

    const selectedId = rowId ?? selection.at(0);
    if (selectedId === undefined || selectedId === null) {
      setSnackbar({ severity: 'error', message: 'Sélectionnez un joueur à ouvrir.' });
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
      const data = await fetchJoueursGrid(selectedSeason, search.trim(), undefined, filterPosteType);
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
      if (dialogMode === 'edit') {
        const row = selectedGridRow;
        if (!row) {
          setSnackbar({ severity: 'error', message: 'Aucun joueur sélectionné.' });
          return;
        }
        await updateJoueur(row.IDJOUEUR, payload);
        setSnackbar({ severity: 'success', message: 'Joueur mis à jour.' });
      }

      setDialogOpen(false);
      await reloadGrid();
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  const handleCreateJoueur = async (payload: { nom: string; prenom?: string; natioId: string; posteId: number; alias?: string }) => {
    const created = await createJoueurWithWizard(payload);
    const rawCreatedId = created?.IDJOUEUR;
    if (rawCreatedId === undefined || rawCreatedId === null || String(rawCreatedId).trim() === '') {
      throw new Error('Création réussie mais identifiant introuvable.');
    }
    const createdId = String(rawCreatedId).trim();

    const label = `${String(created?.NOM ?? '').trim().toUpperCase()} ${String(created?.PRENOM ?? '').trim()}`.trim() || String(createdId);

    await reloadGrid();
    setCreateDialogOpen(false);
    setSnackbar({ severity: 'success', message: 'Joueur créé.' });
    onOpenInTab?.({ rowId: createdId, label });
  };

  const handleOpenDeleteConfirm = async () => {
    const row = selectedGridRow;
    if (!row) {
      setSnackbar({ severity: 'error', message: 'Sélectionnez un joueur à supprimer.' });
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
      setSnackbar({ severity: 'error', message: 'Sélectionnez un joueur à supprimer.' });
      return;
    }

    try {
      await deleteJoueur(row.IDJOUEUR);
      setSnackbar({ severity: 'success', message: 'Joueur supprimé.' });
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
        onChange={(event) => {
          const nextSeason = String(event.target.value);
          setSelectedSeason(nextSeason);
          writeLastSelectedSeason(nextSeason);
        }}
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
        hideTitle
        actionsInlineWithSearch
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
        getRowId={getJoueurRowId}
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
          <>
            <JoueurFormDialog
              open={dialogOpen}
              mode="edit"
              initialData={activeRow}
              natioDatas={natioDatas}
              posteOptions={posteOptions}
              onClose={() => setDialogOpen(false)}
              onSubmit={handleFormSubmit}
            />
            <JoueurCreateWizardDialog
              open={createDialogOpen}
              onClose={() => setCreateDialogOpen(false)}
              onCreate={handleCreateJoueur}
              onError={(message) => setSnackbar({ severity: 'error', message })}
            />
          </>
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
