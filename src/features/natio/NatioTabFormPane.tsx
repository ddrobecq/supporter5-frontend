import { EntityTabFormPane } from '../../components/EntityTabFormPane';
import { NatioFormDialog } from './NatioFormDialog';
import { fetchNatioById, updateNatio } from './natioApi';
import type { NatioRow } from './types';
import { buildNatioFormFields, detectNatioPrimaryKey, resolveNatioLabel } from './natioUi';

interface NatioTabFormPaneProps {
  tabPath: string;
  natioId: string;
  active: boolean;
}

function detectNatioRowPrimaryKey(row: NatioRow): string | undefined {
  return detectNatioPrimaryKey([row]);
}

export function NatioTabFormPane({ tabPath, natioId, active }: NatioTabFormPaneProps) {
  return (
    <EntityTabFormPane
      tabPath={tabPath}
      id={natioId}
      active={active}
      fetchById={fetchNatioById}
      update={updateNatio}
      resolveLabel={resolveNatioLabel}
      primaryKey={detectNatioRowPrimaryKey}
      deriveFromRow={buildNatioFormFields}
      loadingLabel="Chargement du pays..."
      successMessage="Pays mis à jour."
      renderForm={(formProps, fields) => <NatioFormDialog {...formProps} fields={fields} />}
    />
  );
}
