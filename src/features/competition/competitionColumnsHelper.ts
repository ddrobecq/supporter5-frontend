import type { GridColDef } from '@mui/x-data-grid';

export function createCompetitionColumns(): GridColDef[] {
  return [
    { field: 'NOM', headerName: 'Compétition', flex: 1, minWidth: 260, sortable: true },
    { field: 'IDEPREUVE', headerName: 'Épreuve', width: 120, sortable: true },
  ];
}
