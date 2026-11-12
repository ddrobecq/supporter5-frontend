import { Box, CircularProgress, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppFeedbackSnackbar } from './AppFeedbackSnackbar';
import type { FeedbackMessage } from './AppFeedbackSnackbar';
import { toErrorMessage } from './useEntityPage';
import { useDepsChanged } from '../lib/useDepsChanged';
import { useTabFormPaneBridge } from '../lib/useTabFormPaneBridge';

/** Props injected by EntityTabFormPane into the embedded `*FormDialog`. */
export interface EntityTabFormRenderProps<Row> {
  open: true;
  mode: 'edit';
  embedded: true;
  primaryKey: string | undefined;
  initialData: Row;
  onDirtyChange: (dirty: boolean) => void;
  onClose: () => void;
  onSubmit: (payload: Row) => Promise<void>;
  saveCount: number;
}

/**
 * Callbacks (`fetchById`, `update`, `resolveLabel`, `primaryKey`, `deriveFromRow`) must be
 * referentially stable (module-level functions): they are hook dependencies.
 */
interface EntityTabFormPaneProps<Row, Id, Derived> {
  tabPath: string;
  id: Id;
  active: boolean;
  fetchById: (id: Id) => Promise<Row>;
  update: (id: Id, payload: Row) => Promise<unknown>;
  resolveLabel: (row: Row, id: Id) => string;
  /** Also push the tab label after each (re)load, not only after a save. */
  syncLabelOnLoad?: boolean;
  /** Static key, or derived from the loaded row. */
  primaryKey: string | ((row: Row) => string | undefined);
  /** Row-derived extra form props (e.g. `fields`), memoized on the row. */
  deriveFromRow?: (row: Row) => Derived;
  loadingLabel: string;
  successMessage: string;
  renderForm: (formProps: EntityTabFormRenderProps<Row>, derived: Derived) => ReactNode;
}

export function EntityTabFormPane<Row, Id, Derived = undefined>({
  tabPath,
  id,
  active,
  fetchById,
  update,
  resolveLabel,
  syncLabelOnLoad = false,
  primaryKey,
  deriveFromRow,
  loadingLabel,
  successMessage,
  renderForm,
}: EntityTabFormPaneProps<Row, Id, Derived>) {
  const { setDirty, setLabel, saveRequestCount, notifySaveDone } = useTabFormPaneBridge({ tabPath });
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Row | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  // Loads the row; callers set `loading` to true beforehand.
  // The executor turns a synchronous throw of fetchById into a rejection.
  const loadRow = useCallback(() => new Promise<Row>((resolve) => resolve(fetchById(id)))
    .then((data) => {
      setRow(data);
      if (syncLabelOnLoad) setLabel(resolveLabel(data, id));
      setDirty(false);
      return true;
    })
    .catch((error: unknown) => {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    })
    .finally(() => {
      setLoading(false);
    }), [fetchById, id, resolveLabel, setDirty, setLabel, syncLabelOnLoad]);

  const reloadRow = useCallback(() => {
    setLoading(true);
    return loadRow();
  }, [loadRow]);

  // Show the loader while rendering, on the dependencies of the loading effect below.
  const loadDepsChanged = useDepsChanged([loadRow, setDirty]);
  if (loadDepsChanged && !loading) {
    setLoading(true);
  }

  useEffect(() => {
    void loadRow();

    return () => {
      setDirty(false);
    };
  }, [loadRow, setDirty]);

  const derived = useMemo(() => (row !== undefined && deriveFromRow ? deriveFromRow(row) : undefined), [deriveFromRow, row]);

  const handleSubmit = async (payload: Row) => {
    try {
      await update(id, payload);
      const refreshed = await fetchById(id);
      setRow(refreshed);
      setLabel(resolveLabel(refreshed, id));
      setSnackbar({ severity: 'success', message: successMessage });
      setDirty(false);
      notifySaveDone();
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  return (
    <Box sx={{ display: active ? 'block' : 'none' }}>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">{loadingLabel}</Typography>
        </Box>
      ) : row !== undefined ? (
        renderForm(
          {
            open: true,
            mode: 'edit',
            embedded: true,
            primaryKey: typeof primaryKey === 'function' ? primaryKey(row) : primaryKey,
            initialData: row,
            onDirtyChange: (dirty) => setDirty(dirty),
            onClose: () => { void reloadRow(); },
            onSubmit: handleSubmit,
            saveCount: saveRequestCount,
          },
          // Defined whenever deriveFromRow is provided, since row is loaded here.
          derived as Derived,
        )
      ) : null}

      <AppFeedbackSnackbar value={snackbar} onClose={() => setSnackbar(null)} />
    </Box>
  );
}
