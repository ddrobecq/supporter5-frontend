import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { emitTabSaveDone } from '../../lib/useTabMetaEvents';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { toErrorMessage } from '../../components/useEntityPage';
import { useTabMetaEvents } from '../../lib/useTabMetaEvents';
import { fetchNatio } from '../natio/natioApi';
import type { NatioRow } from '../natio/types';
import { fetchVilleById, updateVille } from './villeApi';
import { VilleFormDialog } from './VilleFormDialog';
import type { VilleRow } from './types';
import { buildVilleFormFields, detectVillePrimaryKey, resolveVilleLabel } from './villeUi';

interface VilleTabFormPaneProps {
  tabPath: string;
  villeId: string;
  active: boolean;
}

export function VilleTabFormPane({ tabPath, villeId, active }: VilleTabFormPaneProps) {
  const { setDirty, setLabel } = useTabMetaEvents(tabPath);
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<VilleRow | undefined>(undefined);
  const [natioDatas, setNatioDatas] = useState<NatioRow[]>([]);
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
      const data = await fetchVilleById(villeId);
      setRow(data);
      setDirty(false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [setDirty, villeId]);

  useEffect(() => {
    void fetchNatio('').then((result) => setNatioDatas(result.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    void reloadRow();

    return () => {
      setDirty(false);
    };
  }, [reloadRow, setDirty]);

  const fields = useMemo(() => buildVilleFormFields(row), [row]);
  const primaryKey = useMemo(() => detectVillePrimaryKey(row ? [row] : []), [row]);

  const handleSubmit = async (payload: VilleRow) => {
    try {
      await updateVille(villeId, payload);
      const refreshed = await fetchVilleById(villeId);
      setRow(refreshed);
      setLabel(resolveVilleLabel(refreshed));
      setSnackbar({ severity: 'success', message: 'Ville mise a jour.' });
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
          <Typography variant="body2" color="text.secondary">Chargement de la ville...</Typography>
        </Box>
      ) : row ? (
        <VilleFormDialog
          open
          mode="edit"
          embedded
          fields={fields}
          primaryKey={primaryKey}
          initialData={row}
          natioDatas={natioDatas}
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
