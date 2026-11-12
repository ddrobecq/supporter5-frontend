import type { GridRowId } from '@mui/x-data-grid';
import { canDeleteEpreuve, deleteEpreuve, fetchEpreuve, fetchEpreuveById, updateEpreuve } from './epreuveApi';
import { EpreuveFormDialog } from './EpreuveFormDialog';
import { EpreuveCreateWizardDialog } from './EpreuveCreateWizardDialog';
import { EntityListPage } from '../../components/EntityListPage';
import { createEpreuveColumns } from './epreuveColumnsHelper';
import type { EpreuveRow } from './types';

interface EpreuvePageProps {
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

const EPREUVE_API = {
  fetchAll: fetchEpreuve,
  fetchById: fetchEpreuveById,
  update: updateEpreuve,
  remove: deleteEpreuve,
  canDelete: canDeleteEpreuve,
};

const EPREUVE_MESSAGES = {
  singular: 'épreuve',
  singularArticle: 'cette épreuve',
  created: 'Épreuve créée.',
  updated: 'Épreuve mise à jour.',
  deleted: 'Épreuve supprimée.',
  selectToOpen: 'Sélectionnez une épreuve à ouvrir.',
  selectToDelete: 'Sélectionnez une épreuve à supprimer.',
  noneSelected: 'Aucune épreuve sélectionnée.',
};

const EPREUVE_COLUMNS = createEpreuveColumns();

function resolveEpreuveLabel(row: EpreuveRow): string {
  return String(row.EPREUVE ?? '').trim();
}

export function EpreuvePage({ onOpenInTab }: EpreuvePageProps) {
  return (
    <EntityListPage<EpreuveRow>
      api={EPREUVE_API}
      messages={EPREUVE_MESSAGES}
      title="Épreuves"
      searchLabel="Rechercher une Épreuve"
      primaryKey="IDEPREUVE"
      resolveLabel={resolveEpreuveLabel}
      columns={EPREUVE_COLUMNS}
      renderFormDialog={(dialog) => <EpreuveFormDialog {...dialog} mode="edit" />}
      renderCreateDialog={(create) => <EpreuveCreateWizardDialog {...create} />}
      onOpenInTab={onOpenInTab}
    />
  );
}
