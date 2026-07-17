import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { createTerrain, deleteTerrain, fetchTerrain, fetchTerrainById, updateTerrain, canDeleteTerrain } from './terrainApi';
import { TerrainFormDialog } from './TerrainFormDialog';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { useEntityPage } from '../../components/useEntityPage';
import type { TerrainRow } from './types';

const PK_CANDIDATES = ['TECLEUNIK', 'ID', 'id', 'CODE'];

function detectPrimaryKey(rows: TerrainRow[]): string | undefined {
  const firstRow = rows[0];
  if (!firstRow) return undefined;
  const keys = Object.keys(firstRow);
  const candidate = PK_CANDIDATES.find((pk) => keys.includes(pk));
  return candidate ?? keys[0];
}

export function TerrainPage() {
  const page = useEntityPage<TerrainRow>(
    {
      fetchAll: fetchTerrain,
      fetchById: fetchTerrainById,
      create: createTerrain,
      update: updateTerrain,
      remove: deleteTerrain,
      canDelete: canDeleteTerrain,
    },
    {
      singular: 'terrain',
      singularArticle: 'ce terrain',
      created: 'Terrain cree.',
      updated: 'Terrain mis a jour.',
      deleted: 'Terrain supprime.',
      selectToOpen: 'Selectionnez un terrain a ouvrir.',
      selectToDelete: 'Selectionnez un terrain a supprimer.',
      noneSelected: 'Aucun terrain selectionne.',
    },
  );

  const primaryKey = useMemo(() => detectPrimaryKey(page.rows), [page.rows]);

  const columns = useMemo<GridColDef[]>(() => {
    const first = page.rows[0];
    const headerLabels: Record<string, string> = { STADE: 'Stade', VILLE_NOM: 'Ville' };
    if (!first) {
      return [
        { field: 'STADE', headerName: 'Stade', flex: 1, minWidth: 220, sortable: true },
        { field: 'VILLE_NOM', headerName: 'Ville', flex: 0.8, minWidth: 150, sortable: true },
      ];
    }
    const allFields = Object.keys(first);
    const nameField = allFields.find((f) => ['STADE', 'NOM'].includes(f));
    const visibleFields = allFields.filter((field) => !['TERRAIN_LOGO', 'TECLEUNIK', 'IDVILLE'].includes(field));
    const orderedFields = [nameField, ...visibleFields].filter(
      (field, index, array): field is string => Boolean(field) && array.indexOf(field) === index,
    );
    return orderedFields.map((field, index) => ({
      field,
      headerName: headerLabels[field] || field,
      flex: index === 0 ? 1 : undefined,
      minWidth: index === 0 ? 220 : 150,
      sortable: true,
    }));
  }, [page.rows]);

  const formFields = useMemo<string[]>(() => {
    const source = page.activeRow ?? page.rows[0];
    const sourceFields = source ? Object.keys(source) : [];
    return [...sourceFields, 'TERRAIN_LOGO'].filter((f, i, a) => a.indexOf(f) === i);
  }, [page.activeRow, page.rows]);

  const getRowId = (row: TerrainRow): GridRowId => {
    if (primaryKey && (typeof row[primaryKey] === 'string' || typeof row[primaryKey] === 'number')) {
      return row[primaryKey] as GridRowId;
    }
    return JSON.stringify(row);
  };

  return (
    <EntityPageLayout
      title="Stades"
      searchLabel="Rechercher un terrain"
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
      entityDescription="ce terrain"
      onConfirmDelete={() => void page.handleDelete()}
      onCloseDeleteConfirm={page.closeDeleteConfirm}
      formDialog={
        <TerrainFormDialog
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
