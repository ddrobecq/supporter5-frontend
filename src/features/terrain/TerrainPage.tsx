import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { createTerrain, deleteTerrain, fetchTerrain, fetchTerrainById, updateTerrain, canDeleteTerrain } from './terrainApi';
import { TerrainFormDialog } from './TerrainFormDialog';
import { EntityListPage } from '../../components/EntityListPage';
import type { TerrainRow } from './types';
import { buildTerrainFormFields, resolveTerrainId, resolveTerrainLabel } from './terrainUi';

interface TerrainPageProps {
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

const TERRAIN_API = {
  fetchAll: fetchTerrain,
  fetchById: fetchTerrainById,
  create: createTerrain,
  update: updateTerrain,
  remove: deleteTerrain,
  canDelete: canDeleteTerrain,
};

const TERRAIN_MESSAGES = {
  singular: 'terrain',
  singularArticle: 'ce terrain',
  created: 'Terrain créé.',
  updated: 'Terrain mis à jour.',
  deleted: 'Terrain supprimé.',
  selectToOpen: 'Sélectionnez un terrain à ouvrir.',
  selectToDelete: 'Sélectionnez un terrain à supprimer.',
  noneSelected: 'Aucun terrain sélectionné.',
};

const TERRAIN_HEADER_LABELS: Record<string, string> = { STADE: 'Stade', VILLE_NOM: 'Ville' };

const TERRAIN_DEFAULT_COLUMNS: GridColDef<TerrainRow>[] = [
  { field: 'STADE', headerName: 'Stade', flex: 1, minWidth: 220, sortable: true },
  { field: 'VILLE_NOM', headerName: 'Ville', flex: 0.8, minWidth: 150, sortable: true },
];

/** Columns derived from the fields of the first loaded row (name first). */
function createTerrainColumns(rows: TerrainRow[]): GridColDef<TerrainRow>[] {
  const first = rows[0];
  if (!first) return TERRAIN_DEFAULT_COLUMNS;
  const allFields = Object.keys(first);
  const nameField = allFields.find((f) => ['STADE', 'NOM'].includes(f));
  const visibleFields = allFields.filter((field) => !['TERRAIN_LOGO', 'TECLEUNIK', 'IDVILLE'].includes(field));
  const orderedFields = [nameField, ...visibleFields].filter(
    (field, index, array): field is string => Boolean(field) && array.indexOf(field) === index,
  );
  return orderedFields.map((field, index) => ({
    field,
    headerName: TERRAIN_HEADER_LABELS[field] || field,
    flex: index === 0 ? 1 : undefined,
    minWidth: index === 0 ? 220 : 150,
    sortable: true,
  }));
}

export function TerrainPage({ onOpenInTab }: TerrainPageProps) {
  return (
    <EntityListPage<TerrainRow>
      api={TERRAIN_API}
      messages={TERRAIN_MESSAGES}
      title="Stades"
      searchLabel="Rechercher un terrain"
      primaryKey="TECLEUNIK"
      resolveId={resolveTerrainId}
      resolveLabel={resolveTerrainLabel}
      columns={createTerrainColumns}
      buildFormFields={buildTerrainFormFields}
      renderFormDialog={(dialog, fields) => <TerrainFormDialog {...dialog} fields={fields} />}
      onOpenInTab={onOpenInTab}
    />
  );
}
