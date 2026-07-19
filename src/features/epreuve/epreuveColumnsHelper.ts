import type { GridColDef } from '@mui/x-data-grid';

export function createEpreuveColumns(): GridColDef[] {
  return [
    { field: 'EPREUVE', headerName: 'Épreuve', flex: 1, minWidth: 260, sortable: true },
  ];
}