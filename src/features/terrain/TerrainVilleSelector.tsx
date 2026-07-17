import { Dialog, DialogContent, DialogTitle, Box, CircularProgress, Alert, Stack } from '@mui/material';
import { type GridColDef, type GridRowId } from '@mui/x-data-grid';
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { fetchVille } from '../ville/villeApi';
import { fetchNatio } from '../natio/natioApi';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { EntitySearchBar } from '../../components/EntitySearchBar';
import { createVilleColumns, createNatioMap } from '../ville/villeColumnsHelper';
import type { VilleRow } from '../ville/types';
import type { NatioRow } from '../natio/types';

const PK_CANDIDATES = ['VICLEUNIK', 'VILLEID', 'ID', 'id'];

function detectPrimaryKey(rows: VilleRow[]): string | undefined {
  const firstRow = rows[0];
  if (!firstRow) return undefined;

  const keys = Object.keys(firstRow);
  const candidate = PK_CANDIDATES.find((pk) => keys.includes(pk));
  return candidate ?? keys[0];
}

interface TerrainVilleSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (ville: VilleRow) => void;
}

export function TerrainVilleSelector({ open, onClose, onSelect }: TerrainVilleSelectorProps) {
  const [rows, setRows] = useState<VilleRow[]>([]);
  const [natioDatas, setNatioDatas] = useState<NatioRow[]>([]);
  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const didFocusSearchRef = useRef(false);
  const activeRequestRef = useRef<AbortController | null>(null);

  const primaryKey = useMemo(() => detectPrimaryKey(rows), [rows]);

  const natioMap = useMemo(() => createNatioMap(natioDatas), [natioDatas]);
  const columns = useMemo<GridColDef[]>(() => createVilleColumns(natioMap), [natioMap]);

  const getRowId = (row: VilleRow): GridRowId => {
    if (primaryKey && (typeof row[primaryKey] === 'string' || typeof row[primaryKey] === 'number')) {
      return row[primaryKey] as GridRowId;
    }
    return JSON.stringify(row);
  };

  const handleRowDoubleClick = (rowId: GridRowId) => {
    const selectedRow = rows.find((row) => {
      if (primaryKey && (typeof row[primaryKey] === 'string' || typeof row[primaryKey] === 'number')) {
        return row[primaryKey] === rowId;
      }
      return false;
    });

    if (selectedRow) {
      onSelect(selectedRow);
      onClose();
    }
  };

  const loadData = async (query: string) => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const result = await fetchVille(query.trim(), controller.signal);
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
    fetchNatio('').then((result) => setNatioDatas(result.data ?? [])).catch(() => {});
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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Sélectionner une Ville</DialogTitle>
      <DialogContent sx={{ p: 2, pt: '16px !important' }}>
        <Stack spacing={2} sx={{ height: 'calc(100vh - 280px)', minHeight: 400 }}>
          <EntitySearchBar
            label="Rechercher une ville"
            value={search}
            onChange={setSearch}
            inputRef={searchInputRef}
            autoFocus
          />
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
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
                getRowId={getRowId}
              />
            )}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
