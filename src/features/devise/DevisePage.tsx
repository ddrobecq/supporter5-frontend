import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { createDevise, deleteDevise, fetchDevise, fetchDeviseById, updateDevise, canDeleteDevise } from './deviseApi';
import { DeviseFormDialog } from './DeviseFormDialog';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { useEntityPage } from '../../components/useEntityPage';
import { createDeviseColumns } from './deviseColumnsHelper';
import type { DeviseRow } from './types';

export function DevisePage() {
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

  return (
    <EntityPageLayout
      title="Devises"
      searchLabel="Rechercher une devise"
      search={page.search}
      onSearchChange={page.setSearch}
      searchInputRef={page.searchInputRef}
      onNew={page.openCreateDialog}
      onOpen={() => void page.openEditDialog()}
      onDelete={() => void page.handleOpenDeleteConfirm()}
      actionButtonsRowRef={page.actionButtonsRowRef}
      compactActionButtons={page.compactActionButtons}
      rows={page.rows}
      columns={columns}
      loading={page.loading}
      getRowId={getRowId}
      selection={page.selection}
      onSelectionChange={page.setSelection}
      onRowDoubleClick={(rowId) => void page.openEditDialog(rowId)}
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
          onSubmit={page.handleFormSubmit}
        />
      }
      snackbar={page.snackbar}
      onCloseSnackbar={() => page.setSnackbar(null)}
    />
  );
}
