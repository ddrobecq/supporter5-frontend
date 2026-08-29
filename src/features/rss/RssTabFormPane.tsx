import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { toErrorMessage } from '../../components/useEntityPage';
import { emitTabSaveDone, useTabMetaEvents } from '../../lib/useTabMetaEvents';
import { RssFormDialog } from './RssFormDialog';
import { fetchRssById, updateRss } from './rssApi';
import { resolveRssLabel } from './rssUi';
import type { RssRow } from './types';

interface RssTabFormPaneProps {
  tabPath: string;
  rssId: string;
  active: boolean;
}

export function RssTabFormPane({ tabPath, rssId, active }: RssTabFormPaneProps) {
  const { setDirty, setLabel } = useTabMetaEvents(tabPath);
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<RssRow | undefined>(undefined);
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
      const data = await fetchRssById(rssId);
      setRow(data);
      setDirty(false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [rssId, setDirty]);

  useEffect(() => {
    void reloadRow();
    return () => {
      setDirty(false);
    };
  }, [reloadRow, setDirty]);

  const handleSubmit = async (payload: RssRow) => {
    try {
      await updateRss(rssId, payload);
      const refreshed = await fetchRssById(rssId);
      setRow(refreshed);
      setLabel(resolveRssLabel(refreshed));
      setSnackbar({ severity: 'success', message: 'Flux RSS mis a jour.' });
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
          <Typography variant="body2" color="text.secondary">Chargement du flux RSS...</Typography>
        </Box>
      ) : row ? (
        <RssFormDialog
          open
          mode="edit"
          embedded
          primaryKey="RSSID"
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
