import type { GridColDef } from '@mui/x-data-grid';

export function createRssColumns(): GridColDef[] {
  return [
    { field: 'RSSID', headerName: 'ID', width: 90, sortable: true },
    { field: 'RSSDescription', headerName: 'Description', flex: 1, minWidth: 260, sortable: true },
  ];
}
