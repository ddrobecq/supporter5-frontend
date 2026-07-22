import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { toErrorMessage } from '../../components/useEntityPage';
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

function dispatchDirty(tabPath: string, dirty: boolean) {
  window.dispatchEvent(new CustomEvent('supporter:tab-dirty', { detail: { path: tabPath, dirty } }));
}

function dispatchTabLabel(tabPath: string, label: string) {
  window.dispatchEvent(new CustomEvent('supporter:tab-label', { detail: { path: tabPath, label } }));
}

export function VilleTabFormPane({ tabPath, villeId, active }: VilleTabFormPaneProps) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<VilleRow | undefined>(undefined);
  const [natioDatas, setNatioDatas] = useState<NatioRow[]>([]);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const reloadRow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchVilleById(villeId);
      setRow(data);
      dispatchDirty(tabPath, false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [tabPath, villeId]);

  useEffect(() => {
    void fetchNatio('').then((result) => setNatioDatas(result.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    void reloadRow();

    return () => {
      dispatchDirty(tabPath, false);
    };
  }, [reloadRow, tabPath]);

  const fields = useMemo(() => buildVilleFormFields(row), [row]);
  const primaryKey = useMemo(() => detectVillePrimaryKey(row ? [row] : []), [row]);

  const handleSubmit = async (payload: VilleRow) => {
    try {
      await updateVille(villeId, payload);
      const refreshed = await fetchVilleById(villeId);
      setRow(refreshed);
      dispatchTabLabel(tabPath, resolveVilleLabel(refreshed));
      setSnackbar({ severity: 'success', message: 'Ville mise a jour.' });
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
          onDirtyChange={(dirty) => dispatchDirty(tabPath, dirty)}
          onClose={() => { void reloadRow(); }}
          onSubmit={handleSubmit}
        />
      ) : null}

      <AppFeedbackSnackbar value={snackbar} onClose={() => setSnackbar(null)} />
    </Box>
  );
}
