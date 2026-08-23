import {
  Alert,
  Box,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRowParams, type GridValidRowModel } from '@mui/x-data-grid';
import { useMemo, useState } from 'react';

export interface IncompletCategory<R> {
  key: string;
  label: string;
  flag: keyof R;
}

interface IncompletsViewProps<R extends GridValidRowModel> {
  title: string;
  rows: R[];
  loading: boolean;
  errorMessage: string;
  categories: Array<IncompletCategory<R>>;
  getRowId: (row: R) => string;
  leadingColumns: GridColDef<R>[];
  onRowOpen: (row: R) => void;
  countLabel: (count: number) => string;
  /** Permet d'enrichir le libelle d'un chip avec des valeurs de la ligne. */
  chipLabel?: (category: IncompletCategory<R>, row: R) => string;
}

/** Socle commun aux pages Outils > Fiches incompletes: filtre par categorie + grille cliquable. */
export function IncompletsView<R extends GridValidRowModel>({
  title,
  rows,
  loading,
  errorMessage,
  categories,
  getRowId,
  leadingColumns,
  onRowOpen,
  countLabel,
  chipLabel,
}: IncompletsViewProps<R>) {
  const [category, setCategory] = useState<string>('all');

  const filteredRows = useMemo(() => {
    if (category === 'all') return rows;
    const flag = categories.find((item) => item.key === category)?.flag;
    if (!flag) return rows;
    return rows.filter((row) => Number(row[flag]) === 1);
  }, [rows, category, categories]);

  const columns: GridColDef<R>[] = useMemo(() => [
    ...leadingColumns,
    {
      field: 'manques',
      headerName: 'Informations manquantes',
      flex: 1.6,
      minWidth: 320,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center', py: 0.75 }}>
          {categories
            .filter((item) => Number(params.row[item.flag]) === 1)
            .map((item) => (
              <Chip
                key={item.key}
                size="small"
                color="warning"
                variant="outlined"
                label={chipLabel ? chipLabel(item, params.row) : item.label}
              />
            ))}
        </Stack>
      ),
    },
  ], [leadingColumns, categories, chipLabel]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700 }}>{title}</Typography>
        <TextField
          select
          size="small"
          label="Catégorie d'incomplétude"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="all">Toutes les catégories</MenuItem>
          {categories.map((item) => (
            <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>
          ))}
        </TextField>
        <Typography variant="body2" color="text.secondary">{countLabel(filteredRows.length)}</Typography>
      </Stack>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Box sx={{ height: 'calc(100vh - 260px)', minHeight: 420 }}>
        <DataGrid<R>
          rows={filteredRows}
          columns={columns}
          loading={loading}
          getRowId={getRowId}
          getRowHeight={() => 'auto'}
          onRowClick={(params: GridRowParams<R>) => onRowOpen(params.row)}
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
          pageSizeOptions={[25, 50, 100]}
          sx={{
            '& .MuiDataGrid-row': { cursor: 'pointer' },
            '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center', minHeight: 46 },
          }}
        />
      </Box>
    </Box>
  );
}
