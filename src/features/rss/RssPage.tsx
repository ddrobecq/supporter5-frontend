import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { createAndOpenInTab, useEntityPage } from '../../components/useEntityPage';
import { RssFormDialog } from './RssFormDialog';
import { createRssColumns } from './rssColumnsHelper';
import { canDeleteRss, createRss, deleteRss, fetchRss, fetchRssById, updateRss } from './rssApi';
import { resolveRssId, resolveRssLabel } from './rssUi';
import type { RssRow } from './types';

interface RssPageProps {
  variant?: 'page' | 'modalPicker';
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

export function RssPage({ variant = 'page', onOpenInTab }: RssPageProps) {
  const params = useParams<{ rssId?: string }>();
  const rssId = params.rssId;

  if (variant === 'page' && !rssId) {
    return <Navigate to="/admin/home" replace />;
  }

  const page = useEntityPage<RssRow>(
    {
      fetchAll: fetchRss,
      fetchById: fetchRssById,
      create: createRss,
      update: updateRss,
      remove: deleteRss,
      canDelete: canDeleteRss,
    },
    {
      singular: 'flux RSS',
      singularArticle: 'ce flux RSS',
      created: 'Flux RSS cree.',
      updated: 'Flux RSS mis a jour.',
      deleted: 'Flux RSS supprime.',
      selectToOpen: 'Selectionnez un flux RSS a ouvrir.',
      selectToDelete: 'Selectionnez un flux RSS a supprimer.',
      noneSelected: 'Aucun flux RSS selectionne.',
    },
  );

  const columns = useMemo<GridColDef[]>(() => createRssColumns(), []);
  const primaryKey = 'RSSID';

  const getRowId = (row: RssRow): GridRowId =>
    (typeof row.RSSID === 'string' || typeof row.RSSID === 'number')
      ? row.RSSID
      : JSON.stringify(row);

  const openInTabFromRowId = (rowId: GridRowId) => {
    if (!onOpenInTab) return;
    const selectedRow = page.rows.find((row) => String(getRowId(row)) === String(rowId));
    const label = selectedRow ? resolveRssLabel(selectedRow) : String(rowId);
    onOpenInTab({ rowId, label });
  };

  const handleOpen = () => {
    if (variant === 'modalPicker' && onOpenInTab) {
      const selectedId = page.selection.at(0);
      if (selectedId === undefined || selectedId === null) {
        page.setSnackbar({ severity: 'error', message: 'Selectionnez un flux RSS a ouvrir.' });
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

  const handleFormSubmit = async (payload: RssRow) => {
    if (variant === 'modalPicker' && onOpenInTab && page.dialogMode === 'create') {
      await createAndOpenInTab({
        create: createRss,
        payload,
        resolveId: resolveRssId,
        resolveLabel: resolveRssLabel,
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
      title="Flux RSS"
      searchLabel="Rechercher un flux RSS"
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
      entityDescription="ce flux RSS"
      onConfirmDelete={() => void page.handleDelete()}
      onCloseDeleteConfirm={page.closeDeleteConfirm}
      formDialog={
        <RssFormDialog
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
