import { Box, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { toErrorMessage } from '../../components/useEntityPage';
import { fetchClubGridById } from './clubApi';
import type { ClubGridRow } from './types';

interface ClubTabFormPaneProps {
  tabPath: string;
  clubId: string;
  active: boolean;
}

function dispatchDirty(tabPath: string, dirty: boolean) {
  window.dispatchEvent(new CustomEvent('supporter:tab-dirty', { detail: { path: tabPath, dirty } }));
}

function dispatchTabLabel(tabPath: string, label: string) {
  window.dispatchEvent(new CustomEvent('supporter:tab-label', { detail: { path: tabPath, label } }));
}

export function ClubTabFormPane({ tabPath, clubId, active }: ClubTabFormPaneProps) {
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<ClubGridRow | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const reloadRow = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClubGridById(clubId);
      setRow(data);
      const nextLabel = String(data.CLUB_NOM_COMPLET ?? '').trim() || String(data.CLUB_ABREGE ?? '').trim() || String(clubId);
      dispatchTabLabel(tabPath, nextLabel);
      dispatchDirty(tabPath, false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [clubId, tabPath]);

  useEffect(() => {
    void reloadRow();

    return () => {
      dispatchDirty(tabPath, false);
    };
  }, [reloadRow, tabPath]);

  return (
    <Box sx={{ display: active ? 'block' : 'none' }}>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Chargement du club...</Typography>
        </Box>
      ) : row ? (
        <Box sx={{ bgcolor: '#ffffff', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Fiche Club
            </Typography>
            <TextField
              label="Code"
              value={String(row.IDCLUB ?? '')}
              size="small"
              fullWidth
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              label="Abrege"
              value={String(row.CLUB_ABREGE ?? '')}
              size="small"
              fullWidth
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              label="Nom complet"
              value={String(row.CLUB_NOM_COMPLET ?? '')}
              size="small"
              fullWidth
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              label="Ville"
              value={String(row.VILLE_NOM ?? '')}
              size="small"
              fullWidth
              slotProps={{ input: { readOnly: true } }}
            />
          </Stack>
        </Box>
      ) : null}

      <AppFeedbackSnackbar value={snackbar} onClose={() => setSnackbar(null)} />
    </Box>
  );
}
