import { Box, Stack, Tab, Tabs } from '@mui/material';
import { useState } from 'react';
import { EntityTabFormPane } from '../../components/EntityTabFormPane';
import { EpreuveFormDialog } from './EpreuveFormDialog';
import { EpreuvePalmaresGrid } from './EpreuvePalmaresGrid';
import { fetchEpreuveById, updateEpreuve } from './epreuveApi';
import type { EpreuveRow } from './types';

interface EpreuveTabFormPaneProps {
  tabPath: string;
  epreuveId: string;
  active: boolean;
}

type EpreuveTabKey = 'info' | 'palmares';

function resolveEpreuveLabel(row: EpreuveRow, id: string): string {
  return String(row.EPREUVE ?? '').trim() || String(id);
}

export function EpreuveTabFormPane({ tabPath, epreuveId, active }: EpreuveTabFormPaneProps) {
  const [activeTab, setActiveTab] = useState<EpreuveTabKey>('info');
  const [hasOpenedPalmaresTab, setHasOpenedPalmaresTab] = useState(false);

  return (
    <Box sx={{ display: active ? 'block' : 'none' }}>
      <Stack spacing={2}>
        <Tabs
          value={activeTab}
          onChange={(_event, value: EpreuveTabKey) => {
            setActiveTab(value);
            if (value === 'palmares') setHasOpenedPalmaresTab(true);
          }}
          sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36 } }}
        >
          <Tab value="info" label="Informations" />
          <Tab value="palmares" label="Palmarès" />
        </Tabs>

        {/* Toujours monte (masque hors sous-onglet Infos) pour garder le brouillon et traiter les demandes de sauvegarde. */}
        <EntityTabFormPane
          tabPath={tabPath}
          id={epreuveId}
          active={active}
          formVisible={activeTab === 'info'}
          fetchById={fetchEpreuveById}
          update={updateEpreuve}
          resolveLabel={resolveEpreuveLabel}
          syncLabelOnLoad
          primaryKey="IDEPREUVE"
          loadingLabel="Chargement de l'épreuve..."
          successMessage="Épreuve mise à jour."
          renderForm={(formProps) => <EpreuveFormDialog {...formProps} />}
        />

        {hasOpenedPalmaresTab ? (
          <Box sx={{ display: activeTab === 'palmares' ? 'block' : 'none' }}>
            <EpreuvePalmaresGrid epreuveId={epreuveId} />
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}
