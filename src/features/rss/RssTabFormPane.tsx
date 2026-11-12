import { EntityTabFormPane } from '../../components/EntityTabFormPane';
import { RssFormDialog } from './RssFormDialog';
import { fetchRssById, updateRss } from './rssApi';
import { resolveRssLabel } from './rssUi';

interface RssTabFormPaneProps {
  tabPath: string;
  rssId: string;
  active: boolean;
}

export function RssTabFormPane({ tabPath, rssId, active }: RssTabFormPaneProps) {
  return (
    <EntityTabFormPane
      tabPath={tabPath}
      id={rssId}
      active={active}
      fetchById={fetchRssById}
      update={updateRss}
      resolveLabel={resolveRssLabel}
      primaryKey="RSSID"
      loadingLabel="Chargement du flux RSS..."
      successMessage="Flux RSS mis à jour."
      renderForm={(formProps) => <RssFormDialog {...formProps} />}
    />
  );
}
