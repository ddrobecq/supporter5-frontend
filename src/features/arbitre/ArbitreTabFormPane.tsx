import { EntityTabFormPane } from '../../components/EntityTabFormPane';
import { useNatioList } from '../natio/natioStore';
import { ArbitreFormDialog } from './ArbitreFormDialog';
import { fetchArbitreById, updateArbitre } from './arbitreApi';
import type { ArbitreRow } from './types';

interface ArbitreTabFormPaneProps {
  tabPath: string;
  arbitreId: string;
  active: boolean;
}

function resolveArbitreLabel(row: ArbitreRow, fallback: string): string {
  const nom = String(row.NOM ?? '').trim().toUpperCase();
  const prenom = String(row.PRENOM ?? '').trim();
  return [nom, prenom].filter((part) => part.length > 0).join(' ') || fallback;
}

function resolveArbitreFormFields(row: ArbitreRow): string[] {
  const sourceFields = Object.keys(row);
  return sourceFields.filter((field, index, array) => array.indexOf(field) === index);
}

export function ArbitreTabFormPane({ tabPath, arbitreId, active }: ArbitreTabFormPaneProps) {
  const { rows: natioDatas } = useNatioList();

  return (
    <EntityTabFormPane
      tabPath={tabPath}
      id={arbitreId}
      active={active}
      fetchById={fetchArbitreById}
      update={updateArbitre}
      resolveLabel={resolveArbitreLabel}
      syncLabelOnLoad
      primaryKey="IDARBITRE"
      deriveFromRow={resolveArbitreFormFields}
      loadingLabel="Chargement de l'arbitre..."
      successMessage="Arbitre mis à jour."
      renderForm={(formProps, fields) => <ArbitreFormDialog {...formProps} fields={fields} natioDatas={natioDatas} />}
    />
  );
}
