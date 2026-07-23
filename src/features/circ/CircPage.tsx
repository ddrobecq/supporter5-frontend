import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { canDeleteCirc, createCirc, deleteCirc, fetchCirc, fetchCircById, updateCirc } from './circApi';
import { CircFormDialog } from './CircFormDialog';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { createAndOpenInTab, useEntityPage } from '../../components/useEntityPage';
import { createCircColumns } from './circColumnsHelper';
import type { CircRow } from './types';
import { resolveCircId, resolveCircLabel } from './circUi';

interface CircPageProps {
  variant?: 'page' | 'modalPicker';
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

export function CircPage({ variant = 'page', onOpenInTab }: CircPageProps) {
  const page = useEntityPage<CircRow>(
    {
      fetchAll: fetchCirc,
      fetchById: fetchCircById,
      create: createCirc,
      update: updateCirc,
      remove: deleteCirc,
      canDelete: canDeleteCirc,
    },
    {
      singular: 'circonstance',
      singularArticle: 'cette circonstance',
      created: 'Circonstance creee.',
      updated: 'Circonstance mise a jour.',
      deleted: 'Circonstance supprimee.',
      selectToOpen: 'Selectionnez une circonstance a ouvrir.',
      selectToDelete: 'Selectionnez une circonstance a supprimer.',
      noneSelected: 'Aucune circonstance selectionnee.',
    },
  );

  const columns = useMemo<GridColDef[]>(() => createCircColumns(), []);
  const primaryKey = 'IDCIRC';

  const getRowId = (row: CircRow): GridRowId =>
    (typeof row.IDCIRC === 'string' || typeof row.IDCIRC === 'number')
      ? row.IDCIRC
      : JSON.stringify(row);

  const openInTabFromRowId = (rowId: GridRowId) => {
    if (!onOpenInTab) return;
    const selectedRow = page.rows.find((row) => String(getRowId(row)) === String(rowId));
    const label = selectedRow ? resolveCircLabel(selectedRow) : String(rowId);
    onOpenInTab({ rowId, label });
  };

  const handleOpen = () => {
    if (variant === 'modalPicker' && onOpenInTab) {
      const selectedId = page.selection.at(0);
      if (selectedId === undefined || selectedId === null) {
        page.setSnackbar({ severity: 'error', message: 'Selectionnez une circonstance a ouvrir.' });
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

  const handleFormSubmit = async (payload: CircRow) => {
    if (variant === 'modalPicker' && onOpenInTab && page.dialogMode === 'create') {
      await createAndOpenInTab({
        create: createCirc,
        payload,
        resolveId: resolveCircId,
        resolveLabel: resolveCircLabel,
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
      title="Circonstances"
      searchLabel="Rechercher une circonstance"
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
      entityDescription="cette circonstance"
      onConfirmDelete={() => void page.handleDelete()}
      onCloseDeleteConfirm={page.closeDeleteConfirm}
      formDialog={
        <CircFormDialog
          open={page.dialogOpen}
          mode={page.dialogMode}
          primaryKey={primaryKey}
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