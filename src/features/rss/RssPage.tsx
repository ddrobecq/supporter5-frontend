import type { GridRowId } from '@mui/x-data-grid';
import { EntityListPage } from '../../components/EntityListPage';
import { RssFormDialog } from './RssFormDialog';
import { createRssColumns } from './rssColumnsHelper';
import { canDeleteRss, createRss, deleteRss, fetchRss, fetchRssById, updateRss } from './rssApi';
import { resolveRssId, resolveRssLabel } from './rssUi';
import type { RssRow } from './types';

interface RssPageProps {
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

const RSS_API = {
  fetchAll: fetchRss,
  fetchById: fetchRssById,
  create: createRss,
  update: updateRss,
  remove: deleteRss,
  canDelete: canDeleteRss,
};

const RSS_MESSAGES = {
  singular: 'flux RSS',
  singularArticle: 'ce flux RSS',
  created: 'Flux RSS créé.',
  updated: 'Flux RSS mis à jour.',
  deleted: 'Flux RSS supprimé.',
  selectToOpen: 'Sélectionnez un flux RSS à ouvrir.',
  selectToDelete: 'Sélectionnez un flux RSS à supprimer.',
  noneSelected: 'Aucun flux RSS sélectionné.',
};

const RSS_COLUMNS = createRssColumns();

export function RssPage({ onOpenInTab }: RssPageProps) {
  return (
    <EntityListPage<RssRow>
      api={RSS_API}
      messages={RSS_MESSAGES}
      title="Flux RSS"
      searchLabel="Rechercher un flux RSS"
      primaryKey="RSSID"
      resolveId={resolveRssId}
      resolveLabel={resolveRssLabel}
      columns={RSS_COLUMNS}
      renderFormDialog={(dialog) => <RssFormDialog {...dialog} />}
      onOpenInTab={onOpenInTab}
    />
  );
}
