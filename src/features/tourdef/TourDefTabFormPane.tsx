import { EntityTabFormPane } from '../../components/EntityTabFormPane';
import { TourDefFormDialog } from './TourDefFormDialog';
import { fetchTourDefById, updateTourDef } from './tourDefApi';
import { resolveTourDefLabel } from './tourDefUi';

interface TourDefTabFormPaneProps {
  tabPath: string;
  tourDefId: string;
  active: boolean;
}

export function TourDefTabFormPane({ tabPath, tourDefId, active }: TourDefTabFormPaneProps) {
  return (
    <EntityTabFormPane
      tabPath={tabPath}
      id={tourDefId}
      active={active}
      fetchById={fetchTourDefById}
      update={updateTourDef}
      resolveLabel={resolveTourDefLabel}
      primaryKey="TDCLEUNIK"
      loadingLabel="Chargement de la définition de tour..."
      successMessage="Définition de tour mise à jour."
      renderForm={(formProps) => <TourDefFormDialog {...formProps} />}
    />
  );
}
