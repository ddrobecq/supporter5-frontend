import type { GridColDef } from '@mui/x-data-grid';
import type { NatioRow } from '../natio/types';

export function createVilleColumns(natioMap: Map<string | number | unknown, string>): GridColDef[] {
  return [
    {
      field: 'NOM',
      headerName: 'Nom',
      minWidth: 200,
      flex: 1,
      sortable: true,
    },
    {
      field: 'IDNATIO',
      headerName: 'Pays',
      minWidth: 80,
      maxWidth: 220,
      width: 120,
      renderCell: (params) => {
        const countryName = natioMap.get(params.value);
        const display = countryName || String(params.value || '');
        const ellipsized = display.length > 22 ? `${display.substring(0, 19)}...` : display;
        return ellipsized;
      },
      sortable: true,
    },
  ];
}

export function createNatioMap(natioDatas: NatioRow[]): Map<string | number | unknown, string> {
  const map = new Map<string | number | unknown, string>();
  for (const natio of natioDatas) {
    const idnatio = natio.IDNATIO ?? natio.ID;
    const pays = natio.PAYS ?? natio.NOM;
    if (idnatio && pays) {
      map.set(idnatio, String(pays));
    }
  }
  return map;
}
