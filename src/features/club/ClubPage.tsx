import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { EntityPageLayout } from '../../components/EntityPageLayout';
import type { IntegrityConstraint } from '../../components/EntityPageLayout';
import { toErrorMessage } from '../../components/useEntityPage';
import { canDeleteClub, createClubWithWizard, deleteClub, fetchClubsGrid } from './clubApi';
import { ClubCreateDialog } from './ClubCreateDialog';
import type { ClubCreateWizardPayload, ClubGridRow } from './types';

interface ClubPageProps {
  variant?: 'page' | 'modalPicker';
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

export function ClubPage({ variant = 'page', onOpenInTab }: ClubPageProps) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const actionButtonsRowRef = useRef<HTMLDivElement | null>(null);
  const [rows, setRows] = useState<ClubGridRow[]>([]);
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [loading, setLoading] = useState(false);
  const [compactActionButtons, setCompactActionButtons] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteConstraints, setDeleteConstraints] = useState<IntegrityConstraint[]>([]);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const columns: GridColDef<ClubGridRow>[] = [
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
  ];

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      void fetchClubsGrid(search.trim(), controller.signal)
        .then((result) => {
          setRows(result.data ?? []);
          setSelection([]);
        })
        .catch((error: unknown) => {
          if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') {
            return;
          }
          setSnackbar({ severity: 'error', message: toErrorMessage(error) });
        })
        .finally(() => setLoading(false));
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [search]);

  useEffect(() => {
    const row = actionButtonsRowRef.current;
    if (!row) return;
    const update = () => {
      const widthPerButton = (row.clientWidth - 16) / 3;
      setCompactActionButtons(widthPerButton < 120);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const openInTabFromRowId = (rowId: GridRowId) => {
    if (!onOpenInTab) return;
    const selectedRow = rows.find((row) => String(row.IDCLUB) === String(rowId));
    const label = selectedRow
      ? String(selectedRow.CLUB_NOM_COMPLET ?? '').trim() || String(selectedRow.CLUB_ABREGE ?? '').trim() || String(rowId)
      : String(rowId);
    onOpenInTab({ rowId, label });
  };

  const handleActionNotImplemented = () => {
    if (variant === 'modalPicker' && onOpenInTab) {
      const selectedId = selection.at(0);
      if (selectedId === undefined || selectedId === null) {
        setSnackbar({ severity: 'error', message: 'Selectionnez un club a ouvrir.' });
        return;
      }
      openInTabFromRowId(selectedId);
      return;
    }

    setSnackbar({
      severity: 'error',
      message: 'Action Ouvrir a implementer pour Clubs.',
    });
  };

  const handleCreateClub = async (payload: ClubCreateWizardPayload) => {
    const created = await createClubWithWizard(payload);

    setLoading(true);
    try {
      const result = await fetchClubsGrid(search.trim());
      setRows(result.data ?? []);
    } finally {
      setLoading(false);
    }

    setSnackbar({ severity: 'success', message: 'Club cree.' });

    if (variant === 'modalPicker' && onOpenInTab) {
      const label = String(created.CLUB_NOM_COMPLET ?? '').trim() || String(created.CLUB_ABREGE ?? '').trim() || String(created.IDCLUB);
      onOpenInTab({ rowId: created.IDCLUB, label });
      return;
    }

    setSelection([created.IDCLUB]);
  };

  const handleOpenDeleteConfirm = async () => {
    const selectedId = selection.at(0);
    if (!selectedId) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un club a supprimer.' });
      return;
    }

    try {
      const result = await canDeleteClub(selectedId);
      setDeleteConstraints(result.constraints ?? []);
      setConfirmDeleteOpen(true);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  const handleDelete = async () => {
    const selectedId = selection.at(0);
    if (!selectedId) {
      setSnackbar({ severity: 'error', message: 'Selectionnez un club a supprimer.' });
      return;
    }

    try {
      await deleteClub(selectedId);
      setSnackbar({ severity: 'success', message: 'Club supprime.' });
      setConfirmDeleteOpen(false);
      setDeleteConstraints([]);
      setSelection([]);
      setLoading(true);
      const result = await fetchClubsGrid(search.trim());
      setRows(result.data ?? []);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const closeDeleteConfirm = () => {
    setConfirmDeleteOpen(false);
    setDeleteConstraints([]);
  };

  return (
    <EntityPageLayout
      hideTitle={variant === 'modalPicker'}
      actionsInlineWithSearch={variant === 'modalPicker'}
      title="Clubs"
      searchLabel="Rechercher un club"
      search={search}
      onSearchChange={handleSearchChange}
      searchInputRef={searchInputRef}
      onNew={() => setCreateDialogOpen(true)}
      onOpen={handleActionNotImplemented}
      onDelete={() => void handleOpenDeleteConfirm()}
      actionButtonsRowRef={actionButtonsRowRef}
      compactActionButtons={compactActionButtons}
      rows={rows}
      columns={columns}
      loading={loading}
      getRowId={(row) => row.IDCLUB}
      selection={selection}
      onSelectionChange={setSelection}
      onRowDoubleClick={(rowId) => {
        if (variant === 'modalPicker' && onOpenInTab) {
          openInTabFromRowId(rowId);
          return;
        }
        const row = rows.find((item) => item.IDCLUB === rowId);
        if (row) {
          setSelection([row.IDCLUB]);
        }
      }}
      pageSizeOptions={[25, 50, 100]}
      confirmDeleteOpen={confirmDeleteOpen}
      deleteConstraints={deleteConstraints}
      entityDescription="ce club"
      onConfirmDelete={() => void handleDelete()}
      onCloseDeleteConfirm={closeDeleteConfirm}
      formDialog={(
        <ClubCreateDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onCreate={async (payload) => {
            try {
              await handleCreateClub(payload);
              setCreateDialogOpen(false);
            } catch (error) {
              setSnackbar({ severity: 'error', message: toErrorMessage(error) });
              throw error;
            }
          }}
          onError={(message) => setSnackbar({ severity: 'error', message })}
        />
      )}
      snackbar={snackbar}
      onCloseSnackbar={() => setSnackbar(null)}
    />
  );
}
