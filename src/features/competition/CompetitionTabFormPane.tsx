import { Box, CircularProgress, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { AppFeedbackSnackbar } from '../../components/AppFeedbackSnackbar';
import type { FeedbackMessage } from '../../components/AppFeedbackSnackbar';
import { toErrorMessage } from '../../components/useEntityPage';
import { useTabMetaEvents } from '../../lib/useTabMetaEvents';
import { CompetitionFormDialog } from './CompetitionFormDialog';
import { fetchCompetitionById, fetchCompetitionWizardData, updateCompetition } from './competitionApi';
import type { CompetitionRow, EpreuveOption, SaisonOption } from './types';

interface CompetitionTabFormPaneProps {
  tabPath: string;
  competitionId: string;
  active: boolean;
}

function resolveCompetitionLabel(row: CompetitionRow, fallback: string): string {
  const nom = String(row.NOM ?? '').trim();
  const saison = String(row.SAISON ?? '').trim();
  return [nom, saison].filter((part) => part.length > 0).join(' ') || fallback;
}

export function CompetitionTabFormPane({ tabPath, competitionId, active }: CompetitionTabFormPaneProps) {
  const { setDirty, setLabel } = useTabMetaEvents(tabPath);
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<CompetitionRow | undefined>(undefined);
  const [epreuveOptions, setEpreuveOptions] = useState<EpreuveOption[]>([]);
  const [saisonOptions, setSaisonOptions] = useState<SaisonOption[]>([]);
  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);

  const reloadRow = useCallback(async () => {
    setLoading(true);
    try {
      const [data, wizardData] = await Promise.all([
        fetchCompetitionById(competitionId),
        fetchCompetitionWizardData(),
      ]);
      setRow(data);
      setEpreuveOptions(wizardData.epreuves);
      setSaisonOptions(wizardData.saisons);
      const label = resolveCompetitionLabel(data, String(competitionId));
      setLabel(label);
      setDirty(false);
      return true;
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [competitionId, setDirty, setLabel]);

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
          <Typography variant="body2" color="text.secondary">Chargement de la competition...</Typography>
        </Box>
      ) : row ? (
        <CompetitionFormDialog
          open
          mode="edit"
          embedded
          primaryKey="COCLEUNIK"
          initialData={row}
          epreuveOptions={epreuveOptions}
          saisonOptions={saisonOptions}
          onClose={() => { void reloadRow(); }}
          onSubmit={async (payload) => {
            try {
              await updateCompetition(competitionId, payload);
              const refreshed = await fetchCompetitionById(competitionId);
              setRow(refreshed);
              const label = resolveCompetitionLabel(refreshed, String(competitionId));
              setLabel(label);
              setDirty(false);
              setSnackbar({ severity: 'success', message: 'Competition mise a jour.' });
            } catch (error) {
              setSnackbar({ severity: 'error', message: toErrorMessage(error) });
            }
          }}
          onDirtyChange={(dirty) => setDirty(dirty)}
        />
      ) : null}

      <AppFeedbackSnackbar value={snackbar} onClose={() => setSnackbar(null)} />
    </Box>
  );
}
