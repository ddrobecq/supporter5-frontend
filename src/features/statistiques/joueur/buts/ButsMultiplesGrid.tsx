import type { GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { useStatRows } from '../../useStatRows';
import { fetchButsMultiplesParJoueur, type ButsMultiplesRow, type ButsMultiplesVariant } from './butsMultiplesApi';

const LABELS: Record<ButsMultiplesVariant, string> = {
  doubles: 'Doublés',
  triples: 'Triplés',
  quadruples: 'Quadruplés',
};

function valueColumns(variant: ButsMultiplesVariant): GridColDef<ButsMultiplesRow>[] {
  return [{
    field: 'MATCHES',
    headerName: LABELS[variant],
    width: 120,
    type: 'number',
    align: 'right',
    headerAlign: 'right',
    sortable: true,
  }];
}

/** Joueur > Buts|Passes > Nombre de doublés/triplés/quadruplés: joueurs ayant réalisé au moins N buts/passes dans un même match, classés par nombre de performances. */
export function ButsMultiplesGrid({ metric = 'buts', variant }: { metric?: 'buts' | 'passes'; variant: ButsMultiplesVariant }) {
  const [scope, setScope] = useState<number | null>(null);
  const { rows, loading } = useStatRows<ButsMultiplesRow>((signal) => fetchButsMultiplesParJoueur(metric, variant, scope, signal), [metric, variant, scope]);

  return (
    <StatPlayerGrid<ButsMultiplesRow>
      rows={rows}
      valueColumns={valueColumns(variant)}
      loading={loading}
      initialState={{ sorting: { sortModel: [{ field: 'MATCHES', sort: 'desc' }] } }}
      scope={scope}
      onScopeChange={setScope}
    />
  );
}
