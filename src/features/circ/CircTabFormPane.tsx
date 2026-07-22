import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { toErrorMessage } from '../../components/useEntityPage';
import { fetchCircById, updateCirc } from './circApi';
import { CircFormDialog } from './CircFormDialog';
import type { CircRow } from './types';
import { resolveCircLabel } from './circUi';

interface CircTabFormPaneProps {
  tabPath: string;
  circId: string;
  active: boolean;
}

function dispatchDirty(tabPath: string, dirty: boolean) {
  window.dispatchEvent(new CustomEvent('supporter:tab-dirty', { detail: { path: tabPath, dirty } }));
}

function dispatchTabLabel(tabPath: string, label: string) {
  window.dispatchEvent(new CustomEvent('supporter:tab-label', { detail: { path: tabPath, label } }));
}

export function CircTabFormPane({ tabPath, circId, active }: CircTabFormPaneProps) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<CircRow | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const reloadRow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCircById(circId);
      setRow(data);
      dispatchDirty(tabPath, false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [circId, tabPath]);

  useEffect(() => {
    void reloadRow();

    return () => {
      dispatchDirty(tabPath, false);
    };
  }, [reloadRow, tabPath]);

  const handleSubmit = async (payload: CircRow) => {
    try {
      await updateCirc(circId, payload);
      const refreshed = await fetchCircById(circId);
      setRow(refreshed);
      dispatchTabLabel(tabPath, resolveCircLabel(refreshed));
      setSnackbar({ severity: 'success', message: 'Circonstance mise a jour.' });
      dispatchDirty(tabPath, false);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  return (
    <Box sx={{ display: active ? 'block' : 'none' }}>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Chargement de la circonstance...</Typography>
        </Box>
      ) : row ? (
        <CircFormDialog
          open
          mode="edit"
          embedded
          primaryKey="IDCIRC"
          initialData={row}
          onDirtyChange={(dirty) => dispatchDirty(tabPath, dirty)}
          onClose={() => { void reloadRow(); }}
          onSubmit={handleSubmit}
        />
      ) : null}

      <AppFeedbackSnackbar value={snackbar} onClose={() => setSnackbar(null)} />
    </Box>
  );
}
