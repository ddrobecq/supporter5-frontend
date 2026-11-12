import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { useTabFormPaneBridge } from '../../lib/useTabFormPaneBridge';
import { toErrorMessage } from '../../components/useEntityPage';
import { useNatioList } from '../natio/natioStore';
import { usePostesList } from './postesStore';
import { JoueurFormDialog } from './JoueurFormDialog';
import { fetchJoueurById, updateJoueur } from './joueurApi';
import type { JoueurRow } from './types';

interface JoueurTabFormPaneProps {
  tabPath: string;
  joueurId: string;
  active: boolean;
}

function resolveJoueurLabel(row: JoueurRow, fallback: string): string {
  const nom = String(row.NOM ?? '').trim().toUpperCase();
  const prenom = String(row.PRENOM ?? '').trim();
  return [nom, prenom].filter((part) => part.length > 0).join(' ') || fallback;
}

export function JoueurTabFormPane({ tabPath, joueurId, active }: JoueurTabFormPaneProps) {
  const { setDirty, setLabel, saveRequestCount, notifySaveDone } = useTabFormPaneBridge({ tabPath });
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<JoueurRow | undefined>(undefined);
  const { rows: natioDatas } = useNatioList();
  const { rows: posteOptions } = usePostesList();
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const reloadRow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJoueurById(joueurId);
      setRow(data);
      setLabel(resolveJoueurLabel(data, String(joueurId)));
      setDirty(false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [joueurId, setDirty, setLabel]);

  useEffect(() => {
    void reloadRow();

    return () => {
      setDirty(false);
    };
  }, [reloadRow, setDirty]);

  return (
    <Box sx={{ display: active ? 'block' : 'none' }}>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Chargement du joueur...</Typography>
        </Box>
      ) : row ? (
        <JoueurFormDialog
          open
          mode="edit"
          embedded
          initialData={row}
          natioDatas={natioDatas}
          posteOptions={posteOptions}
          onDirtyChange={(dirty) => setDirty(dirty)}
          onClose={() => { void reloadRow(); }}
          onSubmit={async (payload) => {
            try {
              await updateJoueur(joueurId, payload);
              const refreshed = await fetchJoueurById(joueurId);
              setRow(refreshed);
              setLabel(resolveJoueurLabel(refreshed, String(joueurId)));
              setDirty(false);
              setSnackbar({ severity: 'success', message: 'Joueur mis à jour.' });
              notifySaveDone();
            } catch (error) {
              setSnackbar({ severity: 'error', message: toErrorMessage(error) });
              throw error;
            }
          }}
          saveCount={saveRequestCount}
        />
      ) : null}

      <AppFeedbackSnackbar value={snackbar} onClose={() => setSnackbar(null)} />
    </Box>
  );
}
