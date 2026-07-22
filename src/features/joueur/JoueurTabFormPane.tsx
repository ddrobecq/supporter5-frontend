import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { toErrorMessage } from '../../components/useEntityPage';
import { fetchNatio } from '../natio/natioApi';
import type { NatioRow } from '../natio/types';
import { JoueurFormDialog } from './JoueurFormDialog';
import { fetchJoueurById, fetchJoueurPostes, updateJoueur } from './joueurApi';
import type { JoueurRow, PosteOption } from './types';

interface JoueurTabFormPaneProps {
  tabPath: string;
  joueurId: string;
  active: boolean;
}

function dispatchDirty(tabPath: string, dirty: boolean) {
  window.dispatchEvent(new CustomEvent('supporter:tab-dirty', { detail: { path: tabPath, dirty } }));
}

function dispatchTabLabel(tabPath: string, label: string) {
  window.dispatchEvent(new CustomEvent('supporter:tab-label', { detail: { path: tabPath, label } }));
}

function resolveJoueurLabel(row: JoueurRow, fallback: string): string {
  const nom = String(row.NOM ?? '').trim().toUpperCase();
  const prenom = String(row.PRENOM ?? '').trim();
  return [nom, prenom].filter((part) => part.length > 0).join(' ') || fallback;
}

export function JoueurTabFormPane({ tabPath, joueurId, active }: JoueurTabFormPaneProps) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<JoueurRow | undefined>(undefined);
  const [natioDatas, setNatioDatas] = useState<NatioRow[]>([]);
  const [posteOptions, setPosteOptions] = useState<PosteOption[]>([]);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const reloadRow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJoueurById(joueurId);
      setRow(data);
      dispatchTabLabel(tabPath, resolveJoueurLabel(data, String(joueurId)));
      dispatchDirty(tabPath, false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [joueurId, tabPath]);

  useEffect(() => {
    const controller = new AbortController();

    void fetchNatio('', controller.signal)
      .then((result) => setNatioDatas(result.data ?? []))
      .catch(() => {});

    void fetchJoueurPostes(controller.signal)
      .then((result) => setPosteOptions(result))
      .catch(() => {});

    void reloadRow();

    return () => {
      controller.abort();
      dispatchDirty(tabPath, false);
    };
  }, [reloadRow, tabPath]);

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
          onClose={() => { void reloadRow(); }}
          onSubmit={async (payload) => {
            try {
              await updateJoueur(joueurId, payload);
              const refreshed = await fetchJoueurById(joueurId);
              setRow(refreshed);
              dispatchTabLabel(tabPath, resolveJoueurLabel(refreshed, String(joueurId)));
              dispatchDirty(tabPath, false);
              setSnackbar({ severity: 'success', message: 'Joueur mis a jour.' });
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
