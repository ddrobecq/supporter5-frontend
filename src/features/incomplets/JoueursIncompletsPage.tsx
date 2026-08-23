import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { JoueurIdentityDisplay } from '../../components/JoueurIdentityDisplay';
import { toErrorMessage } from '../../components/useEntityPage';
import { IncompletsView } from './IncompletsView';
import { JOUEUR_INCOMPLET_CATEGORIES, fetchJoueursIncomplets, type JoueurIncompletRow } from './incompletsApi';

function openJoueurTab(row: JoueurIncompletRow): void {
  const surnom = row.SURNOM?.trim();
  const nom = row.NOM?.trim() ? row.NOM.toUpperCase() : '';
  const prenom = row.PRENOM?.trim() ?? '';
  const label = surnom || `${nom}${prenom ? ` ${prenom}` : ''}` || row.IDJOUEUR;

  window.dispatchEvent(new CustomEvent('supporter:tab-open', {
    detail: {
      path: `/admin/joueurs/${encodeURIComponent(row.IDJOUEUR)}`,
      label,
      unique: true,
      uniqueByPath: true,
    },
  }));
}

/** Outils > Fiches incompletes > Joueurs incomplets. */
export function JoueursIncompletsPage() {
  const [rows, setRows] = useState<JoueurIncompletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void fetchJoueursIncomplets(controller.signal)
      .then(setRows)
      .catch((error) => {
        if (!controller.signal.aborted) setErrorMessage(toErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const leadingColumns: GridColDef<JoueurIncompletRow>[] = useMemo(() => [{
    field: 'joueur',
    headerName: 'Joueur',
    flex: 1,
    minWidth: 240,
    sortable: false,
    renderCell: (params) => <JoueurIdentityDisplay joueur={params.row} />,
  }], []);

  return (
    <IncompletsView<JoueurIncompletRow>
      title="Joueurs incomplets"
      rows={rows}
      loading={loading}
      errorMessage={errorMessage}
      categories={JOUEUR_INCOMPLET_CATEGORIES}
      getRowId={(row) => row.IDJOUEUR}
      leadingColumns={leadingColumns}
      onRowOpen={openJoueurTab}
      countLabel={(count) => `${count} joueur(s)`}
      chipLabel={(category, row) => (category.key === 'matches'
        ? `${category.label} (${row.APPARITION} / ${row.MATCHES_CALCULES})`
        : category.label)}
    />
  );
}
