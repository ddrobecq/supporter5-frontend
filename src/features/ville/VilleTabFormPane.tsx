import { EntityTabFormPane } from '../../components/EntityTabFormPane';
import { useNatioList } from '../natio/natioStore';
import { VilleFormDialog } from './VilleFormDialog';
import { fetchVilleById, updateVille } from './villeApi';
import type { VilleRow } from './types';
import { buildVilleFormFields, detectVillePrimaryKey, resolveVilleLabel } from './villeUi';

interface VilleTabFormPaneProps {
  tabPath: string;
  villeId: string;
  active: boolean;
}

function detectVilleRowPrimaryKey(row: VilleRow): string | undefined {
  return detectVillePrimaryKey([row]);
}

export function VilleTabFormPane({ tabPath, villeId, active }: VilleTabFormPaneProps) {
  const { rows: natioDatas } = useNatioList();

  return (
    <EntityTabFormPane
      tabPath={tabPath}
      id={villeId}
      active={active}
      fetchById={fetchVilleById}
      update={updateVille}
      resolveLabel={resolveVilleLabel}
      primaryKey={detectVilleRowPrimaryKey}
      deriveFromRow={buildVilleFormFields}
      loadingLabel="Chargement de la ville..."
      successMessage="Ville mise à jour."
      renderForm={(formProps, fields) => <VilleFormDialog {...formProps} fields={fields} natioDatas={natioDatas} />}
    />
  );
}
