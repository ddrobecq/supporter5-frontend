import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { createAndOpenInTab, useEntityPage } from '../../components/useEntityPage';
import { TourDefFormDialog } from './TourDefFormDialog';
import { createTourDefColumns } from './tourDefColumnsHelper';
import { canDeleteTourDef, createTourDef, deleteTourDef, fetchTourDefById, fetchTourDefs, updateTourDef } from './tourDefApi';
import type { TourDefRow } from './types';
import { resolveTourDefId, resolveTourDefLabel } from './tourDefUi';

interface TourDefPageProps {
  variant?: 'page' | 'modalPicker';
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

export function TourDefPage({ variant = 'page', onOpenInTab }: TourDefPageProps) {
  const page = useEntityPage<TourDefRow>(
    {
      fetchAll: fetchTourDefs,
      fetchById: fetchTourDefById,
      create: createTourDef,
      update: updateTourDef,
      remove: deleteTourDef,
      canDelete: canDeleteTourDef,
    },
    {
      singular: 'definition de tour',
      singularArticle: 'cette definition de tour',
      created: 'Definition de tour creee.',
      updated: 'Definition de tour mise a jour.',
      deleted: 'Definition de tour supprimee.',
      selectToOpen: 'Selectionnez une definition de tour a ouvrir.',
      selectToDelete: 'Selectionnez une definition de tour a supprimer.',
      noneSelected: 'Aucune definition de tour selectionnee.',
    },
  );

  const columns = useMemo<GridColDef[]>(() => createTourDefColumns(), []);

  const getRowId = (row: TourDefRow): GridRowId =>
    (typeof row.TDCLEUNIK === 'string' || typeof row.TDCLEUNIK === 'number')
      ? row.TDCLEUNIK
      : JSON.stringify(row);

  const openInTabFromRowId = (rowId: GridRowId) => {
    if (!onOpenInTab) return;
    const selectedRow = page.rows.find((row) => String(getRowId(row)) === String(rowId));
    const label = selectedRow ? resolveTourDefLabel(selectedRow) : String(rowId);
    onOpenInTab({ rowId, label });
  };

  const handleOpen = () => {
    if (variant === 'modalPicker' && onOpenInTab) {
      const selectedId = page.selection.at(0);
      if (selectedId === undefined || selectedId === null) {
        page.setSnackbar({ severity: 'error', message: 'Selectionnez une definition de tour a ouvrir.' });
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

  const handleFormSubmit = async (payload: TourDefRow) => {
    if (variant === 'modalPicker' && onOpenInTab && page.dialogMode === 'create') {
      await createAndOpenInTab({
        create: createTourDef,
        payload,
        resolveId: resolveTourDefId,
        resolveLabel: resolveTourDefLabel,
        closeDialog: () => page.setDialogOpen(false),
        onOpenInTab,
        setSnackbar: page.setSnackbar,
      });
      return;
    }

    await page.handleFormSubmit(payload);
  };

  return (
    <EntityPageLayout
      hideTitle={variant === 'modalPicker'}
      actionsInlineWithSearch={variant === 'modalPicker'}
      title="Definitions de Tour"
      searchLabel="Rechercher une definition de tour"
      search={page.search}
      onSearchChange={page.setSearch}
      searchInputRef={page.searchInputRef}
      onNew={page.openCreateDialog}
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
      entityDescription="cette definition de tour"
      onConfirmDelete={() => void page.handleDelete()}
      onCloseDeleteConfirm={page.closeDeleteConfirm}
      formDialog={
        <TourDefFormDialog
          open={page.dialogOpen}
          mode={page.dialogMode}
          primaryKey="TDCLEUNIK"
          initialData={page.activeRow}
          onClose={() => page.setDialogOpen(false)}
          onSubmit={handleFormSubmit}
        />
      }
      snackbar={page.snackbar}
      onCloseSnackbar={() => page.setSnackbar(null)}
    />
  );
}
