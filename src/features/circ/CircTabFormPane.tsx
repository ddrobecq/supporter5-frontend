import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { toErrorMessage } from '../../components/useEntityPage';
import { useTabMetaEvents } from '../../lib/useTabMetaEvents';
import { fetchCircById, updateCirc } from './circApi';
import { CircFormDialog } from './CircFormDialog';
import type { CircRow } from './types';
import { resolveCircLabel } from './circUi';

interface CircTabFormPaneProps {
  tabPath: string;
  circId: string;
  active: boolean;
}

export function CircTabFormPane({ tabPath, circId, active }: CircTabFormPaneProps) {
  const { setDirty, setLabel } = useTabMetaEvents(tabPath);
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<CircRow | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const reloadRow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCircById(circId);
      setRow(data);
      setDirty(false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [circId, setDirty]);

  useEffect(() => {
    void reloadRow();

    return () => {
      setDirty(false);
    };
  }, [reloadRow, setDirty]);

  const handleSubmit = async (payload: CircRow) => {
    try {
      await updateCirc(circId, payload);
      const refreshed = await fetchCircById(circId);
      setRow(refreshed);
      setLabel(resolveCircLabel(refreshed));
      setSnackbar({ severity: 'success', message: 'Circonstance mise a jour.' });
      setDirty(false);
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
          onDirtyChange={(dirty) => setDirty(dirty)}
          onClose={() => { void reloadRow(); }}
          onSubmit={handleSubmit}
        />
      ) : null}

      <AppFeedbackSnackbar value={snackbar} onClose={() => setSnackbar(null)} />
    </Box>
  );
}
