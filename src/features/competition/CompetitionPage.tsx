import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { MenuItem, TextField } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { useEntityPage } from '../../components/useEntityPage';
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

interface CompetitionPageProps {
  variant?: 'page' | 'modalPicker';
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

export function CompetitionPage({ variant = 'page', onOpenInTab }: CompetitionPageProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [epreuveOptions, setEpreuveOptions] = useState<EpreuveOption[]>([]);
  const [saisonOptions, setSaisonOptions] = useState<SaisonOption[]>([]);
  const [selectedSeason, setSelectedSeason] = useState('');
  const selectedSeasonRef = useRef('');

  const resolveCompetitionLabel = (row: CompetitionRow, fallback: string): string => {
    const nom = String(row.NOM ?? '').trim();
    const saison = String(row.SAISON ?? '').trim();
    const combined = [nom, saison].filter((part) => part.length > 0).join(' ');
    return combined || fallback;
  };

  const page = useEntityPage<CompetitionRow>(
    {
      fetchAll: (search, signal) => fetchCompetition(
        variant === 'modalPicker' ? '' : search,
        variant === 'modalPicker' ? selectedSeasonRef.current : undefined,
        signal,
      ),
      fetchById: fetchCompetitionById,
      create: async () => undefined,
      update: updateCompetition,
      remove: deleteCompetition,
      canDelete: canDeleteCompetition,
    },
    {
      singular: 'competition',
      singularArticle: 'cette competition',
      created: 'Competition creee.',
      updated: 'Competition mise a jour.',
      deleted: 'Competition supprimee.',
      selectToOpen: 'Selectionnez une competition a ouvrir.',
      selectToDelete: 'Selectionnez une competition a supprimer.',
      noneSelected: 'Aucune competition selectionnee.',
    },
    () => {
      void fetchCompetitionWizardData()
        .then((result) => {
          setEpreuveOptions(result.epreuves);
          setSaisonOptions(result.saisons);
          if (!selectedSeason && result.saisons[0]?.SAISON) {
            const nextSeason = String(result.saisons[0].SAISON);
            selectedSeasonRef.current = nextSeason;
            setSelectedSeason(nextSeason);
          }
        })
        .catch(() => {});
    },
  );

  const seasonFilterOptions = useMemo(
    () => saisonOptions.map((item) => String(item.SAISON ?? '').trim()).filter(Boolean),
    [saisonOptions],
  );

  const columns = useMemo<GridColDef[]>(() => {
    const base = createCompetitionColumns();
    if (variant === 'modalPicker') {
      return base.filter((col) => col.field !== 'IDEPREUVE');
    }
    return base;
  }, [variant]);
  const primaryKey = 'COCLEUNIK';

  const getRowId = (row: CompetitionRow): GridRowId =>
    (typeof row.COCLEUNIK === 'string' || typeof row.COCLEUNIK === 'number')
      ? row.COCLEUNIK
      : JSON.stringify(row);

  const openInTabFromRowId = (rowId: GridRowId) => {
    if (!onOpenInTab) return;
    const selectedRow = page.rows.find((row) => String(getRowId(row)) === String(rowId));
    const label = resolveCompetitionLabel(selectedRow ?? {}, String(rowId));
    onOpenInTab({ rowId, label });
  };

  const handleSeasonChange = (nextSeason: string) => {
    selectedSeasonRef.current = nextSeason;
    setSelectedSeason(nextSeason);
    page.setSelection([]);
    if (variant === 'modalPicker') {
      void page.reloadData();
    }
  };

  // Recharger les données quand la saison de sélection change en mode picker.
  useEffect(() => {
    if (variant !== 'modalPicker' || !selectedSeason) return;
    void page.reloadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeason, variant]);

  const handleOpen = () => {
    if (variant === 'modalPicker' && onOpenInTab) {
      const selectedId = page.selection.at(0);
      if (selectedId === undefined || selectedId === null) {
        page.setSnackbar({ severity: 'error', message: 'Selectionnez une competition a ouvrir.' });
        return;
      }
      openInTabFromRowId(selectedId);
      return;
    }
    void page.openEditDialog();
  };

  const handleRowDoubleClick = (rowId: GridRowId) => {
    if (variant === 'modalPicker' && onOpenInTab) {
      openInTabFromRowId(rowId);
      return;
    }
    void page.openEditDialog(rowId);
  };

  const handleCreated = async (createdId: string | number, label: string) => {
    await page.reloadData();
    setCreateDialogOpen(false);
    page.setSnackbar({ severity: 'success', message: 'Competition creee.' });

    if (variant === 'modalPicker' && onOpenInTab) {
      onOpenInTab({ rowId: createdId, label });
    }
  };

  return (
    <EntityPageLayout
      hideTitle={variant === 'modalPicker'}
      actionsInlineWithSearch={variant === 'modalPicker'}
      title="Competitions"
      searchLabel="Rechercher une competition"
      search={page.search}
      onSearchChange={page.setSearch}
      searchInputRef={page.searchInputRef}
      searchControl={variant === 'modalPicker' ? (
        <TextField
          select
          label="Saison"
          size="small"
          value={selectedSeason}
          onChange={(event) => handleSeasonChange(event.target.value)}
          sx={{ width: { xs: '100%', sm: 210 } }}
        >
          {seasonFilterOptions.map((season) => (
            <MenuItem key={season} value={season}>{season}</MenuItem>
          ))}
        </TextField>
      ) : undefined}
      onNew={() => setCreateDialogOpen(true)}
      onOpen={handleOpen}
      onDelete={() => void page.handleOpenDeleteConfirm()}
      actionButtonsRowRef={page.actionButtonsRowRef}
      compactActionButtons={page.compactActionButtons}
      rows={page.rows}
      columns={columns}
      loading={page.loading}
      getRowId={getRowId}
      selection={page.selection}
      onSelectionChange={page.setSelection}
      onRowDoubleClick={handleRowDoubleClick}
      confirmDeleteOpen={page.confirmDeleteOpen}
      deleteConstraints={page.deleteConstraints}
      entityDescription="cette competition"
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
                throw new Error('Creation reussie mais identifiant introuvable.');
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
