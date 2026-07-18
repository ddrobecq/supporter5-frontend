import type { GridColDef } from '@mui/x-data-grid';

export const CIRC_TYPE_OPTIONS = [
  { value: 1, label: 'Ligue' },
  { value: 2, label: 'Eliminatoire' },
] as const;

export function formatCircType(value: unknown): string {
  const numeric = Number(value);
  const option = CIRC_TYPE_OPTIONS.find((entry) => entry.value === numeric);
  return option?.label ?? String(value ?? '');
}

export function createCircColumns(): GridColDef[] {
  return [
    { field: 'IDCIRC', headerName: 'Abréviation', width: 130, sortable: true },
    { field: 'CIRC', headerName: 'Circonstances', flex: 1, minWidth: 260, sortable: true },
    {
      field: 'TYPE_TOUR',
      headerName: 'Type',
      width: 150,
      sortable: true,
      renderCell: (params) => formatCircType(params.value),
    },
  ];
}