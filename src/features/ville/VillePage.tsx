import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import { createVille, deleteVille, fetchVille, fetchVilleById, updateVille, canDeleteVille } from './villeApi';
import { fetchNatio } from '../natio/natioApi';
import { VilleFormDialog } from './VilleFormDialog';
import { createVilleColumns, createNatioMap } from './villeColumnsHelper';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { createAndOpenInTab, useEntityPage } from '../../components/useEntityPage';
import type { VilleRow } from './types';
import type { NatioRow } from '../natio/types';
import { buildVilleFormFields, detectVillePrimaryKey, resolveVilleId, resolveVilleLabel } from './villeUi';

interface VillePageProps {
  variant?: 'page' | 'modalPicker';
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

function toComparableId(value: unknown): string {
  return String(value);
}

export function VillePage({ variant = 'page', onOpenInTab }: VillePageProps) {
  const [natioDatas, setNatioDatas] = useState<NatioRow[]>([]);

  const page = useEntityPage<VilleRow>(
    {
      fetchAll: fetchVille,
      fetchById: fetchVilleById,
      create: createVille,
      update: updateVille,
      remove: deleteVille,
      canDelete: canDeleteVille,
    },
    {
      singular: 'ville',
      singularArticle: 'cette ville',
      created: 'Ville creee.',
      updated: 'Ville mise a jour.',
      deleted: 'Ville supprimee.',
      selectToOpen: 'Selectionnez une ville a ouvrir.',
      selectToDelete: 'Selectionnez une ville a supprimer.',
      noneSelected: 'Aucune ville selectionnee.',
    },
    () => {
      fetchNatio('').then((result) => setNatioDatas(result.data ?? [])).catch(() => {});
    },
  );

  const primaryKey = useMemo(() => detectVillePrimaryKey(page.rows), [page.rows]);
  const natioMap = useMemo(() => createNatioMap(natioDatas), [natioDatas]);
  const columns = useMemo<GridColDef[]>(() => createVilleColumns(natioMap), [natioMap]);

  const formFields = useMemo<string[]>(() => {
    const source = page.activeRow ?? page.rows[0];
    return buildVilleFormFields(source);
  }, [page.activeRow, page.rows]);

  const getRowId = (row: VilleRow): GridRowId => {
    if (primaryKey && (typeof row[primaryKey] === 'string' || typeof row[primaryKey] === 'number')) {
      return row[primaryKey] as GridRowId;
    }
    return JSON.stringify(row);
  };

  const openInTabFromRowId = (rowId: GridRowId) => {
    if (!onOpenInTab) return;
    const selectedRow = page.rows.find((row) => toComparableId(getRowId(row)) === toComparableId(rowId));
    const label = selectedRow ? resolveVilleLabel(selectedRow) : String(rowId);
    onOpenInTab({ rowId, label });
  };

  const handleOpen = () => {
    if (variant === 'modalPicker' && onOpenInTab) {
      const selectedId = page.selection.at(0);
      if (selectedId === undefined || selectedId === null) {
        page.setSnackbar({ severity: 'error', message: 'Selectionnez une ville a ouvrir.' });
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

  const handleFormSubmit = async (payload: VilleRow) => {
    if (variant === 'modalPicker' && onOpenInTab && page.dialogMode === 'create') {
      await createAndOpenInTab({
        create: createVille,
        payload,
        resolveId: resolveVilleId,
        resolveLabel: resolveVilleLabel,
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
      title="Villes"
      searchLabel="Rechercher une ville"
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
      entityDescription="cette ville"
      onConfirmDelete={() => void page.handleDelete()}
      onCloseDeleteConfirm={page.closeDeleteConfirm}
      formDialog={
        <VilleFormDialog
          open={page.dialogOpen}
          mode={page.dialogMode}
          fields={formFields}
          primaryKey={primaryKey}
          initialData={page.activeRow}
          natioDatas={natioDatas}
          onClose={() => page.setDialogOpen(false)}
          onSubmit={handleFormSubmit}
        />
      }
      snackbar={page.snackbar}
      onCloseSnackbar={() => page.setSnackbar(null)}
    />
  );
}
