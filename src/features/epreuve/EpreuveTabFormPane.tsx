import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { toErrorMessage } from '../../components/useEntityPage';
import { EpreuveFormDialog } from './EpreuveFormDialog';
import { fetchEpreuveById, updateEpreuve } from './epreuveApi';
import type { EpreuveRow } from './types';

interface EpreuveTabFormPaneProps {
  tabPath: string;
  epreuveId: string;
  active: boolean;
}

function dispatchDirty(tabPath: string, dirty: boolean) {
  window.dispatchEvent(new CustomEvent('supporter:tab-dirty', { detail: { path: tabPath, dirty } }));
}

function dispatchTabLabel(tabPath: string, label: string) {
  window.dispatchEvent(new CustomEvent('supporter:tab-label', { detail: { path: tabPath, label } }));
}

export function EpreuveTabFormPane({ tabPath, epreuveId, active }: EpreuveTabFormPaneProps) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<EpreuveRow | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const reloadRow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEpreuveById(epreuveId);
      setRow(data);
      const label = String(data.EPREUVE ?? '').trim() || String(epreuveId);
      dispatchTabLabel(tabPath, label);
      dispatchDirty(tabPath, false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [epreuveId, tabPath]);

  useEffect(() => {
    void reloadRow();
    return () => {
      dispatchDirty(tabPath, false);
    };
  }, [reloadRow, tabPath]);

  return (
    <Box sx={{ display: active ? 'block' : 'none' }}>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Chargement de l'epreuve...</Typography>
        </Box>
      ) : row ? (
        <EpreuveFormDialog
          open
          mode="edit"
          embedded
          primaryKey="IDEPREUVE"
          initialData={row}
          onClose={() => { void reloadRow(); }}
          onSubmit={async (payload) => {
            try {
              await updateEpreuve(epreuveId, payload);
              const refreshed = await fetchEpreuveById(epreuveId);
              setRow(refreshed);
              const label = String(refreshed.EPREUVE ?? '').trim() || String(epreuveId);
              dispatchTabLabel(tabPath, label);
              dispatchDirty(tabPath, false);
              setSnackbar({ severity: 'success', message: 'Epreuve mise a jour.' });
            } catch (error) {
              setSnackbar({ severity: 'error', message: toErrorMessage(error) });
            }
          }}
        />
      ) : null}

      <AppFeedbackSnackbar value={snackbar} onClose={() => setSnackbar(null)} />
    </Box>
  );
}
