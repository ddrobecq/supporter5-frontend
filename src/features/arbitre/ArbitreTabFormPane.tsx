import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { toErrorMessage } from '../../components/useEntityPage';
import { fetchNatio } from '../natio/natioApi';
import type { NatioRow } from '../natio/types';
import { ArbitreFormDialog } from './ArbitreFormDialog';
import { fetchArbitreById, updateArbitre } from './arbitreApi';
import type { ArbitreRow } from './types';

interface ArbitreTabFormPaneProps {
  tabPath: string;
  arbitreId: string;
  active: boolean;
}

function dispatchDirty(tabPath: string, dirty: boolean) {
  window.dispatchEvent(new CustomEvent('supporter:tab-dirty', { detail: { path: tabPath, dirty } }));
}

function dispatchTabLabel(tabPath: string, label: string) {
  window.dispatchEvent(new CustomEvent('supporter:tab-label', { detail: { path: tabPath, label } }));
}

function resolveArbitreLabel(row: ArbitreRow, fallback: string): string {
  const nom = String(row.NOM ?? '').trim().toUpperCase();
  const prenom = String(row.PRENOM ?? '').trim();
  return [nom, prenom].filter((part) => part.length > 0).join(' ') || fallback;
}

export function ArbitreTabFormPane({ tabPath, arbitreId, active }: ArbitreTabFormPaneProps) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ArbitreRow | undefined>(undefined);
  const [natioDatas, setNatioDatas] = useState<NatioRow[]>([]);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const reloadRow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchArbitreById(arbitreId);
      setRow(data);
      dispatchTabLabel(tabPath, resolveArbitreLabel(data, String(arbitreId)));
      dispatchDirty(tabPath, false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [arbitreId, tabPath]);

  useEffect(() => {
    const controller = new AbortController();

    void fetchNatio('', controller.signal)
      .then((result) => setNatioDatas(result.data ?? []))
      .catch(() => {});

    void reloadRow();

    return () => {
      controller.abort();
      dispatchDirty(tabPath, false);
    };
  }, [reloadRow, tabPath]);

  const formFields = useMemo<string[]>(() => {
    if (!row) return [];
    const sourceFields = Object.keys(row);
    return sourceFields.filter((field, index, array) => array.indexOf(field) === index);
  }, [row]);

  return (
    <Box sx={{ display: active ? 'block' : 'none' }}>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Chargement de l'arbitre...</Typography>
        </Box>
      ) : row ? (
        <ArbitreFormDialog
          open
          mode="edit"
          embedded
          fields={formFields}
          primaryKey="IDARBITRE"
          initialData={row}
          natioDatas={natioDatas}
          onClose={() => { void reloadRow(); }}
          onSubmit={async (payload) => {
            try {
              await updateArbitre(arbitreId, payload);
              const refreshed = await fetchArbitreById(arbitreId);
              setRow(refreshed);
              dispatchTabLabel(tabPath, resolveArbitreLabel(refreshed, String(arbitreId)));
              dispatchDirty(tabPath, false);
              setSnackbar({ severity: 'success', message: 'Arbitre mis a jour.' });
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
