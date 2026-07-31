import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { emitTabSaveDone } from '../../lib/useTabMetaEvents';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { toErrorMessage } from '../../components/useEntityPage';
import { useTabMetaEvents } from '../../lib/useTabMetaEvents';
import { fetchNatioById, updateNatio } from './natioApi';
import { NatioFormDialog } from './NatioFormDialog';
import type { NatioRow } from './types';
import { buildNatioFormFields, detectNatioPrimaryKey, resolveNatioLabel } from './natioUi';

interface NatioTabFormPaneProps {
  tabPath: string;
  natioId: string;
  active: boolean;
}

export function NatioTabFormPane({ tabPath, natioId, active }: NatioTabFormPaneProps) {
  const { setDirty, setLabel } = useTabMetaEvents(tabPath);
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<NatioRow | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);
  const [saveCount, setSaveCount] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ path?: string }>;
      if (ev.detail?.path === tabPath) setSaveCount((c) => c + 1);
    };
    window.addEventListener('supporter:tab-save-request', handler);
    return () => window.removeEventListener('supporter:tab-save-request', handler);
  }, [tabPath]);

  const reloadRow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNatioById(natioId);
      setRow(data);
      setDirty(false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [natioId, setDirty]);

  useEffect(() => {
    void reloadRow();

    return () => {
      setDirty(false);
    };
  }, [reloadRow, setDirty]);

  const fields = useMemo(() => buildNatioFormFields(row), [row]);

  const primaryKey = useMemo(() => detectNatioPrimaryKey(row ? [row] : []), [row]);

  const handleSubmit = async (payload: NatioRow) => {
    try {
      await updateNatio(natioId, payload);
      const refreshed = await fetchNatioById(natioId);
      setRow(refreshed);
      setLabel(resolveNatioLabel(refreshed));
      setSnackbar({ severity: 'success', message: 'Pays mis a jour.' });
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
