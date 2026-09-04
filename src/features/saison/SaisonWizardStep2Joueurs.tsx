import { Box, Stack, Typography } from '@mui/material';
import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { formatDateShort } from '../../components/DateInputField';
import { JoueurIdentityDisplay } from '../../components/JoueurIdentityDisplay';
import { wizardGridBoxSx, wizardGridFillSx } from '../competition/tourWizardLayout';
import type { SaisonWizardJoueurRow } from './types';

interface SaisonWizardStep2JoueursProps {
  rows: SaisonWizardJoueurRow[];
  selection: GridRowId[];
  onSelectionChange: (selection: GridRowId[]) => void;
}

export function SaisonWizardStep2Joueurs({ rows, selection, onSelectionChange }: SaisonWizardStep2JoueursProps) {
  const columns = useMemo<GridColDef<SaisonWizardJoueurRow>[]>(() => [
    {
      field: 'JOUEUR_NOM',
      headerName: 'Joueur',
      flex: 1,
      minWidth: 220,
      sortable: true,
      renderCell: (params) => <JoueurIdentityDisplay joueur={params.row} />,
    },
    {
      field: 'POSTE_NOM',
      headerName: 'Poste',
      minWidth: 160,
      flex: 0.4,
      sortable: true,
    },
    {
      field: 'CONTRAT_FIN',
      headerName: 'Fin de contrat',
      width: 130,
      sortable: true,
      valueFormatter: (value) => formatDateShort(value),
    },
  ], []);

  return (
    <Stack spacing={1} sx={wizardGridFillSx}>
      <Typography variant="body2" color="text.secondary">
        Les joueurs coches seront repris dans le nouvel effectif, au meme poste que la saison precedente.
      </Typography>
      <Box sx={wizardGridBoxSx}>
        <EntityDataGrid<SaisonWizardJoueurRow>
          rows={rows}
          columns={columns}
          loading={false}
          getRowId={(row) => row.JOCLEUNIK}
          selection={selection}
          onSelectionChange={onSelectionChange}
          multiSelection
          checkboxSelection
        />
      </Box>
    </Stack>
  );
}
