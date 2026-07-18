import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { canDeleteEpreuve, createEpreuve, deleteEpreuve, fetchEpreuve, fetchEpreuveById, updateEpreuve } from './epreuveApi';
import { EpreuveFormDialog } from './EpreuveFormDialog';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { useEntityPage } from '../../components/useEntityPage';
import { createEpreuveColumns } from './epreuveColumnsHelper';
import type { EpreuveRow } from './types';

export function EpreuvePage() {
  const page = useEntityPage<EpreuveRow>(
    {
      fetchAll: fetchEpreuve,
      fetchById: fetchEpreuveById,
      create: createEpreuve,
      update: updateEpreuve,
      remove: deleteEpreuve,
      canDelete: canDeleteEpreuve,
    },
    {
      singular: 'épreuve',
      singularArticle: 'cette épreuve',
      created: 'Epreuve créée.',
      updated: 'Epreuve mise à jour.',
      deleted: 'Epreuve supprimée.',
      selectToOpen: 'Sélectionnez une épreuve à ouvrir.',
      selectToDelete: 'Sélectionnez une épreuve à supprimer.',
      noneSelected: 'Aucune épreuve sélectionnée.',
    },
  );

  const columns = useMemo<GridColDef[]>(() => createEpreuveColumns(), []);
  const primaryKey = 'IDEPREUVE';

  const getRowId = (row: EpreuveRow): GridRowId =>
    (typeof row.IDEPREUVE === 'string' || typeof row.IDEPREUVE === 'number')
      ? row.IDEPREUVE
      : JSON.stringify(row);

  return (
    <EntityPageLayout
      title="Epreuves"
      searchLabel="Rechercher une épreuve"
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
      entityDescription="cette épreuve"
      onConfirmDelete={() => void page.handleDelete()}
      onCloseDeleteConfirm={page.closeDeleteConfirm}
      formDialog={
        <EpreuveFormDialog
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