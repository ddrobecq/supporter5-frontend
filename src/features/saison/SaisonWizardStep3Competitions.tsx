import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { Box, Checkbox, Stack, Typography } from '@mui/material';
import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { useEntityImage } from '../../lib/useEntityImage';
import { wizardGridBoxSx, wizardGridFillSx } from '../competition/tourWizardLayout';
import type { SaisonWizardCompetitionRow } from './types';

function CompetitionIdentityCell({ row }: { row: SaisonWizardCompetitionRow }) {
  const { src } = useEntityImage('competition', row.COCLEUNIK);
  const nom = String(row.NOM ?? '').trim();

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Box
        sx={{
          width: 22,
          height: 22,
          minWidth: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {src ? (
          <Box component="img" src={src} alt={nom} sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        ) : (
          <EmojiEventsIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
        )}
      </Box>
      <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nom}</Box>
    </Stack>
  );
}

interface SaisonWizardStep3CompetitionsProps {
  rows: SaisonWizardCompetitionRow[];
  selection: GridRowId[];
  onSelectionChange: (selection: GridRowId[]) => void;
  idemIds: Set<number>;
  onIdemChange: (competitionId: number, idem: boolean) => void;
}

export function SaisonWizardStep3Competitions({
  rows,
  selection,
  onSelectionChange,
  idemIds,
  onIdemChange,
}: SaisonWizardStep3CompetitionsProps) {
  const columns = useMemo<GridColDef<SaisonWizardCompetitionRow>[]>(() => [
    {
      field: 'NOM',
      headerName: 'Competition',
      flex: 1,
      minWidth: 260,
      sortable: true,
      renderCell: (params) => <CompetitionIdentityCell row={params.row} />,
    },
    {
      field: 'IDEM',
      headerName: 'Idem',
      width: 90,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Checkbox
          size="small"
          checked={idemIds.has(Number(params.row.COCLEUNIK))}
          onChange={(event) => onIdemChange(Number(params.row.COCLEUNIK), event.target.checked)}
          onClick={(event) => event.stopPropagation()}
        />
      ),
    },
  ], [idemIds, onIdemChange]);

  return (
    <Stack spacing={1} sx={wizardGridFillSx}>
      <Typography variant="body2" color="text.secondary">
        Les competitions cochees seront creees pour la nouvelle saison. Coche "Idem", les Tours et
        Classements de la precedente edition seront repris a l identique (hors participants et rencontres).
      </Typography>
      <Box sx={wizardGridBoxSx}>
        <EntityDataGrid<SaisonWizardCompetitionRow>
          rows={rows}
          columns={columns}
          loading={false}
          getRowId={(row) => row.COCLEUNIK}
          selection={selection}
          onSelectionChange={onSelectionChange}
          multiSelection
          checkboxSelection
        />
      </Box>
    </Stack>
  );
}
