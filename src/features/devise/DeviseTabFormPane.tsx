import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { toErrorMessage } from '../../components/useEntityPage';
import { useTabMetaEvents } from '../../lib/useTabMetaEvents';
import { DeviseFormDialog } from './DeviseFormDialog';
import { fetchDeviseById, updateDevise } from './deviseApi';
import type { DeviseRow } from './types';
import { resolveDeviseLabel } from './deviseUi';

interface DeviseTabFormPaneProps {
  tabPath: string;
  deviseId: string;
  active: boolean;
}

export function DeviseTabFormPane({ tabPath, deviseId, active }: DeviseTabFormPaneProps) {
  const { setDirty, setLabel } = useTabMetaEvents(tabPath);
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<DeviseRow | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const reloadRow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDeviseById(deviseId);
      setRow(data);
      setDirty(false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [deviseId, setDirty]);

  useEffect(() => {
    void reloadRow();

    return () => {
      setDirty(false);
    };
  }, [reloadRow, setDirty]);

  const handleSubmit = async (payload: DeviseRow) => {
    try {
      await updateDevise(deviseId, payload);
      const refreshed = await fetchDeviseById(deviseId);
      setRow(refreshed);
      setLabel(resolveDeviseLabel(refreshed));
      setSnackbar({ severity: 'success', message: 'Devise mise a jour.' });
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
          <Typography variant="body2" color="text.secondary">Chargement de la devise...</Typography>
        </Box>
      ) : row ? (
        <DeviseFormDialog
          open
          mode="edit"
          embedded
          primaryKey="DVCLEUNIK"
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
