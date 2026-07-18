import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { canDeleteCirc, createCirc, deleteCirc, fetchCirc, fetchCircById, updateCirc } from './circApi';
import { CircFormDialog } from './CircFormDialog';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { useEntityPage } from '../../components/useEntityPage';
import { createCircColumns } from './circColumnsHelper';
import type { CircRow } from './types';

export function CircPage() {
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

  return (
    <EntityPageLayout
      title="Circonstances"
      searchLabel="Rechercher une circonstance"
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
          onSubmit={page.handleFormSubmit}
        />
      }
      snackbar={page.snackbar}
      onCloseSnackbar={() => page.setSnackbar(null)}
    />
  );
}