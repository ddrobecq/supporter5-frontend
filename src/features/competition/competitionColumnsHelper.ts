import type { GridColDef } from '@mui/x-data-grid';

export function createCompetitionColumns(): GridColDef[] {
  return [
    { field: 'NOM', headerName: 'Competition', flex: 1, minWidth: 260, sortable: true },
    { field: 'IDEPREUVE', headerName: 'Epreuve', width: 120, sortable: true },
  ];
}
