import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { createVille, deleteVille, fetchVille, fetchVilleById, updateVille, canDeleteVille } from './villeApi';
import { useNatioList } from '../natio/natioStore';
import { VilleFormDialog } from './VilleFormDialog';
import { createVilleColumns, createNatioMap } from './villeColumnsHelper';
import { EntityListPage } from '../../components/EntityListPage';
import type { VilleRow } from './types';
import { buildVilleFormFields, resolveVilleId, resolveVilleLabel } from './villeUi';

interface VillePageProps {
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
  onSelectVille?: (ville: VilleRow) => void;
}

const VILLE_API = {
  fetchAll: fetchVille,
  fetchById: fetchVilleById,
  create: createVille,
  update: updateVille,
  remove: deleteVille,
  canDelete: canDeleteVille,
};

const VILLE_MESSAGES = {
  singular: 'ville',
  singularArticle: 'cette ville',
  created: 'Ville créée.',
  updated: 'Ville mise à jour.',
  deleted: 'Ville supprimée.',
  selectToOpen: 'Sélectionnez une ville à ouvrir.',
  selectToDelete: 'Sélectionnez une ville à supprimer.',
  noneSelected: 'Aucune ville sélectionnée.',
};

export function VillePage({ onOpenInTab, onSelectVille }: VillePageProps) {
  const { rows: natioDatas } = useNatioList();
  const natioMap = useMemo(() => createNatioMap(natioDatas), [natioDatas]);
  const columns = useMemo<GridColDef<VilleRow>[]>(() => createVilleColumns(natioMap), [natioMap]);

  return (
    <EntityListPage<VilleRow>
      api={VILLE_API}
      messages={VILLE_MESSAGES}
      title="Villes"
      searchLabel="Rechercher une ville"
      primaryKey="VICLEUNIK"
      resolveId={resolveVilleId}
      resolveLabel={resolveVilleLabel}
      columns={columns}
      buildFormFields={buildVilleFormFields}
      renderFormDialog={(dialog, fields) => (
        <VilleFormDialog {...dialog} fields={fields} natioDatas={natioDatas} />
      )}
      onOpenInTab={onOpenInTab}
      onSelectRow={onSelectVille}
    />
  );
}
