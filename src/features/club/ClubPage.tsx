import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import { toErrorMessage, useEntityPage } from '../../components/useEntityPage';
import { canDeleteClub, createClubWithWizard, deleteClub, fetchClubGridById, fetchClubsGrid } from './clubApi';
import { ClubCreateDialog } from './ClubCreateDialog';
import type { ClubCreateWizardPayload, ClubGridRow } from './types';

interface ClubPageProps {
  variant?: 'page' | 'modalPicker';
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

export function ClubPage({ variant = 'page', onOpenInTab }: ClubPageProps) {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const page = useEntityPage<ClubGridRow>(
    {
      fetchAll: fetchClubsGrid,
      fetchById: (id) => fetchClubGridById(String(id)),
      update: async () => undefined,
      remove: deleteClub,
      canDelete: canDeleteClub,
    },
    {
      singular: 'club',
      singularArticle: 'ce club',
      created: 'Club cree.',
      updated: 'Club mis a jour.',
      deleted: 'Club supprime.',
      selectToOpen: 'Selectionnez un club a ouvrir.',
      selectToDelete: 'Selectionnez un club a supprimer.',
      noneSelected: 'Aucun club selectionne.',
    },
  );

  const columns = useMemo<GridColDef<ClubGridRow>[]>(() => [
    {
      field: 'CLUB_ABREGE',
      headerName: 'Club',
      minWidth: 170,
      flex: 0.55,
      sortable: true,
    },
    {
      field: 'CLUB_NOM_COMPLET',
      headerName: 'Nom complet',
      minWidth: 320,
      flex: 1,
      sortable: true,
    },
    {
      field: 'VILLE_NOM',
      headerName: 'Ville',
      minWidth: 190,
      flex: 0.5,
      sortable: true,
    },
  ], []);

  const resolveClubLabel = (rowId: GridRowId) => {
    const selectedRow = page.rows.find((row) => String(row.IDCLUB) === String(rowId));
    return selectedRow
      ? String(selectedRow.CLUB_NOM_COMPLET ?? '').trim() || String(selectedRow.CLUB_ABREGE ?? '').trim() || String(rowId)
      : String(rowId);
  };

  const openInTabFromRowId = (rowId: GridRowId) => {
    if (!onOpenInTab) return;
    onOpenInTab({ rowId, label: resolveClubLabel(rowId) });
  };

  const handleOpen = () => {
    const selectedId = page.selection.at(0);
    if (selectedId === undefined || selectedId === null) {
      page.setSnackbar({ severity: 'error', message: 'Selectionnez un club a ouvrir.' });
      return;
    }

    if (variant === 'modalPicker' && onOpenInTab) {
      openInTabFromRowId(selectedId);
      return;
    }

    navigate(`/admin/clubs/${encodeURIComponent(String(selectedId))}`);
  };

  const handleCreateClub = async (payload: ClubCreateWizardPayload) => {
    const created = await createClubWithWizard(payload);

    await page.reloadData();
    page.setSnackbar({ severity: 'success', message: 'Club cree.' });

    if (variant === 'modalPicker' && onOpenInTab) {
      const label = String(created.CLUB_NOM_COMPLET ?? '').trim() || String(created.CLUB_ABREGE ?? '').trim() || String(created.IDCLUB);
      onOpenInTab({ rowId: created.IDCLUB, label });
      return;
    }

    page.setSelection([created.IDCLUB]);
  };

  return (
    <EntityPageLayout
      hideTitle={variant === 'modalPicker'}
      actionsInlineWithSearch={variant === 'modalPicker'}
      title="Clubs"
      searchLabel="Rechercher un club"
      search={page.search}
      onSearchChange={page.setSearch}
      searchInputRef={page.searchInputRef}
      onNew={() => setCreateDialogOpen(true)}
      onOpen={handleOpen}
      onDelete={() => void page.handleOpenDeleteConfirm()}
      actionButtonsRowRef={page.actionButtonsRowRef}
      compactActionButtons={page.compactActionButtons}
      rows={page.rows}
      columns={columns}
      loading={page.loading}
      getRowId={(row) => row.IDCLUB}
      selection={page.selection}
      onSelectionChange={page.setSelection}
      onRowDoubleClick={(rowId) => {
        if (variant === 'modalPicker' && onOpenInTab) {
          openInTabFromRowId(rowId);
          return;
        }
        page.setSelection([rowId]);
        navigate(`/admin/clubs/${encodeURIComponent(String(rowId))}`);
      }}
      pageSizeOptions={[25, 50, 100]}
      confirmDeleteOpen={page.confirmDeleteOpen}
      deleteConstraints={page.deleteConstraints}
      entityDescription="ce club"
      onConfirmDelete={() => void page.handleDelete()}
      onCloseDeleteConfirm={page.closeDeleteConfirm}
      formDialog={(
        <ClubCreateDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onCreate={async (payload) => {
            try {
              await handleCreateClub(payload);
              setCreateDialogOpen(false);
            } catch (error) {
              page.setSnackbar({ severity: 'error', message: toErrorMessage(error) });
              throw error;
            }
          }}
          onError={(message) => page.setSnackbar({ severity: 'error', message })}
        />
      )}
      snackbar={page.snackbar}
      onCloseSnackbar={() => page.setSnackbar(null)}
    />
  );
}
