import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { toErrorMessage } from '../../components/useEntityPage';
import { fetchTerrainById, updateTerrain } from './terrainApi';
import { TerrainFormDialog } from './TerrainFormDialog';
import type { TerrainRow } from './types';
import { buildTerrainFormFields, detectTerrainPrimaryKey, resolveTerrainLabel } from './terrainUi';

interface TerrainTabFormPaneProps {
  tabPath: string;
  terrainId: string;
  active: boolean;
}

function dispatchDirty(tabPath: string, dirty: boolean) {
  window.dispatchEvent(new CustomEvent('supporter:tab-dirty', { detail: { path: tabPath, dirty } }));
}

function dispatchTabLabel(tabPath: string, label: string) {
  window.dispatchEvent(new CustomEvent('supporter:tab-label', { detail: { path: tabPath, label } }));
}

export function TerrainTabFormPane({ tabPath, terrainId, active }: TerrainTabFormPaneProps) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<TerrainRow | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const reloadRow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTerrainById(terrainId);
      setRow(data);
      dispatchDirty(tabPath, false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [tabPath, terrainId]);

  useEffect(() => {
    void reloadRow();

    return () => {
      dispatchDirty(tabPath, false);
    };
  }, [reloadRow, tabPath]);

  const fields = useMemo(() => buildTerrainFormFields(row), [row]);
  const primaryKey = useMemo(() => detectTerrainPrimaryKey(row ? [row] : []), [row]);

  const handleSubmit = async (payload: TerrainRow) => {
    try {
      await updateTerrain(terrainId, payload);
      const refreshed = await fetchTerrainById(terrainId);
      setRow(refreshed);
      dispatchTabLabel(tabPath, resolveTerrainLabel(refreshed));
      setSnackbar({ severity: 'success', message: 'Terrain mis a jour.' });
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
          <Typography variant="body2" color="text.secondary">Chargement du stade...</Typography>
        </Box>
      ) : row ? (
        <TerrainFormDialog
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
