import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import { createVille, deleteVille, fetchVille, fetchVilleById, updateVille, canDeleteVille } from './villeApi';
import { fetchNatio } from '../natio/natioApi';
import { VilleFormDialog } from './VilleFormDialog';
import { createVilleColumns, createNatioMap } from './villeColumnsHelper';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { useEntityPage } from '../../components/useEntityPage';
import type { VilleRow } from './types';
import type { NatioRow } from '../natio/types';

const PK_CANDIDATES = ['VICLEUNIK', 'VILLEID', 'ID', 'id'];

function detectPrimaryKey(rows: VilleRow[]): string | undefined {
  const firstRow = rows[0];
  if (!firstRow) return undefined;
  const keys = Object.keys(firstRow);
  const candidate = PK_CANDIDATES.find((pk) => keys.includes(pk));
  return candidate ?? keys[0];
}

export function VillePage() {
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

  const primaryKey = useMemo(() => detectPrimaryKey(page.rows), [page.rows]);
  const natioMap = useMemo(() => createNatioMap(natioDatas), [natioDatas]);
  const columns = useMemo<GridColDef[]>(() => createVilleColumns(natioMap), [natioMap]);

  const formFields = useMemo<string[]>(() => {
    const source = page.activeRow ?? page.rows[0];
    const sourceFields = source ? Object.keys(source) : [];
    return sourceFields.filter((f, i, a) => a.indexOf(f) === i);
  }, [page.activeRow, page.rows]);

  const getRowId = (row: VilleRow): GridRowId => {
    if (primaryKey && (typeof row[primaryKey] === 'string' || typeof row[primaryKey] === 'number')) {
      return row[primaryKey] as GridRowId;
    }
    return JSON.stringify(row);
  };

  return (
    <EntityPageLayout
      title="Villes"
      searchLabel="Rechercher une ville"
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
          onSubmit={page.handleFormSubmit}
        />
      }
      snackbar={page.snackbar}
      onCloseSnackbar={() => page.setSnackbar(null)}
    />
  );
}
