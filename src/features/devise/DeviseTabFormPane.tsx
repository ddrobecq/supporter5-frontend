import { EntityTabFormPane } from '../../components/EntityTabFormPane';
import { DeviseFormDialog } from './DeviseFormDialog';
import { fetchDeviseById, updateDevise } from './deviseApi';
import { resolveDeviseLabel } from './deviseUi';

interface DeviseTabFormPaneProps {
  tabPath: string;
  deviseId: string;
  active: boolean;
}

export function DeviseTabFormPane({ tabPath, deviseId, active }: DeviseTabFormPaneProps) {
  return (
    <EntityTabFormPane
      tabPath={tabPath}
      id={deviseId}
      active={active}
      fetchById={fetchDeviseById}
      update={updateDevise}
      resolveLabel={resolveDeviseLabel}
      primaryKey="DVCLEUNIK"
      loadingLabel="Chargement de la devise..."
      successMessage="Devise mise à jour."
      renderForm={(formProps) => <DeviseFormDialog {...formProps} />}
    />
  );
}
