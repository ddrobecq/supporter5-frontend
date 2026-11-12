import type { GridRowId } from '@mui/x-data-grid';
import { EntityListPage } from '../../components/EntityListPage';
import { TourDefFormDialog } from './TourDefFormDialog';
import { createTourDefColumns } from './tourDefColumnsHelper';
import { canDeleteTourDef, createTourDef, deleteTourDef, fetchTourDefById, fetchTourDefs, updateTourDef } from './tourDefApi';
import type { TourDefRow } from './types';
import { resolveTourDefId, resolveTourDefLabel } from './tourDefUi';

interface TourDefPageProps {
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

const TOUR_DEF_API = {
  fetchAll: fetchTourDefs,
  fetchById: fetchTourDefById,
  create: createTourDef,
  update: updateTourDef,
  remove: deleteTourDef,
  canDelete: canDeleteTourDef,
};

const TOUR_DEF_MESSAGES = {
  singular: 'définition de tour',
  singularArticle: 'cette définition de tour',
  created: 'Définition de tour créée.',
  updated: 'Définition de tour mise à jour.',
  deleted: 'Définition de tour supprimée.',
  selectToOpen: 'Sélectionnez une définition de tour à ouvrir.',
  selectToDelete: 'Sélectionnez une définition de tour à supprimer.',
  noneSelected: 'Aucune définition de tour sélectionnée.',
};

const TOUR_DEF_COLUMNS = createTourDefColumns();

export function TourDefPage({ onOpenInTab }: TourDefPageProps) {
  return (
    <EntityListPage<TourDefRow>
      api={TOUR_DEF_API}
      messages={TOUR_DEF_MESSAGES}
      title="Définitions de Tour"
      searchLabel="Rechercher une définition de tour"
      primaryKey="TDCLEUNIK"
      resolveId={resolveTourDefId}
      resolveLabel={resolveTourDefLabel}
      columns={TOUR_DEF_COLUMNS}
      renderFormDialog={(dialog) => <TourDefFormDialog {...dialog} />}
      onOpenInTab={onOpenInTab}
    />
  );
}
