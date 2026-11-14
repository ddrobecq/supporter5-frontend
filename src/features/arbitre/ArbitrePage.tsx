import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { createArbitreWithWizard, deleteArbitre, fetchArbitre, fetchArbitreById, updateArbitre, canDeleteArbitre } from './arbitreApi';
import { useNatioIndex, useNatioList } from '../natio/natioStore';
import { NatioFlag } from '../../components/NatioFlag';
import { EntityImageLabelCell } from '../../components/EntityImageLabelCell';
import { ArbitreFormDialog } from './ArbitreFormDialog';
import { ArbitreCreateWizardDialog } from './ArbitreCreateWizardDialog';
import { EntityListPage } from '../../components/EntityListPage';
import type { ArbitreRow } from './types';

interface ArbitrePageProps {
  onOpenInTab?: (payload: { rowId: GridRowId; label: string }) => void;
}

const ARBITRE_API = {
  fetchAll: fetchArbitre,
  fetchById: fetchArbitreById,
  update: updateArbitre,
  remove: deleteArbitre,
  canDelete: canDeleteArbitre,
};

const ARBITRE_MESSAGES = {
  singular: 'arbitre',
  singularArticle: 'cet arbitre',
  created: 'Arbitre créé.',
  updated: 'Arbitre mis à jour.',
  deleted: 'Arbitre supprimé.',
  selectToOpen: 'Sélectionnez un arbitre à ouvrir.',
  selectToDelete: 'Sélectionnez un arbitre à supprimer.',
  noneSelected: 'Aucun arbitre sélectionné.',
};

function resolveArbitreLabel(row: ArbitreRow): string {
  const nom = String(row.NOM ?? '').trim().toUpperCase();
  const prenom = String(row.PRENOM ?? '').trim();
  return [nom, prenom].filter((part) => part.length > 0).join(' ').trim();
}

function buildArbitreFormFields(source?: ArbitreRow): string[] {
  const sourceFields = source ? Object.keys(source) : [];
  return sourceFields.filter((f, i, a) => a.indexOf(f) === i);
}

export function ArbitrePage({ onOpenInTab }: ArbitrePageProps) {
  const { rows: natioDatas } = useNatioList();
  const natioById = useNatioIndex();

  const columns = useMemo<GridColDef[]>(() => [{
    field: 'fullName',
    headerName: 'Arbitre',
    flex: 1,
    minWidth: 280,
    sortable: false,
    renderCell: (params) => {
      const nom = String(params.row.NOM ?? '').toUpperCase();
      const prenom = params.row.PRENOM ?? '';
      const idnatio = params.row.IDNATIO;

      // Find the country data to check NALOCAL
      const country = natioById.get(String(idnatio ?? '').trim());
      const showFlag = idnatio && (!country || Number(country.NALOCAL ?? 0) !== 1);

      return (
        <EntityImageLabelCell entityType="arbitre" entityId={params.row.IDARBITRE} label={`${nom} ${prenom}`}>
          {showFlag && (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <NatioFlag idnatio={String(idnatio)} />
            </span>
          )}
        </EntityImageLabelCell>
      );
    },
  }], [natioById]);

  return (
    <EntityListPage<ArbitreRow>
      api={ARBITRE_API}
      messages={ARBITRE_MESSAGES}
      title="Arbitres"
      searchLabel="Rechercher un arbitre"
      primaryKey="IDARBITRE"
      resolveLabel={resolveArbitreLabel}
      columns={columns}
      buildFormFields={buildArbitreFormFields}
      renderFormDialog={(dialog, fields) => (
        <ArbitreFormDialog {...dialog} mode="edit" fields={fields} natioDatas={natioDatas} />
      )}
      renderCreateDialog={({ onCreated, ...create }) => (
        <ArbitreCreateWizardDialog
          {...create}
          onCreate={async (payload) => {
            const created = await createArbitreWithWizard(payload);
            const rawCreatedId = created?.IDARBITRE;
            if (rawCreatedId === undefined || rawCreatedId === null || String(rawCreatedId).trim() === '') {
              throw new Error('Création réussie mais identifiant introuvable.');
            }
            const createdId = String(rawCreatedId).trim();
            const label = `${String(created?.NOM ?? '').trim().toUpperCase()} ${String(created?.PRENOM ?? '').trim()}`.trim() || createdId;
            await onCreated(createdId, label);
          }}
        />
      )}
      onOpenInTab={onOpenInTab}
    />
  );
}
