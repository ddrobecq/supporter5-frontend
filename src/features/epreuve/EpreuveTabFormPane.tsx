import { EntityTabFormPane } from '../../components/EntityTabFormPane';
import { EpreuveFormDialog } from './EpreuveFormDialog';
import { fetchEpreuveById, updateEpreuve } from './epreuveApi';
import type { EpreuveRow } from './types';

interface EpreuveTabFormPaneProps {
  tabPath: string;
  epreuveId: string;
  active: boolean;
}

function resolveEpreuveLabel(row: EpreuveRow, id: string): string {
  return String(row.EPREUVE ?? '').trim() || String(id);
}

export function EpreuveTabFormPane({ tabPath, epreuveId, active }: EpreuveTabFormPaneProps) {
  return (
    <EntityTabFormPane
      tabPath={tabPath}
      id={epreuveId}
      active={active}
      fetchById={fetchEpreuveById}
      update={updateEpreuve}
      resolveLabel={resolveEpreuveLabel}
      syncLabelOnLoad
      primaryKey="IDEPREUVE"
      loadingLabel="Chargement de l'épreuve..."
      successMessage="Épreuve mise à jour."
      renderForm={(formProps) => <EpreuveFormDialog {...formProps} />}
    />
  );
}
