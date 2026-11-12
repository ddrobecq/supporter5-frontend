import type { GridRowId } from '@mui/x-data-grid';
import { canDeleteCirc, createCirc, deleteCirc, fetchCirc, fetchCircById, updateCirc } from './circApi';
import { CircFormDialog } from './CircFormDialog';
import { EntityListPage } from '../../components/EntityListPage';
import { createCircColumns } from './circColumnsHelper';
import type { CircRow } from './types';
import { resolveCircId, resolveCircLabel } from './circUi';

interface CircPageProps {
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

const CIRC_API = {
  fetchAll: fetchCirc,
  fetchById: fetchCircById,
  create: createCirc,
  update: updateCirc,
  remove: deleteCirc,
  canDelete: canDeleteCirc,
};

const CIRC_MESSAGES = {
  singular: 'circonstance',
  singularArticle: 'cette circonstance',
  created: 'Circonstance créée.',
  updated: 'Circonstance mise à jour.',
  deleted: 'Circonstance supprimée.',
  selectToOpen: 'Sélectionnez une circonstance à ouvrir.',
  selectToDelete: 'Sélectionnez une circonstance à supprimer.',
  noneSelected: 'Aucune circonstance sélectionnée.',
};

const CIRC_COLUMNS = createCircColumns();

export function CircPage({ onOpenInTab }: CircPageProps) {
  return (
    <EntityListPage<CircRow>
      api={CIRC_API}
      messages={CIRC_MESSAGES}
      title="Circonstances"
      searchLabel="Rechercher une circonstance"
      primaryKey="IDCIRC"
      resolveId={resolveCircId}
      resolveLabel={resolveCircLabel}
      columns={CIRC_COLUMNS}
      renderFormDialog={(dialog) => <CircFormDialog {...dialog} />}
      onOpenInTab={onOpenInTab}
    />
  );
}
