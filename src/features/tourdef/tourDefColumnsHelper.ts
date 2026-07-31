import type { GridColDef } from '@mui/x-data-grid';

export function createTourDefColumns(): GridColDef[] {
  return [
    { field: 'NOM', headerName: 'Nom', flex: 1, minWidth: 220, sortable: true },
    {
      field: 'TDTYPETOUR',
      headerName: 'Type',
      width: 140,
      sortable: true,
      valueGetter: (value: unknown) => {
        const num = Number(value ?? 0);
        return num === 2 ? 'Eliminatoire' : 'Ligue';
      },
    },
  ];
}
