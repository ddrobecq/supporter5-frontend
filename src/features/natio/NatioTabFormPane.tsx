import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { toErrorMessage } from '../../components/useEntityPage';
import { fetchNatioById, updateNatio } from './natioApi';
import { NatioFormDialog } from './NatioFormDialog';
import type { NatioRow } from './types';
import { buildNatioFormFields, detectNatioPrimaryKey, resolveNatioLabel } from './natioUi';

interface NatioTabFormPaneProps {
  tabPath: string;
  natioId: string;
  active: boolean;
}

function dispatchDirty(tabPath: string, dirty: boolean) {
  window.dispatchEvent(new CustomEvent('supporter:tab-dirty', { detail: { path: tabPath, dirty } }));
}

function dispatchTabLabel(tabPath: string, label: string) {
  window.dispatchEvent(new CustomEvent('supporter:tab-label', { detail: { path: tabPath, label } }));
}

export function NatioTabFormPane({ tabPath, natioId, active }: NatioTabFormPaneProps) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<NatioRow | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const reloadRow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNatioById(natioId);
      setRow(data);
      dispatchDirty(tabPath, false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [natioId, tabPath]);

  useEffect(() => {
    void reloadRow();

    return () => {
      dispatchDirty(tabPath, false);
    };
  }, [reloadRow, tabPath]);

  const fields = useMemo(() => buildNatioFormFields(row), [row]);

  const primaryKey = useMemo(() => detectNatioPrimaryKey(row ? [row] : []), [row]);

  const handleSubmit = async (payload: NatioRow) => {
    try {
      await updateNatio(natioId, payload);
      const refreshed = await fetchNatioById(natioId);
      setRow(refreshed);
      dispatchTabLabel(tabPath, resolveNatioLabel(refreshed));
      setSnackbar({ severity: 'success', message: 'Pays mis a jour.' });
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
          <Typography variant="body2" color="text.secondary">Chargement du pays...</Typography>
        </Box>
      ) : row ? (
        <NatioFormDialog
          open
          mode="edit"
          embedded
          fields={fields}
          primaryKey={primaryKey}
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
