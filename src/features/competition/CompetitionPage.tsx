import type { GridRowId } from '@mui/x-data-grid';
import { MenuItem, TextField } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { toErrorMessage, useEntityPage } from '../../components/useEntityPage';
import {
  canDeleteCompetition,
  createCompetitionWithWizard,
  deleteCompetition,
  fetchCompetition,
  fetchCompetitionById,
  fetchCompetitionWizardData,
  updateCompetition,
} from './competitionApi';
import { CompetitionCreateWizardDialog } from './CompetitionCreateWizardDialog';
import { createCompetitionColumns } from './competitionColumnsHelper';
import { CompetitionFormDialog } from './CompetitionFormDialog';
import type { CompetitionRow, EpreuveOption, SaisonOption } from './types';
import { readLastSelectedSeason, writeLastSelectedSeason } from '../saison/lastSelectedSeason';

interface CompetitionPageProps {
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

type CompetitionListRow = CompetitionRow & {
  __isFinishedCompetition?: boolean;
};

const COMPETITION_COLUMNS = createCompetitionColumns().filter((col) => col.field !== 'IDEPREUVE');

const getCompetitionRowId = (row: CompetitionRow): GridRowId =>
  (typeof row.COCLEUNIK === 'string' || typeof row.COCLEUNIK === 'number')
    ? row.COCLEUNIK
    : JSON.stringify(row);

export function CompetitionPage({ onOpenInTab }: CompetitionPageProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [epreuveOptions, setEpreuveOptions] = useState<EpreuveOption[]>([]);
  const [saisonOptions, setSaisonOptions] = useState<SaisonOption[]>([]);
  // Start from the last season chosen during the session so the first load is already filtered.
  const [initialSeason] = useState(readLastSelectedSeason);
  const [selectedSeason, setSelectedSeason] = useState(initialSeason);
  const selectedSeasonRef = useRef(initialSeason);

  const resolveCompetitionLabel = (row: CompetitionRow, fallback: string): string => {
    const nom = String(row.NOM ?? '').trim();
    const saison = String(row.SAISON ?? '').trim();
    const combined = [nom, saison].filter((part) => part.length > 0).join(' ');
    return combined || fallback;
  };

  const page = useEntityPage<CompetitionRow>(
    {
      // The list is filtered by season only; the search text is not used.
      fetchAll: (_search, signal) => fetchCompetition('', selectedSeasonRef.current, signal),
      fetchById: fetchCompetitionById,
      create: async () => undefined,
      update: updateCompetition,
      remove: deleteCompetition,
      canDelete: canDeleteCompetition,
    },
    {
      singular: 'compétition',
      singularArticle: 'cette compétition',
      created: 'Compétition créée.',
      updated: 'Compétition mise à jour.',
      deleted: 'Compétition supprimée.',
      selectToOpen: 'Sélectionnez une compétition à ouvrir.',
      selectToDelete: 'Sélectionnez une compétition à supprimer.',
      noneSelected: 'Aucune compétition sélectionnée.',
    },
    ({ setSnackbar }) => {
      void fetchCompetitionWizardData()
        .then((result) => {
          setEpreuveOptions(result.epreuves);
          setSaisonOptions(result.saisons);
          const currentSeason = selectedSeasonRef.current;
          const isKnownSeason = currentSeason !== ''
            && result.saisons.some((item) => String(item.SAISON ?? '') === currentSeason);
          if (!isKnownSeason && result.saisons[0]?.SAISON) {
            const nextSeason = String(result.saisons[0].SAISON);
            selectedSeasonRef.current = nextSeason;
            setSelectedSeason(nextSeason);
          }
        })
        // Sans ces listes, le filtre saison et les formulaires (epreuve/saison) sont vides: on le signale.
        .catch((error: unknown) => setSnackbar({ severity: 'error', message: toErrorMessage(error) }));
    },
  );

  const seasonFilterOptions = useMemo(
    () => saisonOptions.map((item) => String(item.SAISON ?? '').trim()).filter(Boolean),
    [saisonOptions],
  );

  const displayRows = useMemo<CompetitionListRow[]>(
    () => page.rows.map((row) => ({
      ...row,
      __isFinishedCompetition: Number(row.CO_TERMINEE ?? 0) === 1,
    })),
    [page.rows],
  );

  const primaryKey = 'COCLEUNIK';

  const openInTabFromRowId = (rowId: GridRowId) => {
    if (!onOpenInTab) return;
    const selectedRow = page.rows.find((row) => String(getCompetitionRowId(row)) === String(rowId));
    const label = resolveCompetitionLabel(selectedRow ?? {}, String(rowId));
    onOpenInTab({ rowId, label });
  };

  const handleSeasonChange = (nextSeason: string) => {
    selectedSeasonRef.current = nextSeason;
    setSelectedSeason(nextSeason);
    page.setSelection([]);
    writeLastSelectedSeason(nextSeason);
    void page.reloadData();
  };

  // Recharger les données quand la saison sélectionnée change.
  useEffect(() => {
    if (!selectedSeason) return;
    void page.reloadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeason]);

  const handleOpen = () => {
    if (onOpenInTab) {
      const selectedId = page.selection.at(0);
      if (selectedId === undefined || selectedId === null) {
        page.setSnackbar({ severity: 'error', message: 'Sélectionnez une compétition à ouvrir.' });
        return;
      }
      openInTabFromRowId(selectedId);
      return;
    }
    void page.openEditDialog();
  };

  const handleRowDoubleClick = (rowId: GridRowId) => {
    if (onOpenInTab) {
      openInTabFromRowId(rowId);
      return;
    }
    void page.openEditDialog(rowId);
  };

  const handleCreated = async (createdId: string | number, label: string) => {
    await page.reloadData();
    setCreateDialogOpen(false);
    page.setSnackbar({ severity: 'success', message: 'Compétition créée.' });
    onOpenInTab?.({ rowId: createdId, label });
  };

  return (
    <EntityPageLayout
      hideTitle
      actionsInlineWithSearch
      title="Compétitions"
      searchLabel="Rechercher une compétition"
      search={page.search}
      onSearchChange={page.setSearch}
      searchInputRef={page.searchInputRef}
      searchControl={(
        <TextField
          select
          label="Saison"
          size="small"
          value={seasonFilterOptions.includes(selectedSeason) ? selectedSeason : ''}
          onChange={(event) => handleSeasonChange(event.target.value)}
          sx={{ width: { xs: '100%', sm: 210 } }}
        >
          {seasonFilterOptions.map((season) => (
            <MenuItem key={season} value={season}>{season}</MenuItem>
          ))}
        </TextField>
      )}
      onNew={() => setCreateDialogOpen(true)}
      onOpen={handleOpen}
      onDelete={() => void page.handleOpenDeleteConfirm()}
      actionButtonsRowRef={page.actionButtonsRowRef}
      compactActionButtons={page.compactActionButtons}
      rows={displayRows}
      columns={COMPETITION_COLUMNS}
      loading={page.loading}
      getRowId={getCompetitionRowId}
      selection={page.selection}
      onSelectionChange={page.setSelection}
      onRowDoubleClick={handleRowDoubleClick}
      getRowClassName={(params) => (params.row.__isFinishedCompetition ? 'competition-finished-row' : '')}
      confirmDeleteOpen={page.confirmDeleteOpen}
      deleteConstraints={page.deleteConstraints}
      entityDescription="cette compétition"
      onConfirmDelete={() => void page.handleDelete()}
      onCloseDeleteConfirm={page.closeDeleteConfirm}
      formDialog={(
        <>
          <CompetitionFormDialog
            open={page.dialogOpen}
            mode="edit"
            primaryKey={primaryKey}
            initialData={page.activeRow}
            epreuveOptions={epreuveOptions}
            saisonOptions={saisonOptions}
            onClose={() => page.setDialogOpen(false)}
            onSubmit={page.handleFormSubmit}
          />
          <CompetitionCreateWizardDialog
            open={createDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
            epreuveOptions={epreuveOptions}
            saisonOptions={saisonOptions}
            onCreate={async (payload) => {
              const created = await createCompetitionWithWizard(payload);
              const createdId = created?.COCLEUNIK;
              if (createdId === undefined || createdId === null || String(createdId).trim() === '') {
                throw new Error('Création réussie mais identifiant introuvable.');
              }
              const label = resolveCompetitionLabel(created ?? { NOM: payload.name, SAISON: payload.saison }, payload.name);
              await handleCreated(createdId, label);
            }}
            onError={(message) => page.setSnackbar({ severity: 'error', message })}
          />
        </>
      )}
      snackbar={page.snackbar}
      onCloseSnackbar={() => page.setSnackbar(null)}
    />
  );
}
