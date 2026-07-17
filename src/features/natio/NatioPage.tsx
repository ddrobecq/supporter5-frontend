import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { createNatio, deleteNatio, fetchNatio, fetchNatioById, updateNatio, canDeleteNatio } from './natioApi';
import { NatioFormDialog } from './NatioFormDialog';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { useEntityPage } from '../../components/useEntityPage';
import type { NatioRow } from './types';

const PK_CANDIDATES = ['IDNATIO', 'NATIO', 'ID', 'id', 'CODE'];

function detectPrimaryKey(rows: NatioRow[]): string | undefined {
  const firstRow = rows[0];
  if (!firstRow) return undefined;
  const keys = Object.keys(firstRow);
  const candidate = PK_CANDIDATES.find((pk) => keys.includes(pk));
  return candidate ?? keys[0];
}

export function NatioPage() {
  const page = useEntityPage<NatioRow>(
    {
      fetchAll: fetchNatio,
      fetchById: fetchNatioById,
      create: createNatio,
      update: updateNatio,
      remove: deleteNatio,
      canDelete: canDeleteNatio,
    },
    {
      singular: 'pays',
      singularArticle: 'ce pays',
      created: 'Pays cree.',
      updated: 'Pays mis a jour.',
      deleted: 'Pays supprime.',
      selectToOpen: 'Selectionnez un pays a ouvrir.',
      selectToDelete: 'Selectionnez un pays a supprimer.',
      noneSelected: 'Aucun pays selectionne.',
    },
  );

  const primaryKey = useMemo(() => detectPrimaryKey(page.rows), [page.rows]);

  const columns = useMemo<GridColDef[]>(() => {
    const first = page.rows[0];
    if (!first) return [];
    const allFields = Object.keys(first);
    const codeField = allFields.find((f) => ['IDNATIO', 'NATIO', 'CODE'].includes(f));
    const nameField = allFields.find((f) => ['PAYS', 'NOM', 'NATIO_NOM'].includes(f));
    const visibleFields = allFields.filter((field) => field !== 'NALOCAL' && field !== 'NAT_DRAPEAU');
    const orderedFields = [codeField, nameField, ...visibleFields].filter(
      (field, index, array): field is string => Boolean(field) && array.indexOf(field) === index,
    );
    return orderedFields.map((field, index) => ({
      field,
      headerName: field === codeField ? 'Code' : field === nameField ? 'Nom' : field,
      width: index === 0 ? 80 : undefined,
      minWidth: index === 0 ? 80 : index === 1 ? 220 : 140,
      maxWidth: index === 0 ? 80 : undefined,
      flex: index === 1 ? 1 : undefined,
      sortable: true,
    }));
  }, [page.rows]);

  const formFields = useMemo<string[]>(() => {
    const source = page.activeRow ?? page.rows[0];
    const sourceFields = source ? Object.keys(source) : [];
    return [...sourceFields, 'NALOCAL', 'NAT_DRAPEAU'].filter((f, i, a) => a.indexOf(f) === i);
  }, [page.activeRow, page.rows]);

  const getRowId = (row: NatioRow): GridRowId => {
    if (primaryKey && (typeof row[primaryKey] === 'string' || typeof row[primaryKey] === 'number')) {
      return row[primaryKey] as GridRowId;
    }
    return JSON.stringify(row);
  };

  return (
    <EntityPageLayout
      title="Pays"
      searchLabel="Rechercher un pays"
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
      entityDescription="ce pays"
      onConfirmDelete={() => void page.handleDelete()}
      onCloseDeleteConfirm={page.closeDeleteConfirm}
      formDialog={
        <NatioFormDialog
          open={page.dialogOpen}
          mode={page.dialogMode}
          fields={formFields}
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
