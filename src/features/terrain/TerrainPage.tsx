import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { createTerrain, deleteTerrain, fetchTerrain, fetchTerrainById, updateTerrain, canDeleteTerrain } from './terrainApi';
import { TerrainFormDialog } from './TerrainFormDialog';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { toErrorMessage, useEntityPage } from '../../components/useEntityPage';
import type { TerrainRow } from './types';
import { buildTerrainFormFields, detectTerrainPrimaryKey, resolveTerrainId, resolveTerrainLabel } from './terrainUi';

interface TerrainPageProps {
  variant?: 'page' | 'modalPicker';
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

function toComparableId(value: unknown): string {
  return String(value);
}

export function TerrainPage({ variant = 'page', onOpenInTab }: TerrainPageProps) {
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

  const primaryKey = useMemo(() => detectTerrainPrimaryKey(page.rows), [page.rows]);

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
    return buildTerrainFormFields(source);
  }, [page.activeRow, page.rows]);

  const getRowId = (row: TerrainRow): GridRowId => {
    if (primaryKey && (typeof row[primaryKey] === 'string' || typeof row[primaryKey] === 'number')) {
      return row[primaryKey] as GridRowId;
    }
    return JSON.stringify(row);
  };

  const openInTabFromRowId = (rowId: GridRowId) => {
    if (!onOpenInTab) return;
    const selectedRow = page.rows.find((row) => toComparableId(getRowId(row)) === toComparableId(rowId));
    const label = selectedRow ? resolveTerrainLabel(selectedRow) : String(rowId);
    onOpenInTab({ rowId, label });
  };

  const handleOpen = () => {
    if (variant === 'modalPicker' && onOpenInTab) {
      const selectedId = page.selection.at(0);
      if (selectedId === undefined || selectedId === null) {
        page.setSnackbar({ severity: 'error', message: 'Selectionnez un terrain a ouvrir.' });
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

  const handleFormSubmit = async (payload: TerrainRow) => {
    if (variant === 'modalPicker' && onOpenInTab && page.dialogMode === 'create') {
      try {
        const created = await createTerrain(payload);
        const createdRow = (created ?? payload) as TerrainRow;
        const createdId = resolveTerrainId(createdRow);
        if (createdId === undefined || createdId === null || String(createdId).trim() === '') {
          page.setSnackbar({ severity: 'error', message: 'Creation reussie mais identifiant introuvable.' });
          return;
        }
        page.setDialogOpen(false);
        onOpenInTab({ rowId: createdId, label: resolveTerrainLabel(createdRow) });
      } catch (error) {
        page.setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      }
      return;
    }

    await page.handleFormSubmit(payload);
  };

  return (
    <EntityPageLayout
      hideTitle={variant === 'modalPicker'}
      actionsInlineWithSearch={variant === 'modalPicker'}
      title="Stades"
      searchLabel="Rechercher un terrain"
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
          onSubmit={handleFormSubmit}
        />
      }
      snackbar={page.snackbar}
      onCloseSnackbar={() => page.setSnackbar(null)}
    />
  );
}
