import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { type GridColDef, type GridRowId } from '@mui/x-data-grid';
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { EntitySearchBar } from '../../components/EntitySearchBar';
import { fetchClubsGrid } from '../club/clubApi';
import type { ClubGridRow } from '../club/types';

interface ClubSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (clubId: string, club?: ClubGridRow) => void;
}

export function ClubSelectionDialog({ open, onClose, onSelect }: ClubSelectionDialogProps) {
  const [rows, setRows] = useState<ClubGridRow[]>([]);
  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  const columns = useMemo<GridColDef<ClubGridRow>[]>(
    () => [
      { field: 'IDCLUB', headerName: 'Code', minWidth: 90, width: 90 },
      { field: 'CLUB_ABREGE', headerName: 'Abrégé', minWidth: 140, width: 140 },
      { field: 'CLUB_NOM_COMPLET', headerName: 'Club', flex: 1, minWidth: 240 },
      { field: 'VILLE_NOM', headerName: 'Ville', minWidth: 160, width: 160 },
    ],
    [],
  );

  const loadData = async (query: string) => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const result = await fetchClubsGrid(query.trim(), controller.signal);
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
    }, 280);
    return () => window.clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSelection([]);
    void loadData('');
  }, [open]);

  useEffect(() => {
    if (open && !loading) {
      searchInputRef.current?.focus();
    }
  }, [open, loading]);

  useEffect(
    () => () => {
      activeRequestRef.current?.abort();
    },
    [],
  );

  const commitSelection = () => {
    const selected = selection.length > 0 ? String(selection[0]) : '';
    if (!selected) return;
    const selectedRow = rows.find((row) => String(row.IDCLUB) === selected);
    onSelect(selected, selectedRow);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Sélectionner un club</DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>
        <Stack spacing={2}>
          <EntitySearchBar
            label="Rechercher un club"
            value={search}
            onChange={setSearch}
            inputRef={searchInputRef}
            autoFocus
          />

          <Box sx={{ height: 420 }}>
            {error ? (
              <Alert severity="error">{error}</Alert>
            ) : loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <EntityDataGrid<ClubGridRow>
                rows={rows}
                columns={columns}
                loading={loading}
                selection={selection}
                onSelectionChange={setSelection}
                onRowDoubleClick={(rowId) => {
                  const selectedId = String(rowId);
                  const selectedRow = rows.find((row) => String(row.IDCLUB) === selectedId);
                  onSelect(selectedId, selectedRow);
                  onClose();
                }}
                getRowId={(row) => row.IDCLUB}
              />
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Annuler</Button>
        <Button onClick={commitSelection} variant="contained" disabled={selection.length === 0}>Ajouter</Button>
      </DialogActions>
    </Dialog>
  );
}
