import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { createDevise, deleteDevise, fetchDevise, fetchDeviseById, updateDevise, canDeleteDevise } from './deviseApi';
import { DeviseFormDialog } from './DeviseFormDialog';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { createAndOpenInTab, useEntityPage } from '../../components/useEntityPage';
import { createDeviseColumns } from './deviseColumnsHelper';
import type { DeviseRow } from './types';
import { resolveDeviseId, resolveDeviseLabel } from './deviseUi';

interface DevisePageProps {
  variant?: 'page' | 'modalPicker';
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

export function DevisePage({ variant = 'page', onOpenInTab }: DevisePageProps) {
  const page = useEntityPage<DeviseRow>(
    {
      fetchAll: fetchDevise,
      fetchById: fetchDeviseById,
      create: createDevise,
      update: updateDevise,
      remove: deleteDevise,
      canDelete: canDeleteDevise,
    },
    {
      singular: 'devise',
      singularArticle: 'cette devise',
      created: 'Devise creee.',
      updated: 'Devise mise a jour.',
      deleted: 'Devise supprimee.',
      selectToOpen: 'Selectionnez une devise a ouvrir.',
      selectToDelete: 'Selectionnez une devise a supprimer.',
      noneSelected: 'Aucune devise selectionnee.',
    },
  );

  const primaryKey = 'DVCLEUNIK';

  const columns = useMemo<GridColDef[]>(() => createDeviseColumns(), []);

  const getRowId = (row: DeviseRow): GridRowId =>
    (typeof row.DVCLEUNIK === 'string' || typeof row.DVCLEUNIK === 'number')
      ? row.DVCLEUNIK
      : JSON.stringify(row);

  const openInTabFromRowId = (rowId: GridRowId) => {
    if (!onOpenInTab) return;
    const selectedRow = page.rows.find((row) => String(getRowId(row)) === String(rowId));
    const label = selectedRow ? resolveDeviseLabel(selectedRow) : String(rowId);
    onOpenInTab({ rowId, label });
  };

  const handleOpen = () => {
    if (variant === 'modalPicker' && onOpenInTab) {
      const selectedId = page.selection.at(0);
      if (selectedId === undefined || selectedId === null) {
        page.setSnackbar({ severity: 'error', message: 'Selectionnez une devise a ouvrir.' });
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

  const handleFormSubmit = async (payload: DeviseRow) => {
    if (variant === 'modalPicker' && onOpenInTab && page.dialogMode === 'create') {
      await createAndOpenInTab({
        create: createDevise,
        payload,
        resolveId: resolveDeviseId,
        resolveLabel: resolveDeviseLabel,
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
      title="Devises"
      searchLabel="Rechercher une devise"
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
      entityDescription="cette devise"
      onConfirmDelete={() => void page.handleDelete()}
      onCloseDeleteConfirm={page.closeDeleteConfirm}
      formDialog={
        <DeviseFormDialog
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
