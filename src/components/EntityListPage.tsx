import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { EntityPageLayout } from './EntityPageLayout';
import { createAndOpenInTab, useEntityPage, type EntityApi, type EntityLabels } from './useEntityPage';

type OpenInTabPayload = { rowId: GridRowId; label: string };

/** Props handed to the edit/create form dialog; matches the `*FormDialog` contracts. */
export interface EntityListFormDialogProps<Row> {
  open: boolean;
  mode: 'create' | 'edit';
  primaryKey: string;
  initialData: Row | undefined;
  onClose: () => void;
  onSubmit: (payload: Row) => Promise<void>;
}

/** Props handed to a creation wizard replacing the form dialog in create mode. */
export interface EntityListCreateDialogProps {
  open: boolean;
  onClose: () => void;
  /** Reloads the list, closes the wizard, notifies, then opens the new row in a tab. */
  onCreated: (createdId: string | number, label: string) => Promise<void>;
  onError: (message: string) => void;
}

interface EntityListPageBaseProps<Row extends Record<string, unknown>> {
  messages: EntityLabels;
  title: string;
  searchLabel: string;
  primaryKey: string;
  /** Label of a list row; an empty result falls back to the row id. */
  resolveLabel: (row: Row) => string;
  /** Static columns, or a stable (module-level) factory deriving them from the loaded rows. */
  columns: GridColDef<Row>[] | ((rows: Row[]) => GridColDef<Row>[]);
  /** Stable (module-level) builder of the dialog `fields`, from the edited row or the first row. */
  buildFormFields?: (source?: Row) => string[];
  renderFormDialog: (dialog: EntityListFormDialogProps<Row>, fields: string[]) => ReactNode;
  onOpenInTab?: (payload: OpenInTabPayload) => void;
  /** Picker mode: receives the opened row instead of `onOpenInTab`. */
  onSelectRow?: (row: Row) => void;
}

interface FormCreationProps<Row extends Record<string, unknown>> extends EntityListPageBaseProps<Row> {
  api: EntityApi<Row> & Required<Pick<EntityApi<Row>, 'create'>>;
  /** Id of the created row, used to open it in a tab. */
  resolveId: (row: Row) => string | number | undefined;
  renderCreateDialog?: undefined;
}

interface WizardCreationProps<Row extends Record<string, unknown>> extends EntityListPageBaseProps<Row> {
  api: Omit<EntityApi<Row>, 'create'>;
  resolveId?: undefined;
  renderCreateDialog: (dialog: EntityListCreateDialogProps) => ReactNode;
}

export type EntityListPageProps<Row extends Record<string, unknown>> = FormCreationProps<Row> | WizardCreationProps<Row>;

/** Admin entity list (search, grid, new/open/delete) opening rows in tabs. */
export function EntityListPage<Row extends Record<string, unknown>>(props: EntityListPageProps<Row>) {
  const {
    api,
    messages,
    title,
    searchLabel,
    primaryKey,
    resolveLabel,
    columns,
    buildFormFields,
    renderFormDialog,
    onOpenInTab,
    onSelectRow,
  } = props;
  const page = useEntityPage<Row>(api, messages);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const gridColumns = useMemo(
    () => (typeof columns === 'function' ? columns(page.rows) : columns),
    [columns, page.rows],
  );

  const formFields = useMemo<string[]>(
    () => buildFormFields?.(page.activeRow ?? page.rows[0]) ?? [],
    [buildFormFields, page.activeRow, page.rows],
  );

  const getRowId = useCallback((row: Row): GridRowId => row[primaryKey] as GridRowId, [primaryKey]);

  const canOpenRow = Boolean(onOpenInTab || onSelectRow);

  const openRow = (rowId: GridRowId) => {
    const selectedRow = page.rows.find((row) => String(getRowId(row)) === String(rowId));
    if (onSelectRow) {
      if (selectedRow) onSelectRow(selectedRow);
      return;
    }
    if (!onOpenInTab) return;
    const label = (selectedRow ? resolveLabel(selectedRow) : '') || String(rowId);
    onOpenInTab({ rowId, label });
  };

  const handleOpen = () => {
    if (!canOpenRow) {
      void page.openEditDialog();
      return;
    }
    const selectedId = page.selection.at(0);
    if (selectedId === undefined || selectedId === null) {
      page.setSnackbar({ severity: 'error', message: messages.selectToOpen });
      return;
    }
    openRow(selectedId);
  };

  const handleRowDoubleClick = (rowId: GridRowId) => {
    if (!canOpenRow) {
      void page.openEditDialog(rowId);
      return;
    }
    openRow(rowId);
  };

  const handleFormSubmit = async (payload: Row) => {
    if (props.renderCreateDialog === undefined && onOpenInTab && page.dialogMode === 'create') {
      await createAndOpenInTab({
        create: props.api.create,
        payload,
        resolveId: props.resolveId,
        resolveLabel,
        closeDialog: () => page.setDialogOpen(false),
        onOpenInTab,
        setSnackbar: page.setSnackbar,
      });
      return;
    }
    await page.handleFormSubmit(payload);
  };

  const handleCreated = async (createdId: string | number, label: string) => {
    await page.reloadData();
    setCreateDialogOpen(false);
    page.setSnackbar({ severity: 'success', message: messages.created });
    onOpenInTab?.({ rowId: createdId, label });
  };

  const formDialog = renderFormDialog(
    {
      open: page.dialogOpen,
      mode: page.dialogMode,
      primaryKey,
      initialData: page.activeRow,
      onClose: () => page.setDialogOpen(false),
      onSubmit: handleFormSubmit,
    },
    formFields,
  );

  return (
    <EntityPageLayout
      hideTitle
      actionsInlineWithSearch
      title={title}
      searchLabel={searchLabel}
      search={page.search}
      onSearchChange={page.setSearch}
      searchInputRef={page.searchInputRef}
      onNew={props.renderCreateDialog ? () => setCreateDialogOpen(true) : page.openCreateDialog}
      onOpen={handleOpen}
      onDelete={() => void page.handleOpenDeleteConfirm()}
      actionButtonsRowRef={page.actionButtonsRowRef}
      compactActionButtons={page.compactActionButtons}
      rows={page.rows}
      columns={gridColumns}
      loading={page.loading}
      getRowId={getRowId}
      selection={page.selection}
      onSelectionChange={page.setSelection}
      onRowDoubleClick={handleRowDoubleClick}
      confirmDeleteOpen={page.confirmDeleteOpen}
      deleteConstraints={page.deleteConstraints}
      entityDescription={messages.singularArticle}
      onConfirmDelete={() => void page.handleDelete()}
      onCloseDeleteConfirm={page.closeDeleteConfirm}
      formDialog={props.renderCreateDialog ? (
        <>
          {formDialog}
          {props.renderCreateDialog({
            open: createDialogOpen,
            onClose: () => setCreateDialogOpen(false),
            onCreated: handleCreated,
            onError: (message) => page.setSnackbar({ severity: 'error', message }),
          })}
        </>
      ) : formDialog}
      snackbar={page.snackbar}
      onCloseSnackbar={() => page.setSnackbar(null)}
    />
  );
}
