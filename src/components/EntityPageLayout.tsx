import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import type { GridColDef, GridPaginationModel, GridRowClassNameParams, GridRowId, GridValidRowModel } from '@mui/x-data-grid';
import type { ReactNode, RefObject } from 'react';
import { EntityDataGrid } from './EntityDataGrid';
import { EntitySearchBar } from './EntitySearchBar';
import { AppFeedbackSnackbar } from './AppFeedbackSnackbar';
import type { FeedbackMessage } from './AppFeedbackSnackbar';

export interface IntegrityConstraint {
  table: string;
  count: number;
  description: string;
}

interface EntityPageLayoutProps<Row extends GridValidRowModel> {
  // Titre affiché en haut de la page
  title: string;
  // Barre de recherche
  searchLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  headerExtra?: ReactNode;
  // Boutons d'action
  onNew: () => void;
  onOpen: () => void;
  onDelete: () => void;
  actionButtonsRowRef?: RefObject<HTMLDivElement | null>;
  compactActionButtons: boolean;
  showActions?: boolean;
  // DataGrid
  rows: Row[];
  columns: GridColDef<Row>[];
  loading: boolean;
  getRowId: (row: Row) => GridRowId;
  selection: GridRowId[];
  onSelectionChange: (selection: GridRowId[]) => void;
  onRowDoubleClick: (rowId: GridRowId) => void;
  getRowClassName?: (params: GridRowClassNameParams<Row>) => string;
  paginationMode?: 'client' | 'server';
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (model: GridPaginationModel) => void;
  rowCount?: number;
  pageSizeOptions?: number[];
  // Dialog suppression
  confirmDeleteOpen: boolean;
  deleteConstraints: IntegrityConstraint[];
  entityDescription: string;
  onConfirmDelete: () => void;
  onCloseDeleteConfirm: () => void;
  // Form dialog injecté par la page spécifique
  formDialog: ReactNode;
  // Snackbar
  snackbar: FeedbackMessage | null;
  onCloseSnackbar: () => void;
}

export function EntityPageLayout<Row extends GridValidRowModel>({
  title,
  searchLabel,
  search,
  onSearchChange,
  searchInputRef,
  headerExtra,
  onNew,
  onOpen,
  onDelete,
  actionButtonsRowRef,
  compactActionButtons,
  showActions = true,
  rows,
  columns,
  loading,
  getRowId,
  selection,
  onSelectionChange,
  onRowDoubleClick,
  getRowClassName,
  paginationMode = 'client',
  paginationModel,
  onPaginationModelChange,
  rowCount,
  pageSizeOptions,
  confirmDeleteOpen,
  deleteConstraints,
  entityDescription,
  onConfirmDelete,
  onCloseDeleteConfirm,
  formDialog,
  snackbar,
  onCloseSnackbar,
}: EntityPageLayoutProps<Row>) {
  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', width: '100%', flexWrap: 'nowrap' }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>{title}</Typography>
        <Box
          sx={{
            ml: 'auto',
            flex: 1,
            minWidth: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 1,
          }}
        >
          {headerExtra}
          <EntitySearchBar
            label={searchLabel}
            value={search}
            onChange={onSearchChange}
            inputRef={searchInputRef}
            autoFocus
            sx={{ width: { xs: '52vw', md: '100%' }, minWidth: 120, maxWidth: { xs: 260, md: 560 } }}
          />
        </Box>
      </Stack>

      <Card>
        <CardContent>
          {showActions ? (
            <Box sx={{ width: '100%' }}>
              <Stack ref={actionButtonsRowRef} direction="row" spacing={1} sx={{ width: '100%' }}>
                <Tooltip title="Nouveau" disableHoverListener={!compactActionButtons}>
                  <Button
                    variant="contained"
                    startIcon={compactActionButtons ? undefined : <AddCircleOutlinedIcon />}
                    onClick={onNew}
                    aria-label="Nouveau"
                    sx={{ flex: 1, minWidth: 0 }}
                  >
                    {compactActionButtons ? <AddCircleOutlinedIcon /> : 'Nouveau'}
                  </Button>
                </Tooltip>
                <Tooltip title="Ouvrir" disableHoverListener={!compactActionButtons}>
                  <Button
                    variant="outlined"
                    startIcon={compactActionButtons ? undefined : <EditOutlinedIcon />}
                    onClick={onOpen}
                    aria-label="Ouvrir"
                    sx={{ flex: 1, minWidth: 0 }}
                  >
                    {compactActionButtons ? <EditOutlinedIcon /> : 'Ouvrir'}
                  </Button>
                </Tooltip>
                <Tooltip title="Supprimer" disableHoverListener={!compactActionButtons}>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={compactActionButtons ? undefined : <DeleteOutlinedIcon />}
                    onClick={onDelete}
                    aria-label="Supprimer"
                    sx={{ flex: 1, minWidth: 0 }}
                  >
                    {compactActionButtons ? <DeleteOutlinedIcon /> : 'Supprimer'}
                  </Button>
                </Tooltip>
              </Stack>
            </Box>
          ) : null}

          <Box sx={{ mt: 2, height: `calc(100vh - ${showActions ? 270 : 235}px)`, minHeight: 420 }}>
            <EntityDataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              getRowId={getRowId}
              selection={selection}
              onSelectionChange={onSelectionChange}
              onRowDoubleClick={onRowDoubleClick}
              getRowClassName={getRowClassName}
              onRowClick={(rowId) => onSelectionChange([rowId])}
              paginationMode={paginationMode}
              paginationModel={paginationModel}
              onPaginationModelChange={onPaginationModelChange}
              rowCount={rowCount}
              pageSizeOptions={pageSizeOptions}
            />
          </Box>
        </CardContent>
      </Card>

      {formDialog}

      <Dialog open={confirmDeleteOpen} onClose={onCloseDeleteConfirm}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          {deleteConstraints.length === 0 ? (
            <DialogContentText>
              Cette action est irreversible. Verifiez que {entityDescription} n'est pas utilise dans d'autres enregistrements.
            </DialogContentText>
          ) : (
            <Stack spacing={1.5}>
              <DialogContentText>
                <strong>Suppression impossible.</strong> {entityDescription.charAt(0).toUpperCase() + entityDescription.slice(1)} est utilise dans d'autres donnees:
              </DialogContentText>
              <Stack spacing={0.75} sx={{ ml: 2 }}>
                {deleteConstraints.map((constraint) => (
                  <Box key={constraint.table} sx={{ fontSize: 0.9 }}>
                    <strong>• {constraint.table}</strong>: {constraint.description}
                  </Box>
                ))}
              </Stack>
              <DialogContentText sx={{ mt: 1.5, fontStyle: 'italic', color: 'error.main' }}>
                Supprimez ou modifiez d'abord les enregistrements dependants, puis reessayez.
              </DialogContentText>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseDeleteConfirm} color="inherit">
            {deleteConstraints.length === 0 ? 'Annuler' : 'OK'}
          </Button>
          {deleteConstraints.length === 0 && (
            <Button onClick={onConfirmDelete} color="error" variant="contained">Supprimer</Button>
          )}
        </DialogActions>
      </Dialog>

      <AppFeedbackSnackbar value={snackbar} onClose={onCloseSnackbar} />
    </Stack>
  );
}
