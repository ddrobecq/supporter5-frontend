import { EntityTabFormPane } from '../../components/EntityTabFormPane';
import { CircFormDialog } from './CircFormDialog';
import { fetchCircById, updateCirc } from './circApi';
import { resolveCircLabel } from './circUi';

interface CircTabFormPaneProps {
  tabPath: string;
  circId: string;
  active: boolean;
}

export function CircTabFormPane({ tabPath, circId, active }: CircTabFormPaneProps) {
  return (
    <EntityTabFormPane
      tabPath={tabPath}
      id={circId}
      active={active}
      fetchById={fetchCircById}
      update={updateCirc}
      resolveLabel={resolveCircLabel}
      primaryKey="IDCIRC"
      loadingLabel="Chargement de la circonstance..."
      successMessage="Circonstance mise à jour."
      renderForm={(formProps) => <CircFormDialog {...formProps} />}
    />
  );
}
