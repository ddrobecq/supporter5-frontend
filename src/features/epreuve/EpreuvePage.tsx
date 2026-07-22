import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { canDeleteEpreuve, createEpreuve, deleteEpreuve, fetchEpreuve, fetchEpreuveById, updateEpreuve } from './epreuveApi';
import { EpreuveFormDialog } from './EpreuveFormDialog';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { useEntityPage } from '../../components/useEntityPage';
import { createEpreuveColumns } from './epreuveColumnsHelper';
import type { EpreuveRow } from './types';

interface EpreuvePageProps {
  variant?: 'page' | 'modalPicker';
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

export function EpreuvePage({ variant = 'page', onOpenInTab }: EpreuvePageProps) {
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
      created: 'Épreuve créée.',
      updated: 'Épreuve mise à jour.',
      deleted: 'Épreuve supprimée.',
      selectToOpen: 'Sélectionnez une Épreuve à ouvrir.',
      selectToDelete: 'Sélectionnez une Épreuve à supprimer.',
      noneSelected: 'Aucune Épreuve sélectionnée.',
    },
  );

  const columns = useMemo<GridColDef[]>(() => createEpreuveColumns(), []);
  const primaryKey = 'IDEPREUVE';

  const getRowId = (row: EpreuveRow): GridRowId =>
    (typeof row.IDEPREUVE === 'string' || typeof row.IDEPREUVE === 'number')
      ? row.IDEPREUVE
      : JSON.stringify(row);

  const openInTabFromRowId = (rowId: GridRowId) => {
    if (!onOpenInTab) return;
    const selectedRow = page.rows.find((row) => String(getRowId(row)) === String(rowId));
    const label = String(selectedRow?.EPREUVE ?? '').trim() || String(rowId);
    onOpenInTab({ rowId, label });
  };

  const handleOpen = () => {
    if (variant === 'modalPicker' && onOpenInTab) {
      const selectedId = page.selection.at(0);
      if (selectedId === undefined || selectedId === null) {
        page.setSnackbar({ severity: 'error', message: 'Selectionnez une epreuve a ouvrir.' });
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

  return (
    <EntityPageLayout
      hideTitle={variant === 'modalPicker'}
      actionsInlineWithSearch={variant === 'modalPicker'}
      title="Épreuves"
      searchLabel="Rechercher une Épreuve"
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