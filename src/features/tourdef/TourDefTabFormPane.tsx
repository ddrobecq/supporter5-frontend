import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { toErrorMessage } from '../../components/useEntityPage';
import { emitTabSaveDone, useTabMetaEvents } from '../../lib/useTabMetaEvents';
import { TourDefFormDialog } from './TourDefFormDialog';
import { fetchTourDefById, updateTourDef } from './tourDefApi';
import type { TourDefRow } from './types';
import { resolveTourDefLabel } from './tourDefUi';

interface TourDefTabFormPaneProps {
  tabPath: string;
  tourDefId: string;
  active: boolean;
}

export function TourDefTabFormPane({ tabPath, tourDefId, active }: TourDefTabFormPaneProps) {
  const { setDirty, setLabel } = useTabMetaEvents(tabPath);
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<TourDefRow | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);
  const [saveCount, setSaveCount] = useState(0);

  useEffect(() => {
    const handler = (event: Event) => {
      const payload = event as CustomEvent<{ path?: string }>;
      if (payload.detail?.path === tabPath) setSaveCount((count) => count + 1);
    };
    window.addEventListener('supporter:tab-save-request', handler);
    return () => window.removeEventListener('supporter:tab-save-request', handler);
  }, [tabPath]);

  const reloadRow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTourDefById(tourDefId);
      setRow(data);
      setDirty(false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [tourDefId, setDirty]);

  useEffect(() => {
    void reloadRow();
    return () => {
      setDirty(false);
    };
  }, [reloadRow, setDirty]);

  const handleSubmit = async (payload: TourDefRow) => {
    try {
      await updateTourDef(tourDefId, payload);
      const refreshed = await fetchTourDefById(tourDefId);
      setRow(refreshed);
      setLabel(resolveTourDefLabel(refreshed));
      setSnackbar({ severity: 'success', message: 'Definition de tour mise a jour.' });
      setDirty(false);
      emitTabSaveDone(tabPath);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  return (
    <Box sx={{ display: active ? 'block' : 'none' }}>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Chargement de la definition de tour...</Typography>
        </Box>
      ) : row ? (
        <TourDefFormDialog
          open
          mode="edit"
          embedded
          primaryKey="TDCLEUNIK"
          initialData={row}
          onDirtyChange={(dirty) => setDirty(dirty)}
          onClose={() => { void reloadRow(); }}
          onSubmit={handleSubmit}
          saveCount={saveCount}
        />
      ) : null}

      <AppFeedbackSnackbar value={snackbar} onClose={() => setSnackbar(null)} />
    </Box>
  );
}
