import type { GridRowId } from '@mui/x-data-grid';
import { createDevise, deleteDevise, fetchDevise, fetchDeviseById, updateDevise, canDeleteDevise } from './deviseApi';
import { DeviseFormDialog } from './DeviseFormDialog';
import { EntityListPage } from '../../components/EntityListPage';
import { createDeviseColumns } from './deviseColumnsHelper';
import type { DeviseRow } from './types';
import { resolveDeviseId, resolveDeviseLabel } from './deviseUi';

interface DevisePageProps {
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

const DEVISE_API = {
  fetchAll: fetchDevise,
  fetchById: fetchDeviseById,
  create: createDevise,
  update: updateDevise,
  remove: deleteDevise,
  canDelete: canDeleteDevise,
};

const DEVISE_MESSAGES = {
  singular: 'devise',
  singularArticle: 'cette devise',
  created: 'Devise créée.',
  updated: 'Devise mise à jour.',
  deleted: 'Devise supprimée.',
  selectToOpen: 'Sélectionnez une devise à ouvrir.',
  selectToDelete: 'Sélectionnez une devise à supprimer.',
  noneSelected: 'Aucune devise sélectionnée.',
};

const DEVISE_COLUMNS = createDeviseColumns();

export function DevisePage({ onOpenInTab }: DevisePageProps) {
  return (
    <EntityListPage<DeviseRow>
      api={DEVISE_API}
      messages={DEVISE_MESSAGES}
      title="Devises"
      searchLabel="Rechercher une devise"
      primaryKey="DVCLEUNIK"
      resolveId={resolveDeviseId}
      resolveLabel={resolveDeviseLabel}
      columns={DEVISE_COLUMNS}
      renderFormDialog={(dialog) => <DeviseFormDialog {...dialog} />}
      onOpenInTab={onOpenInTab}
    />
  );
}
