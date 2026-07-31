import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { emitTabSaveDone } from '../../lib/useTabMetaEvents';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { toErrorMessage } from '../../components/useEntityPage';
import { useTabMetaEvents } from '../../lib/useTabMetaEvents';
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

function resolveArbitreLabel(row: ArbitreRow, fallback: string): string {
  const nom = String(row.NOM ?? '').trim().toUpperCase();
  const prenom = String(row.PRENOM ?? '').trim();
  return [nom, prenom].filter((part) => part.length > 0).join(' ') || fallback;
}

export function ArbitreTabFormPane({ tabPath, arbitreId, active }: ArbitreTabFormPaneProps) {
  const { setDirty, setLabel } = useTabMetaEvents(tabPath);
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ArbitreRow | undefined>(undefined);
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
      const data = await fetchArbitreById(arbitreId);
      setRow(data);
      setLabel(resolveArbitreLabel(data, String(arbitreId)));
      setDirty(false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [arbitreId, setDirty, setLabel]);

  useEffect(() => {
    const controller = new AbortController();

    void fetchNatio('', controller.signal)
      .then((result) => setNatioDatas(result.data ?? []))
      .catch(() => {});

    void reloadRow();

    return () => {
      controller.abort();
      setDirty(false);
    };
  }, [reloadRow, setDirty]);

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
          onDirtyChange={(dirty) => setDirty(dirty)}
          onClose={() => { void reloadRow(); }}
          onSubmit={async (payload) => {
            try {
              await updateArbitre(arbitreId, payload);
              const refreshed = await fetchArbitreById(arbitreId);
              setRow(refreshed);
              setLabel(resolveArbitreLabel(refreshed, String(arbitreId)));
              setDirty(false);
              setSnackbar({ severity: 'success', message: 'Arbitre mis a jour.' });
              emitTabSaveDone(tabPath);
              emitTabSaveDone(tabPath);
            } catch (error) {
              setSnackbar({ severity: 'error', message: toErrorMessage(error) });
            }
          }}
          saveCount={saveCount}
        />
      ) : null}

      <AppFeedbackSnackbar value={snackbar} onClose={() => setSnackbar(null)} />
    </Box>
  );
}
