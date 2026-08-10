import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { createNatio, deleteNatio, fetchNatio, fetchNatioById, updateNatio, canDeleteNatio } from './natioApi';
import { NatioFormDialog } from './NatioFormDialog';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { createAndOpenInTab, useEntityPage } from '../../components/useEntityPage';
import { NatioFlag } from '../../components/NatioFlag';
import type { NatioRow } from './types';
import { buildNatioFormFields, detectNatioPrimaryKey, resolveNatioId, resolveNatioLabel } from './natioUi';

interface NatioPageProps {
  variant?: 'page' | 'modalPicker';
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

function toComparableId(value: unknown): string {
  return String(value);
}

export function NatioPage({ variant = 'page', onOpenInTab }: NatioPageProps) {
  const params = useParams<{ natioId?: string }>();
  const natioId = params.natioId;

  // Si variant est 'page' (page complète, pas modale) et qu'il n'y a pas d'ID, rediriger
  if (variant === 'page' && !natioId) {
    return <Navigate to="/admin/home" replace />;
  }

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

  const primaryKey = useMemo(() => detectNatioPrimaryKey(page.rows), [page.rows]);

  const columns = useMemo<GridColDef[]>(() => {
    const first = page.rows[0];
    if (!first) return [];
    const allFields = Object.keys(first);
    const codeField = allFields.find((f) => ['IDNATIO', 'NATIO', 'CODE'].includes(f));
    const nameField = allFields.find((f) => ['PAYS', 'NOM', 'NATIO_NOM'].includes(f));
    const visibleFields = allFields.filter((field) => {
      if (field === 'NALOCAL' || field === 'NAT_DRAPEAU' || field === codeField) return false;
      if (variant === 'modalPicker' && field === 'NAT_ISO') return false;
      return true;
    });
    const orderedFields = ['NAT_DRAPEAU', nameField, ...visibleFields].filter(
      (field, index, array): field is string => Boolean(field) && array.indexOf(field) === index,
    );
    return orderedFields.map((field, index) => {
      const col: GridColDef = {
        field,
        headerName: field === 'NAT_DRAPEAU' ? '' : field === nameField ? 'Nom' : field,
        width: index === 0 ? 50 : undefined,
        minWidth: index === 0 ? 50 : index === 1 ? 150 : 140,
        maxWidth: index === 0 ? 50 : undefined,
        flex: index === 1 ? 1 : undefined,
        sortable: false,
      };
      if (field === 'NAT_DRAPEAU' && codeField) {
        col.renderCell = (params) => <NatioFlag idnatio={String(params.row[codeField] ?? '')} />;
      }
      return col;
    });
  }, [page.rows, variant]);

  const formFields = useMemo<string[]>(() => {
    const source = page.activeRow ?? page.rows[0];
    return buildNatioFormFields(source);
  }, [page.activeRow, page.rows]);

  const getRowId = (row: NatioRow): GridRowId => {
    if (primaryKey && (typeof row[primaryKey] === 'string' || typeof row[primaryKey] === 'number')) {
      return row[primaryKey] as GridRowId;
    }
    return JSON.stringify(row);
  };

  const openInTabFromRowId = (rowId: GridRowId) => {
    if (!onOpenInTab) return;
    const selectedRow = page.rows.find((row) => toComparableId(getRowId(row)) === toComparableId(rowId));
    const label = selectedRow ? resolveNatioLabel(selectedRow) : String(rowId);
    onOpenInTab({ rowId, label });
  };

  const handleOpen = () => {
    if (variant === 'modalPicker' && onOpenInTab) {
      const selectedId = page.selection.at(0);
      if (selectedId === undefined || selectedId === null) {
        page.setSnackbar({ severity: 'error', message: 'Selectionnez un pays a ouvrir.' });
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

  const handleFormSubmit = async (payload: NatioRow) => {
    if (variant === 'modalPicker' && onOpenInTab && page.dialogMode === 'create') {
      await createAndOpenInTab({
        create: createNatio,
        payload,
        resolveId: resolveNatioId,
        resolveLabel: resolveNatioLabel,
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
      title="Pays"
      searchLabel="Rechercher un pays"
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
          onClose={() => {
            page.setDialogOpen(false);
          }}
          onSubmit={handleFormSubmit}
        />
      }
      snackbar={page.snackbar}
      onCloseSnackbar={() => page.setSnackbar(null)}
    />
  );
}
