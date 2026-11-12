import { EntityTabFormPane } from '../../components/EntityTabFormPane';
import { TerrainFormDialog } from './TerrainFormDialog';
import { fetchTerrainById, updateTerrain } from './terrainApi';
import type { TerrainRow } from './types';
import { buildTerrainFormFields, detectTerrainPrimaryKey, resolveTerrainLabel } from './terrainUi';

interface TerrainTabFormPaneProps {
  tabPath: string;
  terrainId: string;
  active: boolean;
}

function detectTerrainRowPrimaryKey(row: TerrainRow): string | undefined {
  return detectTerrainPrimaryKey([row]);
}

export function TerrainTabFormPane({ tabPath, terrainId, active }: TerrainTabFormPaneProps) {
  return (
    <EntityTabFormPane
      tabPath={tabPath}
      id={terrainId}
      active={active}
      fetchById={fetchTerrainById}
      update={updateTerrain}
      resolveLabel={resolveTerrainLabel}
      primaryKey={detectTerrainRowPrimaryKey}
      deriveFromRow={buildTerrainFormFields}
      loadingLabel="Chargement du stade..."
      successMessage="Terrain mis à jour."
      renderForm={(formProps, fields) => <TerrainFormDialog {...formProps} fields={fields} />}
    />
  );
}
