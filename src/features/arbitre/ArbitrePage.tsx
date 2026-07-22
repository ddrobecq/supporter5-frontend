import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import { createArbitre, deleteArbitre, fetchArbitre, fetchArbitreById, updateArbitre, canDeleteArbitre } from './arbitreApi';
import { fetchNatio } from '../natio/natioApi';
import { ArbitreFormDialog } from './ArbitreFormDialog';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { useEntityPage } from '../../components/useEntityPage';
import type { ArbitreRow } from './types';
import type { NatioRow } from '../natio/types';

const PK_CANDIDATES = ['IDARBITRE', 'ID', 'id'];

function detectPrimaryKey(rows: ArbitreRow[]): string | undefined {
  const firstRow = rows[0];
  if (!firstRow) return undefined;
  const keys = Object.keys(firstRow);
  const candidate = PK_CANDIDATES.find((pk) => keys.includes(pk));
  return candidate ?? keys[0];
}

interface ArbitrePageProps {
  variant?: 'page' | 'modalPicker';
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

export function ArbitrePage({ variant = 'page', onOpenInTab }: ArbitrePageProps) {
  const [natioDatas, setNatioDatas] = useState<NatioRow[]>([]);

  const page = useEntityPage<ArbitreRow>(
    {
      fetchAll: fetchArbitre,
      fetchById: fetchArbitreById,
      create: createArbitre,
      update: updateArbitre,
      remove: deleteArbitre,
      canDelete: canDeleteArbitre,
    },
    {
      singular: 'arbitre',
      singularArticle: 'cet arbitre',
      created: 'Arbitre cree.',
      updated: 'Arbitre mis a jour.',
      deleted: 'Arbitre supprime.',
      selectToOpen: 'Selectionnez un arbitre a ouvrir.',
      selectToDelete: 'Selectionnez un arbitre a supprimer.',
      noneSelected: 'Aucun arbitre selectionne.',
    },
    () => {
      fetchNatio('').then((result) => setNatioDatas(result.data ?? [])).catch(() => {});
    },
  );

  const primaryKey = useMemo(() => detectPrimaryKey(page.rows), [page.rows]);

  const columns = useMemo<GridColDef[]>(() => [{
    field: 'fullName',
    headerName: 'Arbitre',
    flex: 1,
    minWidth: 280,
    sortable: false,
    renderCell: (params) => {
      const nom = String(params.row.NOM ?? '').toUpperCase();
      const prenom = params.row.PRENOM ?? '';
      const idnatio = params.row.IDNATIO;
      return `${nom} ${prenom} (${String(idnatio ?? '')})`;
    },
  }], []);

  const formFields = useMemo<string[]>(() => {
    const source = page.activeRow ?? page.rows[0];
    const sourceFields = source ? Object.keys(source) : [];
    return sourceFields.filter((f, i, a) => a.indexOf(f) === i);
  }, [page.activeRow, page.rows]);

  const getRowId = (row: ArbitreRow): GridRowId => {
    if (primaryKey && (typeof row[primaryKey] === 'string' || typeof row[primaryKey] === 'number')) {
      return row[primaryKey] as GridRowId;
    }
    return JSON.stringify(row);
  };

  const openInTabFromRowId = (rowId: GridRowId) => {
    if (!onOpenInTab) return;
    const selectedRow = page.rows.find((row) => String(getRowId(row)) === String(rowId));
    const nom = String(selectedRow?.NOM ?? '').trim().toUpperCase();
    const prenom = String(selectedRow?.PRENOM ?? '').trim();
    const label = [nom, prenom].filter((part) => part.length > 0).join(' ').trim() || String(rowId);
    onOpenInTab({ rowId, label });
  };

  const handleOpen = () => {
    if (variant === 'modalPicker' && onOpenInTab) {
      const selectedId = page.selection.at(0);
      if (selectedId === undefined || selectedId === null) {
        page.setSnackbar({ severity: 'error', message: 'Selectionnez un arbitre a ouvrir.' });
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
      title="Arbitres"
      searchLabel="Rechercher un arbitre"
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
      entityDescription="cet arbitre"
      onConfirmDelete={() => void page.handleDelete()}
      onCloseDeleteConfirm={page.closeDeleteConfirm}
      formDialog={
        <ArbitreFormDialog
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
