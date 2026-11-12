import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { createNatio, deleteNatio, fetchNatio, fetchNatioById, updateNatio, canDeleteNatio } from './natioApi';
import { NatioFormDialog } from './NatioFormDialog';
import { EntityListPage } from '../../components/EntityListPage';
import { NatioFlag } from '../../components/NatioFlag';
import type { NatioRow } from './types';
import { buildNatioFormFields, resolveNatioId, resolveNatioLabel } from './natioUi';

interface NatioPageProps {
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

const NATIO_API = {
  fetchAll: fetchNatio,
  fetchById: fetchNatioById,
  create: createNatio,
  update: updateNatio,
  remove: deleteNatio,
  canDelete: canDeleteNatio,
};

const NATIO_MESSAGES = {
  singular: 'pays',
  singularArticle: 'ce pays',
  created: 'Pays créé.',
  updated: 'Pays mis à jour.',
  deleted: 'Pays supprimé.',
  selectToOpen: 'Sélectionnez un pays à ouvrir.',
  selectToDelete: 'Sélectionnez un pays à supprimer.',
  noneSelected: 'Aucun pays sélectionné.',
};

/** Columns derived from the fields of the first loaded row (flag first, then name). */
function createNatioColumns(rows: NatioRow[]): GridColDef<NatioRow>[] {
  const first = rows[0];
  if (!first) return [];
  const allFields = Object.keys(first);
  const codeField = allFields.find((f) => ['IDNATIO', 'NATIO', 'CODE'].includes(f));
  const nameField = allFields.find((f) => ['PAYS', 'NOM', 'NATIO_NOM'].includes(f));
  const visibleFields = allFields.filter(
    (field) => !['NALOCAL', 'NAT_DRAPEAU', 'NAT_ISO'].includes(field) && field !== codeField,
  );
  const orderedFields = ['NAT_DRAPEAU', nameField, ...visibleFields].filter(
    (field, index, array): field is string => Boolean(field) && array.indexOf(field) === index,
  );
  return orderedFields.map((field, index) => {
    const col: GridColDef<NatioRow> = {
      field,
      headerName: field === 'NAT_DRAPEAU' ? '' : field === nameField ? 'Nom' : field,
      width: index === 0 ? 50 : undefined,
      minWidth: index === 0 ? 50 : index === 1 ? 150 : 140,
      maxWidth: index === 0 ? 50 : undefined,
      flex: index === 1 ? 1 : undefined,
      sortable: false,
    };
    if (field === 'NAT_DRAPEAU' && codeField) {
      col.renderCell = (params) => <NatioFlag idnatio={String(params.row[codeField] ?? '')} />;
    }
    return col;
  });
}

export function NatioPage({ onOpenInTab }: NatioPageProps) {
  return (
    <EntityListPage<NatioRow>
      api={NATIO_API}
      messages={NATIO_MESSAGES}
      title="Pays"
      searchLabel="Rechercher un pays"
      primaryKey="IDNATIO"
      resolveId={resolveNatioId}
      resolveLabel={resolveNatioLabel}
      columns={createNatioColumns}
      buildFormFields={buildNatioFormFields}
      renderFormDialog={(dialog, fields) => <NatioFormDialog {...dialog} fields={fields} />}
      onOpenInTab={onOpenInTab}
    />
  );
}
