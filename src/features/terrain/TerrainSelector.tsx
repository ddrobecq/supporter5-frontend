import { Alert, Box, CircularProgress, Dialog, DialogContent, DialogTitle, Stack } from '@mui/material';
import { type GridColDef, type GridRowId } from '@mui/x-data-grid';
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { EntitySearchBar } from '../../components/EntitySearchBar';
import { fetchTerrain } from './terrainApi';
import type { TerrainRow } from './types';

interface TerrainSelection {
  id: string;
  name: string;
}

interface TerrainSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (terrain: TerrainSelection) => void;
}

function extractTerrainId(row: TerrainRow): string {
  const value = row.TECLEUNIK ?? row.ID ?? row.id ?? row.CODE;
  return String(value ?? '').trim();
}

function extractTerrainName(row: TerrainRow): string {
  return String(row.STADE ?? row.NOM ?? '').trim();
}

export function TerrainSelector({ open, onClose, onSelect }: TerrainSelectorProps) {
  const [rows, setRows] = useState<TerrainRow[]>([]);
  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const didFocusSearchRef = useRef(false);
  const activeRequestRef = useRef<AbortController | null>(null);

  const columns = useMemo<GridColDef[]>(() => [
    {
      field: 'TECLEUNIK',
      headerName: 'Code',
      width: 90,
      minWidth: 90,
      maxWidth: 90,
      valueGetter: (_value, row) => extractTerrainId(row),
    },
    {
      field: 'STADE',
      headerName: 'Nom du stade',
      minWidth: 280,
      flex: 1,
      valueGetter: (_value, row) => extractTerrainName(row),
    },
  ], []);

  const loadData = async (query: string) => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const result = await fetchTerrain(query.trim(), controller.signal);
      if (controller.signal.aborted) return;
      setRows(result.data ?? []);
    } catch (err) {
      if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return;
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : String(err);
      setError(message);
    } finally {
      if (activeRequestRef.current === controller) {
        setLoading(false);
        activeRequestRef.current = null;
      }
    }
  };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadData(search);
    }, 320);

    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!open) {
      return;
    }

    didFocusSearchRef.current = false;
    setSelection([]);
    void loadData('');
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!loading && !didFocusSearchRef.current) {
      searchInputRef.current?.focus();
      didFocusSearchRef.current = true;
    }
  }, [open, loading]);

  useEffect(() => () => {
    activeRequestRef.current?.abort();
  }, []);

  const handleRowDoubleClick = (rowId: GridRowId) => {
    const selectedRow = rows.find((row) => extractTerrainId(row) === String(rowId));
    if (!selectedRow) return;

    onSelect({
      id: extractTerrainId(selectedRow),
      name: extractTerrainName(selectedRow),
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            height: 'min(82vh, 760px)',
          },
        },
      }}
    >
      <DialogTitle>Sélectionner un Stade</DialogTitle>
      <DialogContent sx={{ p: 2, pt: '16px !important', overflow: 'hidden', display: 'flex', minHeight: 0 }}>
        <Stack spacing={2} sx={{ height: '100%', minHeight: 0, flex: 1 }}>
          <EntitySearchBar
            label="Rechercher un stade"
            value={search}
            onChange={setSearch}
            inputRef={searchInputRef}
            autoFocus
          />

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {error ? (
              <Box sx={{ p: 2 }}>
                <Alert severity="error">{error}</Alert>
              </Box>
            ) : loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <EntityDataGrid
                rows={rows}
                columns={columns}
                loading={loading}
                selection={selection}
                onSelectionChange={setSelection}
                onRowDoubleClick={handleRowDoubleClick}
                disableRowSelectionOnClick
                getRowId={(row) => extractTerrainId(row)}
              />
            )}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
