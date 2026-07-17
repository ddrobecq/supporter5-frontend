import type { GridColDef } from '@mui/x-data-grid';

export function createDeviseColumns(): GridColDef[] {
  return [
    { field: 'NOM', headerName: 'Nom', flex: 1, minWidth: 180, sortable: true },
    { field: 'SYMBOLE', headerName: 'Symbole', width: 90, sortable: true },
  ];
}
