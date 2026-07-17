import { Dialog, DialogContent, DialogTitle, Box, CircularProgress, Alert, Stack } from '@mui/material';
import { type GridColDef, type GridRowId } from '@mui/x-data-grid';
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { fetchDevise } from './deviseApi';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { EntitySearchBar } from '../../components/EntitySearchBar';
import { createDeviseColumns } from './deviseColumnsHelper';
import type { DeviseRow } from './types';

interface DeviseSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (devise: DeviseRow) => void;
}

export function DeviseSelector({ open, onClose, onSelect }: DeviseSelectorProps) {
  const [rows, setRows] = useState<DeviseRow[]>([]);
  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const didFocusRef = useRef(false);
  const activeRequestRef = useRef<AbortController | null>(null);

  const columns = useMemo<GridColDef[]>(() => createDeviseColumns(), []);

  const getRowId = (row: DeviseRow): GridRowId =>
    (typeof row.DVCLEUNIK === 'string' || typeof row.DVCLEUNIK === 'number')
      ? row.DVCLEUNIK
      : JSON.stringify(row);

  const handleRowDoubleClick = (rowId: GridRowId) => {
    const found = rows.find((r) => r.DVCLEUNIK === rowId);
    if (found) { onSelect(found); onClose(); }
  };

  const loadData = async (query: string) => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDevise(query.trim(), controller.signal);
      if (controller.signal.aborted) return;
      setRows(result.data ?? []);
    } catch (err) {
      if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return;
      setError(axios.isAxiosError(err) ? (err.response?.data?.message || err.message) : String(err));
    } finally {
      if (activeRequestRef.current === controller) { setLoading(false); activeRequestRef.current = null; }
    }
  };

  useEffect(() => {
    const h = window.setTimeout(() => void loadData(search), 320);
    return () => window.clearTimeout(h);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    didFocusRef.current = false;
    setSelection([]);
    void loadData('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!loading && !didFocusRef.current) {
      searchInputRef.current?.focus();
      didFocusRef.current = true;
    }
  }, [open, loading]);

  useEffect(() => () => { activeRequestRef.current?.abort(); }, []);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Sélectionner une Devise</DialogTitle>
      <DialogContent sx={{ p: 2, pt: '16px !important' }}>
        <Stack spacing={2} sx={{ height: 'calc(100vh - 280px)', minHeight: 350 }}>
          <EntitySearchBar label="Rechercher une devise" value={search} onChange={setSearch} inputRef={searchInputRef} autoFocus />
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            {error ? (
              <Alert severity="error">{error}</Alert>
            ) : loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <EntityDataGrid
                rows={rows}
                columns={columns}
                loading={loading}
                getRowId={getRowId}
                selection={selection}
                onSelectionChange={setSelection}
                onRowDoubleClick={handleRowDoubleClick}
                disableRowSelectionOnClick
              />
            )}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
